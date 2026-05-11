import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";

const APP_CONFIG = "/app-config";

/**
 * Server-driven thresholds the mobile client uses to decide whether to force
 * or suggest a store update. Returned by `GET /app-config/version-gate`.
 *
 * The values are split per platform because iOS and Android can roll out
 * builds independently — and at different rates through review/rollout.
 */
export interface VersionGateData {
  /** Below this version, the user must update before they can use the app. */
  minimum_supported_version: { ios: string; android: string };
  /** Newest build the operator considers "current". Drives soft-update nudges. */
  latest_version: { ios: string; android: string };
  /** Deeplink used by the "Update now" CTA on iOS. */
  ios_store_url: string;
  /** Deeplink used by the "Update now" CTA on Android. */
  android_store_url: string;
  /** Copy rendered inside the compulsory force-update modal. */
  force_message: string;
  /** Copy rendered inside the dismissable soft-update modal. */
  soft_message: string;
}

/**
 * Lightweight, unauthenticated lookup hit on app launch and on foreground.
 * Failure modes are non-fatal — callers should treat any error as "no gate"
 * so a backend outage never traps users in a force-update screen.
 */
export async function fetchVersionGate(): Promise<ApiResponse<VersionGateData>> {
  const { data } = await api.get<ApiResponse<VersionGateData>>(
    `${APP_CONFIG}/version-gate`,
  );
  return data;
}
