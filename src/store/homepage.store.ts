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

const _useHomepageStore = create<HomepageStore>()((set, get) => ({
  ...initialState,

  fetchHomepage: async () => {
    if (get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const response = await fetchHomepageDetails();
      set({ data: response.data, isLoading: false });
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to load homepage data";
      set({ error: message, isLoading: false });
    }
  },

  reset: () => set(initialState),
}));

export const useHomepageStore = createSelectors(_useHomepageStore);
