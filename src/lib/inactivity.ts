import { AppState, type AppStateStatus } from "react-native";

import { useAppStore } from "@/store/app.store";
import { useAuthStore } from "@/store/auth.store";
import type { LockTimeout } from "@/store/app.store";

const TIMEOUT_MS: Record<LockTimeout, number> = {
  immediate: 0,
  "60min": 60 * 60 * 1000,
  none: Infinity,
};

let backgroundedAt: number | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

export function resetInactivityTimer() {
  backgroundedAt = null;
}

function handleAppStateChange(nextState: AppStateStatus) {
  const { isAuthenticated, isLocked } = useAuthStore.getState();
  if (!isAuthenticated || isLocked) return;

  const timeout = TIMEOUT_MS[useAppStore.getState().lockTimeout];
  if (timeout === Infinity) return;

  if (nextState === "background" || nextState === "inactive") {
    backgroundedAt = Date.now();

    if (timeout === 0) {
      useAuthStore.getState().lock();
      backgroundedAt = null;
    }
  } else if (nextState === "active" && backgroundedAt !== null) {
    const elapsed = Date.now() - backgroundedAt;
    backgroundedAt = null;

    if (elapsed >= timeout) {
      useAuthStore.getState().lock();
    }
  }
}

export function startInactivityTracking() {
  backgroundedAt = null;

  if (appStateSubscription) appStateSubscription.remove();
  appStateSubscription = AppState.addEventListener("change", handleAppStateChange);
}

export function stopInactivityTracking() {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  backgroundedAt = null;
}
