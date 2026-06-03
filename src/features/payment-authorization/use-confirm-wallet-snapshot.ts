import { useCallback } from "react";

import { useHomepageStore } from "@/store";

export type ConfirmWalletSnapshot = {
  wallet: string;
  cashback: string;
};

/**
 * Wallet/cashback for VTpass checkout confirmation.
 *
 * Reads straight from the dashboard store (`useHomepageStore`) — which is loaded
 * before any purchase screen is reachable, kept live on credits via the
 * `wallet_credited` socket, and re-fetched after every successful purchase — so
 * the confirm sheet shows the balance instantly with no extra backend call.
 * The purchase request itself remains the server-side source of truth, so this
 * pre-check is purely advisory.
 */
export function useConfirmWalletSnapshot() {
  const data = useHomepageStore.use.data();

  const snapshot: ConfirmWalletSnapshot | null = data
    ? {
        wallet: data.wallet_card?.current_balance ?? "₦0.00",
        cashback: data.cashback_wallet?.current_balance ?? "₦0.00",
      }
    : null;

  // No-ops: the dashboard store is the live source; there is nothing to fetch
  // or reset here. Kept so callers' existing wiring stays unchanged.
  const refresh = useCallback(async () => {}, []);
  const reset = useCallback(() => {}, []);

  return {
    snapshot,
    loading: false as const,
    error: null as string | null,
    refresh,
    reset,
  };
}
