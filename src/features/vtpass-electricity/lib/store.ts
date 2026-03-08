import { create } from "zustand";

import { createSelectors } from "@/store/create-selectors";
import {
  fetchElectricityServiceIds,
  verifyElectricityMeter,
} from "@/api";
import type {
  ElectricityServiceItem,
  ElectricityVerifyContent,
  MeterType,
} from "@/types/vtpass-electricity";

interface ElectricityState {
  providers: ElectricityServiceItem[];
  selectedProvider: ElectricityServiceItem | null;
  meterType: MeterType;

  billersCode: string;
  verifyData: ElectricityVerifyContent | null;
  isVerifying: boolean;
  verifyError: string | null;

  isLoadingProviders: boolean;
  providersError: string | null;
}

interface ElectricityActions {
  fetchProviders: (forceRefresh?: boolean) => Promise<void>;
  setSelectedProvider: (p: ElectricityServiceItem | null) => void;
  setMeterType: (t: MeterType) => void;
  verifyMeter: (
    billersCode: string,
    serviceID: string,
    type: MeterType,
  ) => Promise<boolean>;
  clearVerify: () => void;
  reset: () => void;
}

type ElectricityStore = ElectricityState & ElectricityActions;

const initialState: ElectricityState = {
  providers: [],
  selectedProvider: null,
  meterType: "prepaid",

  billersCode: "",
  verifyData: null,
  isVerifying: false,
  verifyError: null,

  isLoadingProviders: false,
  providersError: null,
};

function getErrorMessage(e: unknown): string {
  const err = e as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return err?.response?.data?.message ?? err?.message ?? "Something went wrong";
}

const _useElectricityStore = create<ElectricityStore>()((set, get) => ({
  ...initialState,

  fetchProviders: async (forceRefresh = false) => {
    const { providers, isLoadingProviders } = get();
    if (isLoadingProviders) return;
    if (!forceRefresh && providers.length > 0) return;

    set({ isLoadingProviders: true, providersError: null });

    try {
      const res = await fetchElectricityServiceIds();
      if (res.success && res.data?.length) {
        set({
          providers: res.data,
          isLoadingProviders: false,
          providersError: null,
        });
      } else {
        set({
          providersError:
            (res as { message?: string }).message ?? "Failed to load providers",
          isLoadingProviders: false,
        });
      }
    } catch (e) {
      set({ providersError: getErrorMessage(e), isLoadingProviders: false });
    }
  },

  setSelectedProvider: (p) =>
    set({
      selectedProvider: p,
      billersCode: "",
      verifyData: null,
      verifyError: null,
    }),

  setMeterType: (t) =>
    set({
      meterType: t,
      billersCode: "",
      verifyData: null,
      verifyError: null,
    }),

  verifyMeter: async (billersCode, serviceID, type) => {
    set({ isVerifying: true, verifyError: null, verifyData: null });

    try {
      const res = await verifyElectricityMeter({ billersCode, serviceID, type });

      if (res.data?.content?.WrongBillersCode) {
        set({
          verifyError: "Invalid meter number. Please check and try again.",
          isVerifying: false,
        });
        return false;
      }

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
}));

export const useElectricityStore = createSelectors(_useElectricityStore);
