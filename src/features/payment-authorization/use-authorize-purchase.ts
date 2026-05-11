import { useCallback, useRef, useState } from "react";

import { verifyTransactionPin } from "@/api";
import { useAppStore } from "@/store";
import {
  authenticate,
  getBiometricLabel,
  getBiometricsAvailability,
} from "@/lib/biometrics";
import { ApiClientError } from "@/lib/api";

export type AuthorizePurchaseOptions = {
  /** Prompt shown during LocalAuthentication before payment. */
  biometricPromptMessage?: string;
};

type PendingAction = () => Promise<void>;

/**
 * Reusable checkout step-up: tries device biometrics when enabled (OPay-style),
 * otherwise shows PIN entry whose correctness is verified on the backend.
 *
 * Mount `<PaymentAuthorizationModal />` **after** any checkout `BottomSheetModal` in the
 * same screen so React Native stacks this `Modal` above the sheet (otherwise the PIN UI is hidden).
 * and wrap the purchase mutation in `runAuthorizedPurchase`.
 */
export function useAuthorizePurchase(options: AuthorizePurchaseOptions = {}) {
  const biometricsEnabled = useAppStore.use.biometricsEnabled();
  const promptMessage =
    options.biometricPromptMessage ?? "Authenticate to complete payment";

  const [paymentAuthVisible, setPaymentAuthVisible] = useState(false);
  /** True while biometric is running inline on Pay, or while verifying PIN via API */
  const [isStepUpBusy, setIsStepUpBusy] = useState(false);
  /** Modal only: user can retry biometrics after failure/cancel when true */
  const [showRetryBiometrics, setShowRetryBiometrics] = useState(false);

  const pendingActionRef = useRef<PendingAction | null>(null);

  const runAuthorizedPurchase = useCallback(
    async (onApproved: PendingAction): Promise<void> => {
      const availability = await getBiometricsAvailability();
      const biometricGate = biometricsEnabled && availability.available;

      if (biometricGate) {
        setIsStepUpBusy(true);
        try {
          const result = await authenticate({
            promptMessage,
            disableDeviceFallback: true,
          });
          if (result.success) {
            await onApproved();
            return;
          }
        } finally {
          setIsStepUpBusy(false);
        }

        pendingActionRef.current = onApproved;
        setShowRetryBiometrics(true);
        setPaymentAuthVisible(true);
        return;
      }

      pendingActionRef.current = onApproved;
      setShowRetryBiometrics(false);
      setPaymentAuthVisible(true);
    },
    [biometricsEnabled, promptMessage],
  );

  function closePaymentAuth() {
    if (isStepUpBusy) return;
    setPaymentAuthVisible(false);
    setShowRetryBiometrics(false);
    pendingActionRef.current = null;
  }

  const verifyPinOnly = useCallback(async (pin: string) => {
    setIsStepUpBusy(true);
    try {
      await verifyTransactionPin({ pin });
    } finally {
      setIsStepUpBusy(false);
    }
  }, []);

  const flushPendingAfterPinVerify = useCallback(async () => {
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    setPaymentAuthVisible(false);
    setShowRetryBiometrics(false);
    if (pending) await pending();
  }, []);

  const retryBiometrics = useCallback(async () => {
    const availability = await getBiometricsAvailability();
    const label = getBiometricLabel(availability);
    setIsStepUpBusy(true);
    try {
      const result = await authenticate({
        promptMessage: promptMessage.includes(label)
          ? promptMessage
          : `${promptMessage} with ${label}`,
        disableDeviceFallback: true,
      });
      if (result.success) {
        const pending = pendingActionRef.current;
        setPaymentAuthVisible(false);
        setShowRetryBiometrics(false);
        pendingActionRef.current = null;
        if (pending) await pending();
      }
    } finally {
      setIsStepUpBusy(false);
    }
  }, [promptMessage]);

  return {
    runAuthorizedPurchase,
    isStepUpBusy,
    paymentAuthorizationModalProps: {
      visible: paymentAuthVisible,
      onClose: closePaymentAuth,
      showRetryBiometrics,
      isBusy: isStepUpBusy,
      onVerifyPin: verifyPinOnly,
      onCompletePayment: flushPendingAfterPinVerify,
      onRetryBiometrics: retryBiometrics,
    },
  };
}

/** Map API errors into a concise message for PIN entry */
export function purchaseAuthPinErrorMessage(e: unknown): string {
  if (e instanceof ApiClientError && e.message) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return "Could not verify PIN. Try again.";
}
