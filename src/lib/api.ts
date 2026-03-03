import axios from "axios";

import { useAuthStore } from "@/store/auth.store";
import { getDeviceMetadata } from "./device";
import { getLocation } from "./location";

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:1500";
const API_VERSION = process.env.EXPO_PUBLIC_API_VERSION ?? "/api/v1";
const API_BASE_URL = `${BASE_URL}${API_VERSION}`;

if (__DEV__) {
  console.log(`[API] Base URL: ${API_BASE_URL}`);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  if (__DEV__) {
    console.log(`→ ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  }

  try {
    const device = await getDeviceMetadata();
    Object.assign(config.headers, device);
  } catch (e) {
    if (__DEV__) console.warn("[API] Failed to get device metadata:", e);
  }

  try {
    const location = await getLocation();
    if (location) {
      config.headers["x-latitude"] = location.latitude;
      config.headers["x-longitude"] = location.longitude;
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

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(
        `← ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
      );
    }
    return response;
  },
  (error) => {
    if (__DEV__) {
      const status = axios.isAxiosError(error)
        ? error.response?.status ?? "NETWORK"
        : "UNKNOWN";
      const method = error?.config?.method?.toUpperCase() ?? "?";
      const url = error?.config?.url ?? "?";
      console.log(`← ${status} ${method} ${url}`);
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;

      const message =
        data?.message ?? error.message ?? "Something went wrong";

      return Promise.reject(new ApiClientError(message, status));
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
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}
