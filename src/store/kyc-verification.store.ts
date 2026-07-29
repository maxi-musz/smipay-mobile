import { create } from "zustand";

import {
  fetchKycVerificationStatus,
  requestPhoneVerificationOtp,
  verifyPhoneVerificationOtp,
  updatePhoneVerificationNumber,
} from "@/api";
import type {
  KycVerificationStatusData,
  RequestPhoneOtpData,
} from "@/types/kyc-verification";
import { createSelectors } from "./create-selectors";

interface KycVerificationState {
  data: KycVerificationStatusData | null;
  isLoading: boolean;
  error: string | null;
}

interface KycVerificationActions {
  fetchStatus: () => Promise<void>;
  refreshStatusSilently: () => Promise<void>;
  requestPhoneOtp: () => Promise<RequestPhoneOtpData | null>;
  updatePhoneNumber: (phoneNumber: string) => Promise<KycVerificationStatusData>;
  verifyPhoneOtp: (otp: string) => Promise<KycVerificationStatusData>;
  reset: () => void;
}

type KycVerificationStore = KycVerificationState & KycVerificationActions;

const initialState: KycVerificationState = {
  data: null,
  isLoading: false,
  error: null,
};

const _useKycVerificationStore = create<KycVerificationStore>()((set, get) => ({
  ...initialState,

  fetchStatus: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const response = await fetchKycVerificationStatus();
      set({ data: response.data, isLoading: false, error: null });
    } catch {
      set({
        isLoading: false,
        error: "Failed to load verification status",
      });
    }
  },

  refreshStatusSilently: async () => {
    try {
      const response = await fetchKycVerificationStatus();
      set({ data: response.data, error: null });
    } catch {
      // Silent failure — homepage and profile continue to work
    }
  },

  requestPhoneOtp: async () => {
    const response = await requestPhoneVerificationOtp();
    return response.data;
  },

  updatePhoneNumber: async (phoneNumber: string) => {
    const response = await updatePhoneVerificationNumber(phoneNumber);
    set({ data: response.data, error: null });
    return response.data;
  },

  verifyPhoneOtp: async (otp: string) => {
    const response = await verifyPhoneVerificationOtp(otp);
    set({ data: response.data, error: null });
    return response.data;
  },

  reset: () => set(initialState),
}));

export const useKycVerificationStore = createSelectors(_useKycVerificationStore);
