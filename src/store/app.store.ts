import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ThemeMode } from "@/constants/theme";

import { createSelectors } from "./create-selectors";
import { createPersistConfig } from "./middleware";

export type LockTimeout = "immediate" | "1min" | "60min" | "none";

interface AppState {
  /** Whether all persisted stores have finished rehydrating. */
  isHydrated: boolean;
  /** Global loading overlay (e.g. during token refresh). */
  isGlobalLoading: boolean;
  /** Unread notification count shown on tab badge. */
  notificationCount: number;
  /** User's preferred theme mode, persisted across restarts. */
  themeMode: ThemeMode;
  /** App lock setting — when to lock after backgrounding. */
  lockTimeout: LockTimeout;
  /** Whether user has enabled biometrics for app unlock. */
  biometricsEnabled: boolean;
  /** Whether user has enabled push notifications. When false, we do not register with backend. */
  pushNotificationsEnabled: boolean;
}

interface AppActions {
  setHydrated: (value: boolean) => void;
  setGlobalLoading: (value: boolean) => void;
  setNotificationCount: (count: number) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setLockTimeout: (timeout: LockTimeout) => void;
  setBiometricsEnabled: (value: boolean) => void;
  setPushNotificationsEnabled: (value: boolean) => void;
  reset: () => void;
}

type AppStore = AppState & AppActions;

const initialState: AppState = {
  isHydrated: false,
  isGlobalLoading: false,
  notificationCount: 0,
  themeMode: "system",
  lockTimeout: "1min",
  biometricsEnabled: false,
  pushNotificationsEnabled: true,
};

const _useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialState,

      setHydrated: (isHydrated) => set({ isHydrated }),

      setGlobalLoading: (isGlobalLoading) => set({ isGlobalLoading }),

      setNotificationCount: (notificationCount) => set({ notificationCount }),

      setThemeMode: (themeMode) => set({ themeMode }),

      setLockTimeout: (lockTimeout) => set({ lockTimeout }),

      setBiometricsEnabled: (biometricsEnabled) => set({ biometricsEnabled }),

      setPushNotificationsEnabled: (pushNotificationsEnabled) => set({ pushNotificationsEnabled }),

      reset: () => set(initialState),
    }),
    createPersistConfig("app", {
      partialize: (state) => ({
        themeMode: state.themeMode,
        lockTimeout: state.lockTimeout,
        biometricsEnabled: state.biometricsEnabled,
        pushNotificationsEnabled: state.pushNotificationsEnabled,
      }),
    }),
  ),
);

export const useAppStore = createSelectors(_useAppStore);
