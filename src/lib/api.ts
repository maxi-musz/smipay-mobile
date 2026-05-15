import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import CryptoJS from "crypto-js";
import * as Crypto from "expo-crypto";

import { useAuthStore } from "@/store/auth.store";
import { getDeviceMetadata } from "./device";
import { getLocation } from "./location";

const REQUEST_SIGNING_SECRET =
  process.env.EXPO_PUBLIC_REQUEST_SIGNING_SECRET ?? "";

/**
 * Required on every API call — backend endpoints that use SecurityHeadersGuard
 * (including `POST …/transaction-pin/verify` at checkout) reject requests without it.
 *
 * Uses the **same secret** as the server expects for HMAC of `timestamp.nonce`.
 * Set `EXPO_PUBLIC_REQUEST_SIGNING_SECRET` in `mobile/.env` (typically same value as backend env).
 */
function computeRequestSignature(timestamp: string, nonce: string): string {
  if (!REQUEST_SIGNING_SECRET.trim()) {
    throw new Error(
      "Missing EXPO_PUBLIC_REQUEST_SIGNING_SECRET — add it to mobile/.env (must match backend). " +
        "Signed requests cannot complete without X-Signature.",
    );
  }
  const message = `${timestamp}.${nonce}`;
  return CryptoJS.HmacSHA256(
    message,
    REQUEST_SIGNING_SECRET,
  ).toString(CryptoJS.enc.Hex);
}

const BASE_URL = __DEV__
  ? (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:1500")
  : process.env.EXPO_PUBLIC_API_BASE_URL!;
const API_VERSION = process.env.EXPO_PUBLIC_API_VERSION ?? "/api/v1";
const API_BASE_URL = `${BASE_URL}${API_VERSION}`;

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

// ── Request interceptor ──────────────────────────────────────────

api.interceptors.request.use(async (config) => {
  if (__DEV__) {
    console.log(`→ ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  }

  // Required by backend SecurityHeadersValidator for all requests
  const timestamp = String(Date.now());
  const nonce = Crypto.randomUUID();
  config.headers["X-Timestamp"] = timestamp;
  config.headers["X-Nonce"] = nonce;
  config.headers["X-Request-ID"] = nonce;
  config.headers["X-Signature"] = computeRequestSignature(timestamp, nonce);

  try {
    const device = await getDeviceMetadata();
    Object.assign(config.headers, device);
  } catch (e) {
    if (__DEV__) console.warn("[API] Failed to get device metadata:", e);
  }

  try {
    const location = await getLocation();
    if (location) {
      config.headers["x-latitude"] = String(location.latitude);
      config.headers["x-longitude"] = String(location.longitude);
    }
  } catch (e) {
    if (__DEV__) console.warn("[API] Failed to get location:", e);
  }

  const token = useAuthStore.getState().tokens?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

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
