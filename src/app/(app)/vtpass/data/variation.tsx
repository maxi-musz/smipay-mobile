import { useEffect, useMemo } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { DataHeader, VariationPicker } from "@/features/vtpass-data/components";
import {
  isDataPlanAffordable,
  parseBalanceToNumber,
} from "@/features/vtpass-data/lib/constants";
import { useDataStore } from "@/features/vtpass-data/lib/store";
import { useHomepageStore } from "@/store";
import { FullPageLoader } from "@/components/ui/loaders";
import type { DataVariation } from "@/types/vtpass-data";

export default function DataVariationScreen() {
  const homepageData = useHomepageStore.use.data();
  const walletBalance =
    homepageData?.wallet_card?.current_balance ?? "₦0.00";
  const cashbackBalance =
    homepageData?.cashback_wallet?.current_balance ?? "₦0.00";
  const maxPayable = useMemo(
    () =>
      parseBalanceToNumber(walletBalance) +
      parseBalanceToNumber(cashbackBalance),
    [walletBalance, cashbackBalance],
  );

  const selectedProvider = useDataStore.use.selectedProvider();
  const variationsCategorized = useDataStore.use.variationsCategorized();
  const variations = useDataStore.use.variations();
  const isLoadingVariations = useDataStore.use.isLoadingVariations();
  const variationsError = useDataStore.use.variationsError();
  const fetchVariationCodes = useDataStore.use.fetchVariationCodes();
  const setSelectedVariation = useDataStore.use.setSelectedVariation();

  useEffect(() => {
    if (!selectedProvider) {
      router.replace("/(app)/vtpass/data");
      return;
    }
    if (
      variations.length === 0 &&
      Object.keys(variationsCategorized).length === 0 &&
      !isLoadingVariations &&
      !variationsError
    ) {
      fetchVariationCodes(selectedProvider.serviceID);
    }
  }, [
    selectedProvider,
    variations.length,
    Object.keys(variationsCategorized).length,
    isLoadingVariations,
    variationsError,
    fetchVariationCodes,
  ]);

  function handleSelect(v: DataVariation) {
    if (!isDataPlanAffordable(v, maxPayable)) return;
    setSelectedVariation(v);
    router.push("/(app)/vtpass/data/amount");
  }

  if (!selectedProvider) return null;

  if (isLoadingVariations && variations.length === 0 && Object.keys(variationsCategorized).length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <DataHeader title="Select plan" />
        <View className="flex-1">
          <FullPageLoader message="Loading plans…" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <DataHeader title="Select plan" />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-10"
      >
        <VariationPicker
          variationsCategorized={variationsCategorized}
          selectedCode={null}
          maxPayable={maxPayable}
          onSelect={handleSelect}
          loading={isLoadingVariations}
          error={variationsError}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
