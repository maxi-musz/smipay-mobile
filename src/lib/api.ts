import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import CryptoJS from "crypto-js";
import * as Crypto from "expo-crypto";

import { useAuthStore } from "@/store/auth.store";
import { getDeviceMetadata } from "./device";
import { getLocation } from "./location";

const REQUEST_SIGNING_SECRET =
  process.env.EXPO_PUBLIC_REQUEST_SIGNING_SECRET ?? "";

/**
 * Request signing — v1. Must stay byte-identical to
 * `backend/src/common/request-signing/request-signature.ts`.
 *
 * Signs `v1:METHOD:path:timestamp:nonce:sha256(body)`, so a captured signature
 * is useless on another endpoint or payload.
 *
 * `EXPO_PUBLIC_REQUEST_SIGNING_SECRET` must equal the backend's
 * `REQUEST_SIGNING_SECRET` — different names, same value.
 */
const SIGNATURE_VERSION = "v1";

/** Sentinel for multipart bodies neither side can hash. */
const UNHASHED_BODY = "multipart";

const EMPTY_BODY_HASH = CryptoJS.SHA256("").toString(CryptoJS.enc.Hex);

export type SigningTarget = {
  method: string;
  /** Path as the server sees it, including `/api/v1`. */
  path: string;
  /** Exact serialised body, or null. */
  body?: string | null;
  /** Multipart uploads, whose encoded bytes the client never sees. */
  multipart?: boolean;
};

function assertSecret(): string {
  const secret = REQUEST_SIGNING_SECRET.trim();
  if (!secret) {
    throw new Error(
      "Missing EXPO_PUBLIC_REQUEST_SIGNING_SECRET — add it to mobile/.env (must match the backend's REQUEST_SIGNING_SECRET). " +
        "Signed requests cannot complete without X-Signature.",
    );
  }
  return secret;
}

/** Path without query string or trailing slash, as the server does. */
function canonicalPath(path: string): string {
  const withoutQuery = path.split("?")[0] ?? "";
  const trimmed = withoutQuery.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : "/";
}

function bodyHashFor(target: SigningTarget): string {
  if (target.multipart) return UNHASHED_BODY;
  if (!target.body) return EMPTY_BODY_HASH;
  return CryptoJS.SHA256(target.body).toString(CryptoJS.enc.Hex);
}

function computeRequestSignature(
  timestamp: string,
  nonce: string,
  target: SigningTarget,
): string {
  const message = [
    SIGNATURE_VERSION,
    target.method.toUpperCase(),
    canonicalPath(target.path),
    timestamp,
    nonce,
    bodyHashFor(target),
  ].join(":");
  return CryptoJS.HmacSHA256(message, assertSecret()).toString(CryptoJS.enc.Hex);
}

const BASE_URL = __DEV__
  ? (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:1500")
  : process.env.EXPO_PUBLIC_API_BASE_URL!;
const API_VERSION = process.env.EXPO_PUBLIC_API_VERSION ?? "/api/v1";
export const API_BASE_URL = `${BASE_URL}${API_VERSION}`;

if (__DEV__) {
  console.log(`[API] Base URL: ${API_BASE_URL}`);
}

const DEFAULT_TIMEOUT_MS = Number(
  process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? 120_000,
);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

/**
 * Auth, signing, device and location headers, shared by axios and native
 * uploads. `target` is required — a v1 signature is bound to the request.
 */
export async function buildRequestHeaders(
  target: SigningTarget,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  const timestamp = String(Date.now());
  const nonce = Crypto.randomUUID();
  headers["X-Timestamp"] = timestamp;
  headers["X-Nonce"] = nonce;
  headers["X-Request-ID"] = nonce;
  headers["X-Signature-Version"] = SIGNATURE_VERSION;
  headers["X-Signature"] = computeRequestSignature(timestamp, nonce, target);

  try {
    const device = await getDeviceMetadata();
    Object.assign(headers, device);
  } catch (e) {
    if (__DEV__) console.warn("[API] Failed to get device metadata:", e);
  }

  try {
    const location = await getLocation();
    if (location) {
      headers["x-latitude"] = String(location.latitude);
      headers["x-longitude"] = String(location.longitude);
    }
  } catch (e) {
    if (__DEV__) console.warn("[API] Failed to get location:", e);
  }

  const token = useAuthStore.getState().tokens?.accessToken;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

// ── Request interceptor ──────────────────────────────────────────

/** The path the server will see, so both sides sign the same string. */
function signedPathFor(url: string | undefined): string {
  const raw = url ?? "";
  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).pathname;
    } catch {
      return raw;
    }
  }
  return `${API_VERSION}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

/**
 * Serialise the body as axios will put it on the wire, so the digest matches
 * the bytes the server hashes. FormData and streams count as unhashable.
 */
function serialisedBodyFor(data: unknown): {
  body: string | null;
  multipart: boolean;
} {
  if (data == null) return { body: null, multipart: false };
  if (typeof data === "string") return { body: data, multipart: false };
  if (typeof FormData !== "undefined" && data instanceof FormData) {
    return { body: null, multipart: true };
  }
  try {
    return { body: JSON.stringify(data), multipart: false };
  } catch {
    return { body: null, multipart: true };
  }
}

api.interceptors.request.use(async (config) => {
  if (__DEV__) {
    console.log(`→ ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  }

  const { body, multipart } = serialisedBodyFor(config.data);
  const headers = await buildRequestHeaders({
    method: config.method ?? "get",
    path: signedPathFor(config.url),
    body,
    multipart,
  });
  Object.assign(config.headers, headers);

  return config;
});

