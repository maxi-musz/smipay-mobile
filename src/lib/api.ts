import axios from "axios";

import { useAuthStore } from "@/store/auth.store";
import { getDeviceMetadata } from "./device";
import { getLocation } from "./location";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://api.smipay.com/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const device = await getDeviceMetadata();
  Object.assign(config.headers, device);

  const location = await getLocation();
  if (location) {
    config.headers["x-latitude"] = location.latitude;
    config.headers["x-longitude"] = location.longitude;
  }

  const token = useAuthStore.getState().tokens?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      const message =
        data?.message ?? error.message ?? "Something went wrong";

      return Promise.reject(new ApiClientError(message, error.response?.status));
    }
    return Promise.reject(error);
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
