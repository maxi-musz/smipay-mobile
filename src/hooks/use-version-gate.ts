import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";

import { fetchVersionGate, type VersionGateData } from "@/api";
import { compareVersions } from "@/lib/version-compare";

/** How long a "Later" tap on a soft-update prompt suppresses re-prompts for. */
const SOFT_UPDATE_SNOOZE_MS = 24 * 60 * 60 * 1000;
/** AsyncStorage key holding the epoch ms after which we may re-prompt. */
const SNOOZE_KEY = "@smipay/soft_update_snoozed_until";
/** Minimum gap between two automatic refetches of the version gate. */
const REFETCH_THROTTLE_MS = 5 * 60 * 1000;

export type VersionGateLevel = "force" | "soft" | "none";

export interface VersionGateState {
  /** What action, if any, the UI should surface to the user. */
  level: VersionGateLevel;
  /** Body copy to render in the modal (chosen from the server payload). */
  message: string;
  /** App version currently installed on this device. */
  currentVersion: string | null;
  /** Version we want the user to land on (minimum for force, latest for soft). */
  targetVersion: string | null;
  /** Platform-appropriate store URL the "Update" CTA should open. */
  storeUrl: string;
}

const EMPTY_STATE: VersionGateState = {
  level: "none",
  message: "",
  currentVersion: null,
  targetVersion: null,
  storeUrl: "",
};

/**
 * Drives the app-wide update prompt. Fetches the server's version-gate config
 * on mount and whenever the app returns to the foreground, then derives the
 * appropriate level (`force` / `soft` / `none`) by comparing the installed
 * build's version against the minimum and latest values for the current
 * platform.
 *
 * Behaviour notes:
 *   - Network or parse failures fail-open (`level: "none"`) so a backend
 *     outage never traps users in an unrecoverable update screen.
 *   - Soft updates honour a 24h snooze persisted in AsyncStorage so we don't
 *     nag users who tapped "Later".
 *   - `versionCheckComplete` becomes `true` after the first forced refresh so
 *     callers can defer other blocking modals until the gate result is known.
 *   - The caller is responsible for placing the snooze suppression UI in
 *     contexts where it makes sense (we still report `level: "soft"` even
 *     during the snooze; the modal is what gets hidden).
 */
