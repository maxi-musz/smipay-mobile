import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import {
  CableHeader,
  SmartcardInput,
  CustomerInfoCard,
  SubscriptionTypePicker,
} from "@/features/vtpass-cable/components";
import {
  getProviderTraits,
  formatNaira,
} from "@/features/vtpass-cable/lib/constants";
import { useCableStore } from "@/features/vtpass-cable/lib/store";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  isDstvGotvContent,
  type CableVerifyContentDstvGotv,
  type CableSubscriptionType,
} from "@/types/vtpass-cable";

export default function CableSmartcardScreen() {
  const selectedProvider = useCableStore.use.selectedProvider();
  const selectedVariation = useCableStore.use.selectedVariation();
  const verifyData = useCableStore.use.verifyData();
  const isVerifying = useCableStore.use.isVerifying();
  const verifyError = useCableStore.use.verifyError();
  const subscriptionType = useCableStore.use.subscriptionType();
  const verifySmartcard = useCableStore.use.verifySmartcard();
  const setSubscriptionType = useCableStore.use.setSubscriptionType();
  const clearVerify = useCableStore.use.clearVerify();

  const [billersCode, setBillersCode] = useState("");
  const [inputError, setInputError] = useState<string | undefined>();

  useEffect(() => {
    if (!selectedProvider || !selectedVariation) {
      router.replace("/(app)/vtpass/cable");
    }
  }, [selectedProvider, selectedVariation]);

  if (!selectedProvider || !selectedVariation) return null;

  const traits = getProviderTraits(selectedProvider.serviceID);
  const requiresSubType = traits.requiresSubscriptionType;

  const verified = !!verifyData;

  const dstvGotvData =
    verified && verifyData && isDstvGotvContent(verifyData)
      ? (verifyData as CableVerifyContentDstvGotv)
      : null;

  const renewalAmount = dstvGotvData?.Renewal_Amount
    ? parseFloat(dstvGotvData.Renewal_Amount)
    : 0;
  const currentBouquet = dstvGotvData?.Current_Bouquet ?? "";

  const canProceed = requiresSubType
    ? verified && !!subscriptionType
    : verified;

  async function handleVerify() {
    if (!selectedProvider) return;
    if (billersCode.trim().length < 7) {
      setInputError("Please enter a valid number");
      return;
    }
    setInputError(undefined);
    const success = await verifySmartcard(
      billersCode.trim(),
      selectedProvider.serviceID,
    );

    if (success && traits.requiresSubscriptionType) {
      setSubscriptionType("renew");
    }
  }

  function handleClearAndRetry() {
    setBillersCode("");
    setInputError(undefined);
    clearVerify();
  }

  function handleContinue() {
    router.push("/(app)/vtpass/cable/purchase");
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <CableHeader showMainTitle={false} title="Verify Account" />

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        {/* Selected plan summary */}
        <Animated.View
          entering={FadeInDown.duration(300)}
          className="mt-4"
        >
          <View className="mb-2 rounded-xl border border-border bg-card px-4 py-3">
            <Text className="text-xs text-muted-foreground">
              Selected plan
            </Text>
            <Text
              className="mt-1 text-[15px] font-semibold text-foreground"
              numberOfLines={2}
            >
              {selectedVariation.name}
            </Text>
            {parseFloat(selectedVariation.variation_amount) > 0 && (
              <Text
                className="mt-1 text-sm font-bold"
                style={{ color: "#F58220" }}
              >
                {formatNaira(parseFloat(selectedVariation.variation_amount))}
              </Text>
            )}
          </View>
        </Animated.View>

        {/* Smartcard / account number input + verify button */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          className="mt-6"
        >
          <SmartcardInput
            serviceID={selectedProvider.serviceID}
            value={billersCode}
            onChangeText={(t) => {
              setBillersCode(t);
              if (inputError) setInputError(undefined);
              if (verifyError) clearVerify();
            }}
            onClear={handleClearAndRetry}
            onVerify={handleVerify}
            isVerifying={isVerifying}
            verified={verified}
            error={inputError ?? verifyError ?? undefined}
          />
        </Animated.View>

        {/* ── Post-verification section (only shows after successful verify) ── */}
        {verified && verifyData && (
          <>
            <CustomerInfoCard
              content={verifyData}
              serviceID={selectedProvider.serviceID}
            />

            {requiresSubType && (
              <SubscriptionTypePicker
                selected={subscriptionType}
                onSelect={(t: CableSubscriptionType) => setSubscriptionType(t)}
                renewalAmount={renewalAmount}
                currentBouquet={currentBouquet}
                selectedBouquetName={selectedVariation.name}
              />
            )}

            <Animated.View
              entering={FadeInDown.delay(100).duration(300)}
              className="mt-8"
            >
              <Button
                size="lg"
                className="w-full rounded-xl"
                onPress={handleContinue}
                disabled={!canProceed}
              >
                <Text className="text-base font-semibold text-white">
                  Continue
                </Text>
              </Button>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
