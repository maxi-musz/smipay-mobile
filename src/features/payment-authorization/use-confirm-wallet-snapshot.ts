import { useCallback, useState } from "react";

import { fetchUserWallet } from "@/api";
import { ApiClientError } from "@/lib/api";

export type ConfirmWalletSnapshot = {
  wallet: string;
  cashback: string;
};

/** Fresh wallet/cashback for VTpass checkout confirmation (aligned with homepage airtime master). */
export function useConfirmWalletSnapshot() {
  const [snapshot, setSnapshot] = useState<ConfirmWalletSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setSnapshot(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetchUserWallet();
      if (!res.success || !res.data) {
        setError(res.message ?? "Could not load your wallet. Try again.");
        setSnapshot(null);
        return;
      }
      const cashback =
        res.data.cashback_wallet?.current_balance ?? "₦0.00";
      setSnapshot({
        wallet: res.data.wallet.current_balance,
        cashback,
      });
    } catch (e) {
      const message =
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not load your wallet. Try again.";
      setError(message);
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSnapshot(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    snapshot,
    loading,
    error,
    refresh,
    reset,
  };
}
