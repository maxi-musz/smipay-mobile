import { verifyPaystackFunding } from "@/api";
import { useToastStore } from "@/components/ui/toast/toast-store";
import { logFundingSuccess } from "@/lib/analytics";
import { handleApiError } from "@/lib/errors";
import {
  getPendingFundingReference,
  clearPendingFundingReference,
} from "@/lib/pending-funding";
import { suppressFundingPush } from "@/lib/push-notifications";
import { useHomepageStore } from "@/store";
import type { VerifyPaystackSuccessData } from "@/types/banking";

export type FundingVerifyResult =
  | { status: "success"; balance_after: string }
  | { status: "cancelled" }
  | { status: "failed" }
  | { status: "error"; message: string };

/**
 * Verifies a funding reference and returns the result. Does not show toasts or refresh.
 * Use this when you want to show the result in a bottom sheet.
 */
export async function verifyFundingAndGetResult(
  reference: string,
): Promise<FundingVerifyResult> {
  suppressFundingPush(reference);
  try {
    const response = await verifyPaystackFunding(reference);
    await clearPendingFundingReference();
    const data = response.data;

    if (response.success && data && "balance_after" in data) {
      const successData = data as VerifyPaystackSuccessData;
      void logFundingSuccess('paystack', parseFloat(successData.amount));
      return { status: "success", balance_after: successData.balance_after };
    }

    const status = data && "status" in data ? data.status : null;
    if (status === "cancelled") return { status: "cancelled" };
    if (status === "failed") return { status: "failed" };

    return {
      status: "error",
      message: response.message ?? "Something went wrong.",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verification failed.";
    return { status: "error", message };
  }
}

export interface VerifyFundingResultOptions {
  onCloseModal?: () => void;
  /** If provided, use this instead of reading from storage (caller must have cleared storage already). */
  reference?: string | null;
}

/**
 * Fetches pending funding reference (or uses provided one), calls verify API, then handles the
 * response (toasts, refresh homepage, close modal). Used when the user
 * returns from the payment browser (in-app or external).
 */
export async function verifyPendingFundingAndHandleResult(
  options: VerifyFundingResultOptions = {},
): Promise<boolean> {
  const { onCloseModal, reference: refOption } = options;
  const reference = refOption ?? (await getPendingFundingReference());
  if (!reference) return false;

  suppressFundingPush(reference);

  try {
    const response = await verifyPaystackFunding(reference);
    await clearPendingFundingReference();
    const data = response.data;
    const show = useToastStore.getState().show;

    if (response.success && data && "balance_after" in data) {
      const successData = data as VerifyPaystackSuccessData;
      void logFundingSuccess('paystack', parseFloat(successData.amount));
      show({
        variant: "success",
        title: "Wallet funded",
        message: `New balance: ${successData.balance_after}`,
      });
      // Defer so modal close / UI update isn't blocked by refetch
      setTimeout(() => useHomepageStore.getState().fetchHomepage(), 0);
      onCloseModal?.();
      return true;
    }

    const status = data && "status" in data ? data.status : null;
    if (status === "cancelled") {
      show({
        variant: "info",
        title: "Payment cancelled",
        message: "You cancelled the payment.",
      });
      setTimeout(() => useHomepageStore.getState().fetchHomepage(), 0);
      onCloseModal?.();
      return true;
    }

    if (status === "failed") {
      show({
        variant: "error",
        title: "Payment failed",
        message: "Please try again or use a different card.",
      });
      setTimeout(() => useHomepageStore.getState().fetchHomepage(), 0);
      onCloseModal?.();
      return true;
    }

    show({
      variant: "error",
      title: "Payment",
      message: response.message ?? "Something went wrong.",
    });
    setTimeout(() => useHomepageStore.getState().fetchHomepage(), 0);
    onCloseModal?.();
  } catch (e) {
    handleApiError(e);
  }
  return true;
}
