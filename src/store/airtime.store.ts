import { create } from "zustand";
import { persist } from "zustand/middleware";

import { fetchAirtimeServiceIds } from "@/api/services/vtpass-airtime";
import type { AirtimeServiceItem } from "@/types/vtpass-airtime";
import {
  PROVIDER_CACHE_TTL,
  PROVIDER_CACHE_VERSION,
  isCacheFresh,
} from "@/config/provider-cache";
import { createPersistConfig } from "./middleware";
import { createSelectors } from "./create-selectors";

/** Exclude international/foreign airtime from domestic airtime network dropdown. */
const EXCLUDED_SERVICE_IDS = [
  "foreign-airtime",
  "intl-airtime",
  "international-airtime",
];

function filterDomesticProviders(data: AirtimeServiceItem[]): AirtimeServiceItem[] {
  return data.filter(
    (p) =>
      !EXCLUDED_SERVICE_IDS.includes(p.serviceID.toLowerCase()) &&
      !p.name.toLowerCase().includes("international") &&
      !p.name.toLowerCase().includes("intl"),
  );
}

interface AirtimeState {
  providers: AirtimeServiceItem[];
  /** Epoch ms when `providers` was last fetched; drives TTL caching. */
  providersFetchedAt: number | null;
  isLoading: boolean;
  error: string | null;
}

interface AirtimeActions {
  fetchAirtimeProviders: (forceRefresh?: boolean) => Promise<void>;
  reset: () => void;
}

type AirtimeStore = AirtimeState & AirtimeActions;

const initialState: AirtimeState = {
  providers: [],
  providersFetchedAt: null,
  isLoading: false,
  error: null,
};

const _useAirtimeStore = create<AirtimeStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchAirtimeProviders: async (forceRefresh = false) => {
        const { providers, isLoading, providersFetchedAt } = get();
        if (isLoading) return;
        if (
          !forceRefresh &&
          providers.length > 0 &&
          isCacheFresh(providersFetchedAt, PROVIDER_CACHE_TTL.airtime)
        ) {
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const res = await fetchAirtimeServiceIds();
          if (res.success && res.data?.length) {
            const filtered = filterDomesticProviders(res.data);
            set({
              providers: filtered,
              providersFetchedAt: Date.now(),
              isLoading: false,
            });
          } else {
            set({
              error: "Unable to load networks. Tap to retry.",
              isLoading: false,
            });
          }
        } catch {
          set({
            error: "Unable to load networks. Tap to retry.",
            isLoading: false,
          });
        }
      },

      reset: () => set(initialState),
    }),
    createPersistConfig<AirtimeStore>("airtime-providers", {
      version: PROVIDER_CACHE_VERSION,
      partialize: (state) => ({
        providers: state.providers,
        providersFetchedAt: state.providersFetchedAt,
      }),
    }),
  ),
);

export const useAirtimeStore = createSelectors(_useAirtimeStore);
