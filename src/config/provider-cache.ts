/**
 * Central cache-config for utility provider lists.
 *
 * This is the single source of truth for how long each service's first/provider
 * endpoint stays cached on-device. Edit the numbers below and ship with
 * `eas update` to change the windows instantly — values are read at check-time,
 * so new windows apply immediately to already-cached timestamps.
 */

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

/** Per-service cache windows. Tweak freely; OTA picks them up immediately. */
export const PROVIDER_CACHE_TTL = {
  airtime: MONTH,
  data: WEEK,
  cable: MONTH,
  education: MONTH,
  electricity: MONTH,
  intlAirtime: MONTH,
} as const;

/**
 * Bump this to force-invalidate ALL persisted provider caches on next launch
 * (e.g. after a provider list actually changes). Zustand persist drops any
 * stored state whose version does not match.
 */
export const PROVIDER_CACHE_VERSION = 1;

export type ProviderCacheKey = keyof typeof PROVIDER_CACHE_TTL;

/** True when `fetchedAt` exists and is still within the TTL window. */
export function isCacheFresh(
  fetchedAt: number | null | undefined,
  ttlMs: number,
): boolean {
  return fetchedAt != null && Date.now() - fetchedAt < ttlMs;
}