export function useVersionGate() {
  const [state, setState] = useState<VersionGateState>(EMPTY_STATE);
  const [softSnoozedUntil, setSoftSnoozedUntil] = useState<number | null>(null);
  /** First `refresh({ force: true })` finished — avoids flashing the PIN modal before we know if soft update applies. */
  const [versionCheckComplete, setVersionCheckComplete] = useState(false);

  const lastFetchAtRef = useRef(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Hydrate the persisted snooze on mount so a relaunch doesn't re-nag.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SNOOZE_KEY);
        if (cancelled || !raw) return;
        const parsed = Number.parseInt(raw, 10);
        if (Number.isFinite(parsed)) setSoftSnoozedUntil(parsed);
      } catch {
        // ignore — snooze is best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Resolve the current installed version. `nativeApplicationVersion` reflects
   * the user-facing version (e.g. `"1.4.0"`), which is what we expose in the
   * store. The build number (`nativeBuildVersion`) is intentionally ignored —
   * it's incremented per upload and would make comparison fragile.
   */
  const currentVersion = Application.nativeApplicationVersion ?? null;

  const runComparison = useCallback(
    (data: VersionGateData): VersionGateState => {
      if (!currentVersion) {
        // Without an installed version we cannot compare safely — be permissive.
        if (__DEV__) {
          console.warn(
            "[VersionGate] No installed app version detected — skipping gate. " +
              "Likely running in Expo Go (where nativeApplicationVersion can be null/Expo Go's own version). " +
              "Test force-update in a dev build instead.",
          );
        }
        return EMPTY_STATE;
      }

      const platform = Platform.OS === "ios" ? "ios" : "android";
      const minimum =
        platform === "ios"
          ? data.minimum_supported_version.ios
          : data.minimum_supported_version.android;
      const latest =
        platform === "ios"
          ? data.latest_version.ios
          : data.latest_version.android;
      const storeUrl =
        platform === "ios" ? data.ios_store_url : data.android_store_url;

      const next: VersionGateState =
        compareVersions(currentVersion, minimum) < 0
          ? {
              level: "force",
              message: data.force_message,
              currentVersion,
              targetVersion: minimum,
              storeUrl,
            }
          : compareVersions(currentVersion, latest) < 0
            ? {
                level: "soft",
                message: data.soft_message,
                currentVersion,
                targetVersion: latest,
                storeUrl,
              }
            : { ...EMPTY_STATE, currentVersion };

      if (__DEV__) {
        // Single line: everything you need to debug why the gate did or
        // didn't trigger. Note `installed` is whatever the OS reports for
        // this binary — in Expo Go that's Expo Go's own version, not the
        // value in app.json.
        console.log(
          `[VersionGate] platform=${platform} installed=${currentVersion} min=${minimum} latest=${latest} -> level=${next.level}`,
        );
      }

      return next;
    },
    [currentVersion],
  );

  const refresh = useCallback(
    async (options?: { force?: boolean }) => {
      const now = Date.now();
      if (
        !options?.force &&
        now - lastFetchAtRef.current < REFETCH_THROTTLE_MS
      ) {
        return;
      }
      lastFetchAtRef.current = now;

      try {
        const res = await fetchVersionGate();
        if (!res.data) return;
        setState(runComparison(res.data));
      } catch {
        // Fail-open: never trap the user behind a gate we couldn't fetch.
        setState((prev) =>
          prev.level === "none" ? prev : { ...EMPTY_STATE, currentVersion },
        );
      }
    },
    [runComparison, currentVersion],
  );

  // Initial fetch + listener for resume-from-background.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refresh({ force: true });
      } finally {
        if (!cancelled) setVersionCheckComplete(true);
      }
    })();
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev.match(/inactive|background/) && next === "active") {
        void refresh();
      }
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [refresh]);

  /** Persist a 24h snooze so a quick "Later" tap doesn't re-prompt next launch. */
  const snoozeSoftUpdate = useCallback(async () => {
    const until = Date.now() + SOFT_UPDATE_SNOOZE_MS;
    setSoftSnoozedUntil(until);
    try {
      await AsyncStorage.setItem(SNOOZE_KEY, String(until));
    } catch {
      // ignore — snooze is best-effort
    }
  }, []);

  /** Clear any prior snooze (e.g. once the soft target version changes). */
  const clearSoftSnoozeIfTargetChanged = useCallback(
    async (target: string | null) => {
      if (!target || softSnoozedUntil == null) return;
      try {
        const raw = await AsyncStorage.getItem(
          "@smipay/soft_update_snoozed_target",
        );
        if (raw !== target) {
          setSoftSnoozedUntil(null);
          await AsyncStorage.multiRemove([SNOOZE_KEY]);
          await AsyncStorage.setItem(
            "@smipay/soft_update_snoozed_target",
            target,
          );
        }
      } catch {
        // ignore
      }
    },
    [softSnoozedUntil],
  );

  // Whenever the soft target changes, reset the snooze so a new release
  // shows the prompt again instead of being silenced by an older snooze.
  useEffect(() => {
    if (state.level === "soft" && state.targetVersion) {
      void clearSoftSnoozeIfTargetChanged(state.targetVersion);
    }
  }, [state.level, state.targetVersion, clearSoftSnoozeIfTargetChanged]);

  const isSoftSnoozed =
    softSnoozedUntil != null && softSnoozedUntil > Date.now();

  /** What the UI should actually render — `none` whenever a soft prompt is snoozed. */
  const effectiveLevel: VersionGateLevel =
    state.level === "soft" && isSoftSnoozed ? "none" : state.level;

  return {
    ...state,
    effectiveLevel,
    snoozeSoftUpdate,
    refresh,
    versionCheckComplete,
  };
}
