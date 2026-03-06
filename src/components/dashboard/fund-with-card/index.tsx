import { useEffect, useState } from "react";
import { View } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { initialisePaystackFunding, cancelPaystackFunding } from "@/api";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Spinner } from "@/components/ui/loaders";
import { handleApiError } from "@/lib/errors";
import {
  setPendingFundingReference,
  clearPendingFundingReference,
} from "@/lib/pending-funding";
import { useFundingResultSheetStore } from "@/store";
import { BottomSheetModal } from "@/components/ui/modals";

import { AmountStep } from "./amount-step";
import { PAYSTACK_FUNDING_CALLBACK_URL } from "./constants";

type Step = "amount" | "redirecting";

interface FundWithCardFlowProps {
  visible: boolean;
  onClose: () => void;
}

export function FundWithCardFlow({ visible, onClose }: FundWithCardFlowProps) {
  const [step, setStep] = useState<Step>("amount");
  const [loading, setLoading] = useState(false);
  const [pendingRef, setPendingRef] = useState<string | null>(null);

  async function handleContinue(amount: number) {
    setLoading(true);
    let reference: string | null = null;
    try {
      const response = await initialisePaystackFunding(
        amount,
        PAYSTACK_FUNDING_CALLBACK_URL,
      );
      if (!response.success || !response.data) {
        handleApiError(new Error(response.message ?? "Failed to start payment"));
        return;
      }
      const { authorization_url } = response.data;
      reference = response.data.reference;
      await setPendingFundingReference(reference);
      setPendingRef(reference);
      setStep("redirecting");
      setLoading(false);

      if (__DEV__) {
        console.log("[FundWithCard] callback URL:", PAYSTACK_FUNDING_CALLBACK_URL);
      }

      const result = await WebBrowser.openAuthSessionAsync(
        authorization_url,
        PAYSTACK_FUNDING_CALLBACK_URL,
        { preferEphemeralSession: true },
      );

      if (__DEV__) {
        console.log("[FundWithCard] browser result:", JSON.stringify(result));
      }

      // Browser closed (redirect, manual dismiss, or cancel).
      // Close the funding modal first, then delay before opening the result
      // sheet so React Native's Modal system fully unmounts the first modal
      // before mounting the second. Without this delay the touch system freezes.
      clearPendingFundingReference().catch(() => {});
      onClose();
      if (reference) {
        const ref = reference;
        setTimeout(() => {
          useFundingResultSheetStore.getState().setFunding(ref, amount);
        }, 400);
      }
    } catch (e) {
      handleApiError(e);
      if (reference) {
        clearPendingFundingReference().catch(() => {});
        onClose();
        const ref = reference;
        setTimeout(() => {
          useFundingResultSheetStore.getState().setFunding(ref, amount);
        }, 400);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (step === "redirecting" && pendingRef) {
      // Non-blocking cancel so modal closes immediately
      cancelPaystackFunding(pendingRef).catch(() => {});
      clearPendingFundingReference().catch(() => {});
      setPendingRef(null);
    }
    setStep("amount");
    onClose();
  }

  useEffect(() => {
    if (!visible) {
      setStep("amount");
      setPendingRef(null);
    }
  }, [visible]);

  return (
    <BottomSheetModal
      visible={visible}
      onClose={handleBack}
      title={step === "amount" ? "Fund with Card" : undefined}
      closeOnBackdrop={step === "amount"}
      showHandle
    >
      {step === "amount" ? (
        <AmountStep
          onContinue={handleContinue}
          onBack={onClose}
          isLoading={loading}
        />
      ) : (
        <View className="items-center gap-4 py-6">
          <Spinner size="large" color="#F58220" />
          <Text className="text-center text-sm text-muted-foreground">
            Redirecting to Paystack…
          </Text>
          <Text className="text-center text-xs text-muted-foreground">
            Complete payment in the window above, then return here.
          </Text>
          <Button
            variant="outline"
            className="mt-2 h-11 rounded-2xl"
            onPress={handleBack}
          >
            <Text className="text-sm font-medium text-foreground">
              I didn't complete payment
            </Text>
          </Button>
        </View>
      )}
    </BottomSheetModal>
  );
}
