import { create } from "zustand";
import { persist } from "zustand/middleware";

import { fetchHomepageDetails } from "@/api";
import { normalizeHomepageMoneyFields } from "@/lib/money";
import type { HomepageData } from "@/types";
import { createPersistConfig } from "./middleware";
import { createSelectors } from "./create-selectors";

interface HomepageState {
  data: HomepageData | null;
  /** True when no data is available yet and we are fetching for the first time. */
  isLoading: boolean;
  /** True when data already exists but we are silently refreshing in the background. */
  isRefreshing: boolean;
  error: string | null;
}

interface HomepageActions {
  fetchHomepage: () => Promise<void>;
  /** Refetch homepage data without setting `isLoading` (e.g. after profile photo update). */
  refreshHomepageSilently: () => Promise<void>;
  reset: () => void;
}

type HomepageStore = HomepageState & HomepageActions;

const initialState: HomepageState = {
  data: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

const _useHomepageStore = create<HomepageStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Public fetch entry point. When data already exists in the store (e.g.
       * rehydrated from disk on cold start, or kept warm by a previous load),
       * we treat this as a silent refresh so the UI never falls back to a
       * full-page loader. Only the very first load — no cached data at all —
       * sets `isLoading`.
       */
      fetchHomepage: async () => {
        if (get().isLoading || get().isRefreshing) return;

        const hasData = !!get().data;
        if (hasData) {
          set({ isRefreshing: true, error: null });
        } else {
          set({ isLoading: true, error: null });
        }

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const response = await fetchHomepageDetails();
            set({
              data: normalizeHomepageMoneyFields(response.data),
              isLoading: false,
              isRefreshing: false,
              error: null,
            });
            return;
          } catch {
            if (attempt < MAX_RETRIES) {
              await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            }
          }
        }

        // If we still have cached data, keep showing it and surface the error
        // separately so the screen can render a subtle banner instead of a
        // blocking retry state.
        set({
          error:
            "Unable to load dashboard. Please check your connection and try again.",
          isLoading: false,
          isRefreshing: false,
        });
      },

      refreshHomepageSilently: async () => {
        if (get().isRefreshing) return;
        set({ isRefreshing: true });
        try {
          const response = await fetchHomepageDetails();
          set({
            data: normalizeHomepageMoneyFields(response.data),
            isRefreshing: false,
            error: null,
          });
        } catch {
          // Keep existing dashboard data; avoid disrupting UX when silent refresh fails.
          set({ isRefreshing: false });
        }
      },

      reset: () => set(initialState),
    }),
    createPersistConfig<HomepageStore>("homepage", {
      // Only persist the snapshot — never persist transient flags so a crash
      // mid-fetch can't strand the store in `isLoading: true` on next launch.
      partialize: (state) => ({ data: state.data }),
      // Guard against the cold-start race where a very fast network fetch
      // completes before AsyncStorage rehydration: if the in-memory store
      // already has fresh data, never overwrite it with the stale snapshot.
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<HomepageState> | undefined;
        return {
          ...currentState,
          data: currentState.data ?? persisted?.data ?? null,
        };
      },
    }),
  ),
);

export const useHomepageStore = createSelectors(_useHomepageStore);
