import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createSelectors } from "@/store/create-selectors";
import { createPersistConfig } from "@/store/middleware";
import {
  PROVIDER_CACHE_TTL,
  PROVIDER_CACHE_VERSION,
  isCacheFresh,
} from "@/config/provider-cache";
import {
  fetchDataServiceIds,
  fetchDataVariationCodes,
} from "@/api";
import type { DataServiceItem, DataVariation, DataVariationCategory } from "@/types/vtpass-data";

interface CachedVariations {
  variations: DataVariation[];
  variationsCategorized: Record<string, DataVariationCategory>;
}

interface DataState {
  providers: DataServiceItem[];
  /** Epoch ms when `providers` was last fetched; drives TTL caching. */
  providersFetchedAt: number | null;
  variations: DataVariation[];
  variationsCategorized: Record<string, DataVariationCategory>;

  /** Cache of variations per provider so we don't re-fetch on provider switch */
  variationsByProvider: Record<string, CachedVariations>;

  selectedProvider: DataServiceItem | null;
  selectedVariation: DataVariation | null;

  isLoadingProviders: boolean;
  isLoadingVariations: boolean;

  providersError: string | null;
  variationsError: string | null;
}

interface DataActions {
  fetchProviders: (forceRefresh?: boolean) => Promise<void>;
  fetchVariationCodes: (serviceID: string, forceRefresh?: boolean) => Promise<void>;
  setSelectedProvider: (p: DataServiceItem | null) => void;
  setSelectedVariation: (v: DataVariation | null) => void;
  reset: () => void;
}

type DataStore = DataState & DataActions;

const initialState: DataState = {
  providers: [],
  providersFetchedAt: null,
  variations: [],
  variationsCategorized: {},
  variationsByProvider: {},

  selectedProvider: null,
  selectedVariation: null,

  isLoadingProviders: false,
  isLoadingVariations: false,

  providersError: null,
  variationsError: null,
};

function getErrorMessage(e: unknown): string {
  const err = e as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return err?.response?.data?.message ?? err?.message ?? "Something went wrong";
}

const _useDataStore = create<DataStore>()(
  persist(
    (set, get) => ({
  ...initialState,

  fetchProviders: async (forceRefresh = false) => {
    const { providers, isLoadingProviders, providersFetchedAt } = get();
    if (isLoadingProviders) return;
    if (
      !forceRefresh &&
      providers.length > 0 &&
      isCacheFresh(providersFetchedAt, PROVIDER_CACHE_TTL.data)
    ) {
      return;
    }

    set({ isLoadingProviders: true, providersError: null });

    try {
      const res = await fetchDataServiceIds();
      if (res.success && res.data?.length) {
        set({
          providers: res.data,
          providersFetchedAt: Date.now(),
          isLoadingProviders: false,
          providersError: null,
        });
      } else {
        set({
          providersError:
            (res as { message?: string }).message ?? "Failed to load networks",
          isLoadingProviders: false,
        });
      }
    } catch (e) {
      set({
        providersError: getErrorMessage(e),
        isLoadingProviders: false,
      });
    }
  },

  fetchVariationCodes: async (serviceID: string, forceRefresh = false) => {
    const { isLoadingVariations, variationsByProvider } = get();
    if (isLoadingVariations) return;

    const cached = variationsByProvider[serviceID];
    if (!forceRefresh && cached) {
      set({
        variations: cached.variations,
        variationsCategorized: cached.variationsCategorized,
        variationsError: null,
      });
      return;
    }

    set({
      isLoadingVariations: true,
      variationsError: null,
      variations: [],
      variationsCategorized: {},
    });

    try {
      const res = await fetchDataVariationCodes(serviceID);
      if (res.success && res.data) {
        const variations = res.data.variations ?? [];
        const variationsCategorized = res.data.variations_categorized ?? {};
        set((s) => ({
          variations,
          variationsCategorized,
          variationsByProvider: {
            ...s.variationsByProvider,
            [serviceID]: { variations, variationsCategorized },
          },
          isLoadingVariations: false,
          variationsError: null,
        }));
      } else {
        set({
          variationsError:
            (res as { message?: string }).message ?? "Failed to load plans",
          isLoadingVariations: false,
        });
      }
    } catch (e) {
      set({
        variationsError: getErrorMessage(e),
        isLoadingVariations: false,
      });
    }
  },

  setSelectedProvider: (p) =>
    set((s) => {
      if (!p) {
        return {
          selectedProvider: null,
          selectedVariation: null,
          variations: [],
          variationsCategorized: {},
        };
      }
      const cached = s.variationsByProvider[p.serviceID];
      return {
        selectedProvider: p,
        selectedVariation: null,
        variations: cached?.variations ?? [],
        variationsCategorized: cached?.variationsCategorized ?? {},
      };
    }),
  setSelectedVariation: (v) => set({ selectedVariation: v }),
  reset: () => set(initialState),
    }),
    createPersistConfig<DataStore>("data-providers", {
      version: PROVIDER_CACHE_VERSION,
      partialize: (state) => ({
        providers: state.providers,
        providersFetchedAt: state.providersFetchedAt,
      }),
    }),
  ),
);

export const useDataStore = createSelectors(_useDataStore);
