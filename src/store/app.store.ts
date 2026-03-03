import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ThemeMode } from "@/constants/theme";

import { createSelectors } from "./create-selectors";
import { createPersistConfig } from "./middleware";

interface AppState {
  /** Whether all persisted stores have finished rehydrating. */
  isHydrated: boolean;
  /** Global loading overlay (e.g. during token refresh). */
  isGlobalLoading: boolean;
  /** Unread notification count shown on tab badge. */
  notificationCount: number;
  /** User's preferred theme mode, persisted across restarts. */
  themeMode: ThemeMode;
}

interface AppActions {
  setHydrated: (value: boolean) => void;
  setGlobalLoading: (value: boolean) => void;
  setNotificationCount: (count: number) => void;
  setThemeMode: (mode: ThemeMode) => void;
  reset: () => void;
}

type AppStore = AppState & AppActions;

const initialState: AppState = {
  isHydrated: false,
  isGlobalLoading: false,
  notificationCount: 0,
  themeMode: "system",
};

const _useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialState,

      setHydrated: (isHydrated) => set({ isHydrated }),

      setGlobalLoading: (isGlobalLoading) => set({ isGlobalLoading }),

      setNotificationCount: (notificationCount) => set({ notificationCount }),

      setThemeMode: (themeMode) => set({ themeMode }),

      reset: () => set(initialState),
    }),
    createPersistConfig("app", {
      partialize: (state) => ({ themeMode: state.themeMode }),
    }),
  ),
);

export const useAppStore = createSelectors(_useAppStore);
