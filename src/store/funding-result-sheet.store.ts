import { create } from "zustand";

interface FundingResultSheetState {
  /** When set, the funding result sheet is shown and will verify this reference. */
  reference: string | null;
  /** The amount the user was trying to fund, for display in cancel/fail messages. */
  amount: number | null;
  setFunding: (reference: string, amount?: number | null) => void;
  clear: () => void;
}

export const useFundingResultSheetStore = create<FundingResultSheetState>()(
  (set) => ({
    reference: null,
    amount: null,
    setFunding: (reference, amount = null) => set({ reference, amount }),
    clear: () => set({ reference: null, amount: null }),
  }),
);
