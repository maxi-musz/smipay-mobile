import { useEffect, useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import {
  ElectricityHeader,
  WalletBalanceCard,
  DiscoSelector,
  MeterTypePicker,
  MeterInput,
  CustomerInfoCard,
} from "@/features/vtpass-electricity/components";
import { useElectricityStore } from "@/features/vtpass-electricity/lib/store";
import { useHomepageStore } from "@/store";
import { FullPageLoader } from "@/components/ui/loaders";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import type { ElectricityServiceItem, MeterType } from "@/types/vtpass-electricity";

export default function ElectricityIndexScreen() {
  const homepageData = useHomepageStore.use.data();
  const walletBalance =
    homepageData?.wallet_card?.current_balance ?? "₦0.00";
  const cashbackBalance =
    homepageData?.cashback_wallet?.current_balance ?? "₦0.00";
  const hasCashback =
    !!cashbackBalance &&
    cashbackBalance !== "₦0.00" &&
    cashbackBalance !== "₦0" &&
    cashbackBalance !== "";

  const providers = useElectricityStore.use.providers();
  const selectedProvider = useElectricityStore.use.selectedProvider();
  const meterType = useElectricityStore.use.meterType();
  const verifyData = useElectricityStore.use.verifyData();
  const isVerifying = useElectricityStore.use.isVerifying();
  const verifyError = useElectricityStore.use.verifyError();
  const isLoadingProviders = useElectricityStore.use.isLoadingProviders();
  const providersError = useElectricityStore.use.providersError();
  const fetchProviders = useElectricityStore.use.fetchProviders();
  const setSelectedProvider = useElectricityStore.use.setSelectedProvider();
  const setMeterType = useElectricityStore.use.setMeterType();
  const verifyMeter = useElectricityStore.use.verifyMeter();
  const clearVerify = useElectricityStore.use.clearVerify();

  const [meterNumber, setMeterNumber] = useState("");
  const [inputError, setInputError] = useState<string | undefined>();

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  useEffect(() => {
    if (providers.length > 0 && !selectedProvider) {
      setSelectedProvider(providers[0]);
    }
  }, [providers, selectedProvider, setSelectedProvider]);

  function handleSelectProvider(provider: ElectricityServiceItem) {
    setSelectedProvider(provider);
    setMeterNumber("");
    setInputError(undefined);
  }

  function handleSelectMeterType(type: MeterType) {
    setMeterType(type);
    setMeterNumber("");
    setInputError(undefined);
  }

  async function handleVerify() {
    if (!selectedProvider) return;
    if (meterNumber.trim().length < 7) {
      setInputError("Please enter a valid meter number");
      return;
    }
    setInputError(undefined);
    await verifyMeter(
      meterNumber.trim(),
      selectedProvider.serviceID,
      meterType,
    );
  }

  function handleClearAndRetry() {
    setMeterNumber("");
    setInputError(undefined);
    clearVerify();
  }

  function handleContinue() {
    router.push("/(app)/vtpass/electricity/purchase");
  }

  const verified = !!verifyData;

  if (isLoadingProviders && providers.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <ElectricityHeader />
        <View className="flex-1">
          <FullPageLoader message="Loading providers…" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ElectricityHeader />

      <KeyboardAwareScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-10"
      >
        <WalletBalanceCard
          walletBalance={walletBalance}
          cashbackBalance={cashbackBalance}
          hasCashback={hasCashback}
        />

        <DiscoSelector
          providers={providers}
          selectedServiceID={selectedProvider?.serviceID ?? null}
          onSelect={handleSelectProvider}
          error={providersError}
          onRetry={() => fetchProviders(true)}
        />

        {selectedProvider && (
          <>
            <MeterTypePicker
              selected={meterType}
              onSelect={handleSelectMeterType}
            />

            <Animated.View
              entering={FadeInDown.delay(100).duration(300)}
              className="mt-6"
            >
              <MeterInput
                value={meterNumber}
                onChangeText={(t) => {
                  setMeterNumber(t);
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

            {/* Post-verification */}
            {verified && verifyData && (
              <>
                <CustomerInfoCard content={verifyData} />

                <Animated.View
                  entering={FadeInDown.delay(100).duration(300)}
                  className="mt-8"
                >
                  <Button
                    size="lg"
                    className="w-full rounded-xl"
                    onPress={handleContinue}
                  >
                    <Text className="text-base font-semibold text-white">
                      Continue
                    </Text>
                  </Button>
                </Animated.View>
              </>
            )}
          </>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
