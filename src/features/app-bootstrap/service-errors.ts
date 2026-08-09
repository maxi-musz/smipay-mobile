import { ApiClientError } from "@/lib/api";

/**
 * Classifying the two errors that the admin console can now cause on purpose.
 *
 * The bootstrap payload lets the app avoid *most* of these — it can grey out a
 * switched-off feature before anyone taps it. But there is always a race
 * between fetching and acting, and a rule can be flipped mid-session, so every
 * screen must still handle them arriving mid-flow. This is the shared way to
 * do that.
 */

export type ServiceErrorKind =
  /** 503 — an admin switched this area off. `message` is their copy. */
  | "maintenance"
  /** 429 — too many attempts. `retryAfterSeconds` when the server said. */
  | "rate_limited"
  /** Anything else. Render it the way the screen always has. */
  | "other";

export interface ServiceErrorInfo {
  kind: ServiceErrorKind;
  /**
   * What to show the user. For maintenance and rate limits this is the
   * admin-authored message from the console, already substituted — show it
   * verbatim rather than writing your own copy.
   */
  message: string;
  /** Which product area was switched off, when the server named one. */
  area?: string;
  /** Seconds until a rate-limited action may be retried, when known. */
  retryAfterSeconds?: number;
}

const GENERIC_FALLBACK = "Something went wrong. Please try again.";

/**
 * Turn any thrown value into something a screen can render.
 *
 * Safe to call in every `catch` — a non-API error simply comes back as
 * `kind: "other"` with a sensible message, so adopting this never changes how
 * an existing error path behaves.
 */
export function describeServiceError(err: unknown): ServiceErrorInfo {
  if (!(err instanceof ApiClientError)) {
    const message = err instanceof Error ? err.message : GENERIC_FALLBACK;
    return { kind: "other", message: message || GENERIC_FALLBACK };
  }

  const body = (err.data ?? {}) as Record<string, unknown>;
  const message = err.message || GENERIC_FALLBACK;

  if (err.statusCode === 503 || body.code === "UNDER_MAINTENANCE") {
    return {
      kind: "maintenance",
      message,
      area: typeof body.area === "string" ? body.area : undefined,
    };
  }

  if (err.statusCode === 429) {
    // Servers spell this several ways depending on which limiter tripped.
    const retry =
      pickNumber(body.retry_after_seconds) ??
      pickNumber(body.retryAfterSeconds) ??
      pickNumber(body.retry_after);
    return {
      kind: "rate_limited",
      message,
      ...(retry != null ? { retryAfterSeconds: retry } : {}),
    };
  }

  return { kind: "other", message };
}

/** True when the error means "an admin switched this off", not "you did something wrong". */
export function isMaintenanceError(err: unknown): boolean {
  return describeServiceError(err).kind === "maintenance";
}

/** True when the error means "slow down". */
export function isRateLimitError(err: unknown): boolean {
  return describeServiceError(err).kind === "rate_limited";
}

function pickNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}
