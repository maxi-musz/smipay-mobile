import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { fetchAppBootstrap } from "./bootstrap.api";
import { readCachedBootstrap, writeCachedBootstrap } from "./bootstrap.cache";
import {
  PERMISSIVE_BOOTSTRAP,
  type AreaAvailability,
  type BootstrapArea,
  type BootstrapData,
} from "./types";

/**
 * How long the app may sit in the background before a resume counts as
 * "resume-after-idle" and triggers a refetch. Short enough that a 6-hour
 * session cannot run 6-hour-old state; long enough that tabbing to the SMS app
 * to copy an OTP does not cause a refetch.
 */
const RESUME_REFETCH_AFTER_MS = 3 * 60 * 1000;

/** Floor between two automatic refetches, whatever triggered them. */
const REFETCH_THROTTLE_MS = 60 * 1000;

export interface AppBootstrapState {
  data: BootstrapData;
  /** True until the first fetch settles — cached or network, success or not. */
  loading: boolean;
  /** True when `data` came from the cache rather than this session's network. */
  fromCache: boolean;
  /** Epoch ms of the last successful network fetch, or 0. */
  lastFetchedAt: number;
}

/**
 * Fetches `GET /app/bootstrap` on launch and on resume-after-idle, boots from
 * the last cached copy, and fails open.
 *
 * **This decorates the UI. It never authorises anything.** Use it to grey out a
 * paused feature and render a real countdown; the backend still re-checks every
 * rule on every request, and screens must still handle 503/429 arriving
 * mid-flow (see `describeServiceError`).
 */
export function useAppBootstrap(): AppBootstrapState & {
  refresh: (options?: { force?: boolean }) => Promise<void>;
  availabilityFor: (area: BootstrapArea) => AreaAvailability;
  isAvailable: (area: BootstrapArea) => boolean;
} {
  const [data, setData] = useState<BootstrapData>(PERMISSIVE_BOOTSTRAP);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(0);

  const lastAttemptAtRef = useRef(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundedAtRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async (options?: { force?: boolean }) => {
    const now = Date.now();
    if (!options?.force && now - lastAttemptAtRef.current < REFETCH_THROTTLE_MS) {
      return;
    }
    lastAttemptAtRef.current = now;

    try {
      const next = await fetchAppBootstrap();
      if (!next || !mountedRef.current) return;
      setData(next);
      setFromCache(false);
      setLastFetchedAt(Date.now());
      void writeCachedBootstrap(next);
    } catch {
      // Fail open, always. Keep whatever we already had — the cached copy if
      // that is all we have, the permissive default otherwise. A bootstrap
      // outage must never brick the app.
    }
  }, []);

  // Boot from cache first so a cold start with no network still renders
  // something truthful, then go to the network.
  useEffect(() => {
    mountedRef.current = true;

    void (async () => {
      const cached = await readCachedBootstrap();
      if (cached && mountedRef.current) {
        setData(cached.data);
        setFromCache(true);
      }
      try {
        await refresh({ force: true });
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (next.match(/inactive|background/)) {
        backgroundedAtRef.current = Date.now();
        return;
      }

      if (prev.match(/inactive|background/) && next === "active") {
        const away = backgroundedAtRef.current
          ? Date.now() - backgroundedAtRef.current
          : Number.POSITIVE_INFINITY;
        backgroundedAtRef.current = null;
        // Resume-after-idle only. A quick trip to the SMS app to copy a code
        // should not cost a request.
        if (away >= RESUME_REFETCH_AFTER_MS) void refresh();
      }
    });

    return () => {
      mountedRef.current = false;
      sub.remove();
    };
  }, [refresh]);

  const availabilityFor = useCallback(
    (area: BootstrapArea): AreaAvailability =>
      // An area we have no word on is available. Absence of a "no" is not a no.
      data.availability?.[area] ?? { available: true },
    [data],
  );

  const isAvailable = useCallback(
    (area: BootstrapArea) => availabilityFor(area).available !== false,
    [availabilityFor],
  );

  return {
    data,
    loading,
    fromCache,
    lastFetchedAt,
    refresh,
    availabilityFor,
    isAvailable,
  };
}
