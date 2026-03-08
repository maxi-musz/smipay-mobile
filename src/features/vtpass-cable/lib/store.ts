import { create } from "zustand";

import { createSelectors } from "@/store/create-selectors";
import {
  fetchCableServiceIds,
  fetchCableVariationCodes,
  verifyCableSmartcard,
} from "@/api";
import type {
  CableServiceItem,
  CableVariation,
  CableVerifyContent,
  CableSubscriptionType,
} from "@/types/vtpass-cable";

interface CachedVariations {
  variations: CableVariation[];
}

interface CableState {
  providers: CableServiceItem[];
  variations: CableVariation[];
  variationsByProvider: Record<string, CachedVariations>;

  selectedProvider: CableServiceItem | null;
  selectedVariation: CableVariation | null;

  /** The smartcard / account number entered by the user on the verify screen. */
  billersCode: string;
  verifyData: CableVerifyContent | null;
  isVerifying: boolean;
  verifyError: string | null;

  /** DSTV/GOTV: "renew" or "change". null for Startimes/Showmax. */
  subscriptionType: CableSubscriptionType | null;

  isLoadingProviders: boolean;
  isLoadingVariations: boolean;

  providersError: string | null;
  variationsError: string | null;
}

interface CableActions {
  fetchProviders: (forceRefresh?: boolean) => Promise<void>;
  fetchVariationCodes: (serviceID: string, forceRefresh?: boolean) => Promise<void>;
  verifySmartcard: (billersCode: string, serviceID: string) => Promise<boolean>;
  setSelectedProvider: (p: CableServiceItem | null) => void;
  setSelectedVariation: (v: CableVariation | null) => void;
  setSubscriptionType: (t: CableSubscriptionType | null) => void;
  clearVerify: () => void;
  reset: () => void;
}

type CableStore = CableState & CableActions;

const initialState: CableState = {
  providers: [],
  variations: [],
  variationsByProvider: {},

  selectedProvider: null,
  selectedVariation: null,

  billersCode: "",
  verifyData: null,
  isVerifying: false,
  verifyError: null,

  subscriptionType: null,

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

const _useCableStore = create<CableStore>()((set, get) => ({
  ...initialState,

  fetchProviders: async (forceRefresh = false) => {
    const { providers, isLoadingProviders } = get();
    if (isLoadingProviders) return;
    if (!forceRefresh && providers.length > 0) return;

    set({ isLoadingProviders: true, providersError: null });

    try {
      const res = await fetchCableServiceIds();
      if (res.success && res.data?.length) {
        set({ providers: res.data, isLoadingProviders: false, providersError: null });
      } else {
        set({
          providersError: (res as { message?: string }).message ?? "Failed to load providers",
          isLoadingProviders: false,
        });
      }
    } catch (e) {
      set({ providersError: getErrorMessage(e), isLoadingProviders: false });
    }
  },

  fetchVariationCodes: async (serviceID: string, forceRefresh = false) => {
    const { isLoadingVariations, variationsByProvider } = get();
    if (isLoadingVariations) return;

    const cached = variationsByProvider[serviceID];
    if (!forceRefresh && cached) {
      set({ variations: cached.variations, variationsError: null });
      return;
    }

    set({ isLoadingVariations: true, variationsError: null, variations: [] });

    try {
      const res = await fetchCableVariationCodes(serviceID);
      if (res.success && res.data) {
        const variations = res.data.variations ?? [];
        set((s) => ({
          variations,
          variationsByProvider: {
            ...s.variationsByProvider,
            [serviceID]: { variations },
          },
          isLoadingVariations: false,
          variationsError: null,
        }));
      } else {
        set({
          variationsError: (res as { message?: string }).message ?? "Failed to load plans",
          isLoadingVariations: false,
        });
      }
    } catch (e) {
      set({ variationsError: getErrorMessage(e), isLoadingVariations: false });
    }
  },

  verifySmartcard: async (billersCode: string, serviceID: string) => {
    set({ isVerifying: true, verifyError: null, verifyData: null });

    try {
      const res = await verifyCableSmartcard({ billersCode, serviceID });
      if (res.success && res.data?.content) {
        set({ billersCode, verifyData: res.data.content, isVerifying: false, verifyError: null });
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

  setSelectedProvider: (p) =>
    set((s) => {
      if (!p) {
        return {
          selectedProvider: null,
          selectedVariation: null,
          variations: [],
          billersCode: "",
          verifyData: null,
          verifyError: null,
          subscriptionType: null,
        };
      }
      const cached = s.variationsByProvider[p.serviceID];
      return {
        selectedProvider: p,
        selectedVariation: null,
        variations: cached?.variations ?? [],
        billersCode: "",
        verifyData: null,
        verifyError: null,
        subscriptionType: null,
      };
    }),

  setSelectedVariation: (v) => set({ selectedVariation: v }),

  setSubscriptionType: (t) => set({ subscriptionType: t }),

  clearVerify: () =>
    set({ billersCode: "", verifyData: null, verifyError: null, subscriptionType: null }),

  reset: () => set(initialState),
}));

export const useCableStore = createSelectors(_useCableStore);
