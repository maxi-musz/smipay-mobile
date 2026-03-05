import { Platform } from "react-native";
import { api } from "@/lib/api";

const BASE = "/push-notification";

/** Backend response shape for push notification endpoints. */
interface PushApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
}

/**
 * Payload for registering a device for push notifications.
 * Matches backend POST /api/v1/push-notification/register.
 */
export interface RegisterPushPayload {
  token: string;
  platform: "ios" | "android";
  device_id?: string;
  app_version?: string;
}

/**
 * Register the device's Expo push token with the backend.
 * Call only after the user has granted notification permission.
 * Backend stores the token and uses it to send push via Expo Push API.
 */
export async function registerPushToken(payload: RegisterPushPayload): Promise<void> {
  await api.post<PushApiResponse<{ token_id: string }>>(`${BASE}/register`, {
    token: payload.token,
    platform: payload.platform,
    ...(payload.device_id != null && { device_id: payload.device_id }),
    ...(payload.app_version != null && { app_version: payload.app_version }),
  });
}

/**
 * Remove the given Expo push token from the backend.
 * Call when the user logs out or disables notifications.
 * Token must be URL-encoded for the path (e.g. ExponentPushToken%5Bxxx%5D).
 */
export async function removePushToken(token: string): Promise<void> {
  const encoded = encodeURIComponent(token);
  await api.delete<PushApiResponse>(`${BASE}/remove/${encoded}`);
}

/**
 * Token metadata returned by GET /api/v1/push-notification/tokens.
 * Token value is not returned for privacy.
 */
export interface PushTokenMeta {
  id: string;
  platform: string;
  device_id: string | null;
  app_version: string | null;
  createdAt: string;
}

/**
 * List the current user's registered device tokens (metadata only).
 * For debugging or "devices" UI.
 */
export async function fetchPushTokens(): Promise<PushTokenMeta[]> {
  const { data } = await api.get<PushApiResponse<{ tokens: PushTokenMeta[] }>>(
    `${BASE}/tokens`,
  );
  return data?.data?.tokens ?? [];
}
