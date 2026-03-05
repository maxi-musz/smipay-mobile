import { create } from "zustand";

import { fetchHomepageDetails } from "@/api";
import type { HomepageData } from "@/types";
import { createSelectors } from "./create-selectors";

interface HomepageState {
  data: HomepageData | null;
  isLoading: boolean;
  error: string | null;
}

interface HomepageActions {
  fetchHomepage: () => Promise<void>;
  reset: () => void;
}

type HomepageStore = HomepageState & HomepageActions;

const initialState: HomepageState = {
  data: null,
  isLoading: false,
  error: null,
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

const _useHomepageStore = create<HomepageStore>()((set, get) => ({
  ...initialState,

  fetchHomepage: async () => {
    if (get().isLoading) return;

    set({ isLoading: true, error: null });

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetchHomepageDetails();
        set({ data: response.data, isLoading: false });
        return;
      } catch {
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }

    set({
      error:
        "Unable to load dashboard. Please check your connection and try again.",
      isLoading: false,
    });
  },

  reset: () => set(initialState),
}));

export const useHomepageStore = createSelectors(_useHomepageStore);
