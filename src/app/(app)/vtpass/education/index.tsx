import { useEffect } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import {
  EducationHeader,
  WalletBalanceCard,
  ProductSelector,
  VariationList,
} from "@/features/vtpass-education/components";
import {
  getProductTraits,
  type EducationProduct,
} from "@/features/vtpass-education/lib/constants";
import { useEducationStore } from "@/features/vtpass-education/lib/store";
import { useHomepageStore } from "@/store";
import { Text } from "@/components/ui/text";
import type { EducationVariation } from "@/types/vtpass-education";

export default function EducationIndexScreen() {
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

  const selectedProduct = useEducationStore.use.selectedProduct();
  const variations = useEducationStore.use.variations();
  const isLoadingVariations = useEducationStore.use.isLoadingVariations();
  const variationsError = useEducationStore.use.variationsError();
  const setSelectedProduct = useEducationStore.use.setSelectedProduct();
  const setSelectedVariation = useEducationStore.use.setSelectedVariation();
  const fetchVariations = useEducationStore.use.fetchVariations();

  useEffect(() => {
    if (!selectedProduct) {
      setSelectedProduct("waec-registration");
    }
  }, [selectedProduct, setSelectedProduct]);

  useEffect(() => {
    if (selectedProduct) {
      fetchVariations(selectedProduct);
    }
  }, [selectedProduct, fetchVariations]);

  function handleSelectProduct(product: EducationProduct) {
    setSelectedProduct(product.serviceID);
  }

  function handleSelectPlan(plan: EducationVariation) {
    if (!selectedProduct) return;
    setSelectedVariation(plan);

    const traits = getProductTraits(selectedProduct);
    if (traits.hasVerify) {
      router.push("/(app)/vtpass/education/verify");
    } else {
      router.push("/(app)/vtpass/education/purchase");
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <EducationHeader />

      <ScrollView
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

        <ProductSelector
          selectedID={selectedProduct}
          onSelect={handleSelectProduct}
        />

        {selectedProduct && (
          <View className="mt-6">
            <Text className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Select plan
            </Text>
            {isLoadingVariations && variations.length === 0 ? (
              <View className="rounded-xl bg-muted/30 px-4 py-8">
                <Text className="text-center text-sm text-muted-foreground">
                  Loading plans…
                </Text>
              </View>
            ) : (
              <VariationList
                variations={variations}
                onSelect={handleSelectPlan}
                loading={isLoadingVariations}
                error={variationsError}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
