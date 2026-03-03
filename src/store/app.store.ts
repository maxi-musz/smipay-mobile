import { create } from "zustand";

import { createSelectors } from "./create-selectors";

interface AppState {
  /** Whether all persisted stores have finished rehydrating. */
  isHydrated: boolean;
  /** Global loading overlay (e.g. during token refresh). */
  isGlobalLoading: boolean;
  /** Unread notification count shown on tab badge. */
  notificationCount: number;
}

interface AppActions {
  setHydrated: (value: boolean) => void;
  setGlobalLoading: (value: boolean) => void;
  setNotificationCount: (count: number) => void;
  reset: () => void;
}

type AppStore = AppState & AppActions;

const initialState: AppState = {
  isHydrated: false,
  isGlobalLoading: false,
  notificationCount: 0,
};

const _useAppStore = create<AppStore>()((set) => ({
  ...initialState,

  setHydrated: (isHydrated) => set({ isHydrated }),

  setGlobalLoading: (isGlobalLoading) => set({ isGlobalLoading }),

  setNotificationCount: (notificationCount) => set({ notificationCount }),

  reset: () => set(initialState),
}));

export const useAppStore = createSelectors(_useAppStore);
