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
  fetchEducationVariations,
  verifyJambProfile,
} from "@/api";
import type {
  EducationVariation,
  JambVerifyContent,
  EducationProductID,
} from "@/types/vtpass-education";

interface CachedVariations {
  variations: EducationVariation[];
}

interface EducationState {
  selectedProduct: EducationProductID | null;
  variations: EducationVariation[];
  variationsByProduct: Record<string, CachedVariations>;
  /** Epoch ms per product serviceID when its variations were last fetched. */
  variationsFetchedAt: Record<string, number>;
  selectedVariation: EducationVariation | null;
  quantity: number;

  /** JAMB only: profile ID entered by user */
  billersCode: string;
  /** JAMB only: verified profile data */
  verifyData: JambVerifyContent | null;
  isVerifying: boolean;
  verifyError: string | null;

  isLoadingVariations: boolean;
  variationsError: string | null;
}

interface EducationActions {
  setSelectedProduct: (id: EducationProductID) => void;
  fetchVariations: (serviceID: string, forceRefresh?: boolean) => Promise<void>;
  setSelectedVariation: (v: EducationVariation | null) => void;
  setQuantity: (q: number) => void;
  verifyJamb: (billersCode: string, variationCode: string) => Promise<boolean>;
  clearVerify: () => void;
  reset: () => void;
}

type EducationStore = EducationState & EducationActions;

const initialState: EducationState = {
  selectedProduct: null,
  variations: [],
  variationsByProduct: {},
  variationsFetchedAt: {},
  selectedVariation: null,
  quantity: 1,

  billersCode: "",
  verifyData: null,
  isVerifying: false,
  verifyError: null,

  isLoadingVariations: false,
  variationsError: null,
};

function getErrorMessage(e: unknown): string {
  const err = e as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return err?.response?.data?.message ?? err?.message ?? "Something went wrong";
}

const _useEducationStore = create<EducationStore>()(
  persist(
    (set, get) => ({
  ...initialState,

  setSelectedProduct: (id) =>
    set({
      selectedProduct: id,
      selectedVariation: null,
      quantity: 1,
      billersCode: "",
      verifyData: null,
      verifyError: null,
    }),

  fetchVariations: async (serviceID, forceRefresh = false) => {
    const { isLoadingVariations, variationsByProduct, variationsFetchedAt } =
      get();
    if (isLoadingVariations) return;

    const cached = variationsByProduct[serviceID];
    if (
      !forceRefresh &&
      cached &&
      isCacheFresh(variationsFetchedAt[serviceID], PROVIDER_CACHE_TTL.education)
    ) {
      set({ variations: cached.variations, variationsError: null });
      return;
    }

    set({ isLoadingVariations: true, variationsError: null, variations: [] });

    try {
      const res = await fetchEducationVariations(serviceID);
      if (res.success && res.data) {
        const variations = res.data.variations ?? [];
        set((s) => ({
          variations,
          variationsByProduct: {
            ...s.variationsByProduct,
            [serviceID]: { variations },
          },
          variationsFetchedAt: {
            ...s.variationsFetchedAt,
            [serviceID]: Date.now(),
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
      set({ variationsError: getErrorMessage(e), isLoadingVariations: false });
    }
  },

  setSelectedVariation: (v) => set({ selectedVariation: v }),

  setQuantity: (q) => set({ quantity: Math.max(1, Math.min(10, q)) }),

  verifyJamb: async (billersCode, variationCode) => {
    set({ isVerifying: true, verifyError: null, verifyData: null });

    try {
      const res = await verifyJambProfile({
        billersCode,
        type: variationCode,
      });
      if (res.success && res.data?.content) {
        set({
          billersCode,
          verifyData: res.data.content,
          isVerifying: false,
          verifyError: null,
        });
        return true;
      } else {
        set({
          verifyError: res.message ?? "Verification failed",
          isVerifying: false,
        });
        return false;
      }
    } catch (e) {
      set({ verifyError: getErrorMessage(e), isVerifying: false });
      return false;
    }
  },

  clearVerify: () =>
    set({ billersCode: "", verifyData: null, verifyError: null }),

  reset: () => set(initialState),
    }),
    createPersistConfig<EducationStore>("education-variations", {
      version: PROVIDER_CACHE_VERSION,
      partialize: (state) => ({
        variationsByProduct: state.variationsByProduct,
        variationsFetchedAt: state.variationsFetchedAt,
      }),
    }),
  ),
);

export const useEducationStore = createSelectors(_useEducationStore);
