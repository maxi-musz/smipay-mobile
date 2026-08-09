/**
 * Shape of `GET /app/bootstrap`. Deliberately narrow: the backend only sends
 * what the interface can use, and never enforcement internals.
 */

/** A product area the admin can switch off from the console. */
export type BootstrapArea =
  | "registration"
  | "email_verification"
  | "otp_verification"
  | "utility_services";

export interface AreaAvailability {
  available: boolean;
  /** Admin-authored copy. Only present when unavailable. */
  message?: string;
  /** ISO timestamp. Only present when the admin scheduled a return. */
  resumes_at?: string;
}

export interface BootstrapVersionGate {
  minimum_supported_version: { ios: string; android: string };
  latest_version: { ios: string; android: string };
  ios_store_url: string;
  android_store_url: string;
  force_message: string;
  soft_message: string;
}

export interface BootstrapData {
  /** Keyed by area. Every known area is present, available or not. */
  availability: Partial<Record<BootstrapArea, AreaAvailability>>;
  otp: {
    resend_cooldown_seconds: number;
    expiry_minutes: number;
  };
  app_version: BootstrapVersionGate | null;
  /** Server clock, so a device with a skewed clock can still count down. */
  server_time: string;
}

/**
 * What the app assumes before the first response lands, and whenever a fetch
 * fails. **Everything available** — the backend is the thing that says no, and
 * a bootstrap outage must never be what stops someone using the app.
 */
export const PERMISSIVE_BOOTSTRAP: BootstrapData = {
  availability: {},
  otp: { resend_cooldown_seconds: 60, expiry_minutes: 10 },
  app_version: null,
  server_time: new Date(0).toISOString(),
};