// ── Token refresh mutex ──────────────────────────────────────────

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

const REFRESH_URL = "/new-auth/refresh";
const SIGNIN_URL = "/new-auth/signin";

// ── Response interceptor with refresh ────────────────────────────

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(
        `← ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
      );
    }
    return response;
  },
  async (error: AxiosError) => {
    if (__DEV__) {
      const status = error.response?.status ?? "NETWORK";
      const method = error?.config?.method?.toUpperCase() ?? "?";
      const url = error?.config?.url ?? "?";
      console.log(`← ${status} ${method} ${url}`);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== REFRESH_URL &&
      originalRequest.url !== SIGNIN_URL
    ) {
      const refreshTokenValue = useAuthStore.getState().tokens?.refreshToken;

      if (refreshTokenValue) {
        if (isRefreshing) {
          return new Promise((resolve) => {
            addRefreshSubscriber((newToken) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              originalRequest._retry = true;
              resolve(api(originalRequest));
            });
          });
        }

        isRefreshing = true;
        originalRequest._retry = true;

        try {
          const { data } = await axios.post(
            `${API_BASE_URL}${REFRESH_URL}`,
            { refresh_token: refreshTokenValue },
            { headers: { "Content-Type": "application/json" } },
          );

          const newTokens = {
            accessToken: data.data.access_token,
            refreshToken: data.data.refresh_token,
          };

          await useAuthStore.getState().setTokens(newTokens);

          if (data.data.user) {
            useAuthStore.getState().setUser(data.data.user);
          }

          onRefreshed(newTokens.accessToken);
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;

          return api(originalRequest);
        } catch {
          refreshSubscribers = [];
          useAuthStore.getState().lock();
          return Promise.reject(
            new ApiClientError("Session expired. Please sign in again.", 401),
          );
        } finally {
          isRefreshing = false;
        }
      }

      useAuthStore.getState().lock();
    }

    if (axios.isAxiosError(error)) {
      if (
        !error.response &&
        (error.code === "ECONNABORTED" ||
          (error.message || "").toLowerCase().includes("timeout"))
      ) {
        return Promise.reject(
          new ApiClientError(
            "This request took too long. Your payment may still be processing — check your transaction history before trying again.",
            408,
          ),
        );
      }

      const status = error.response?.status;
      const responseData = error.response?.data as
        | (Record<string, unknown> & { message?: string })
        | undefined;

      const message =
        responseData?.message ?? error.message ?? "Something went wrong";

      return Promise.reject(new ApiClientError(message, status, responseData));
    }

    return Promise.reject(
      new ApiClientError("Something went wrong. Please try again."),
    );
  },
);

export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    /**
     * The full JSON body returned by the server (when present). Useful for
     * structured error payloads — e.g. `{ retry_after_seconds, attempts_remaining }`
     * — that callers want to react to in the UI.
     */
    public data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}
