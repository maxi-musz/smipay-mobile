import { useEffect } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { IntlAirtimeHeader, VariationPicker } from "@/features/vtpass-intl-airtime/components";
import { useIntlAirtimeStore } from "@/features/vtpass-intl-airtime/lib/store";
import type { IntlVariation } from "@/types/vtpass-intl-airtime";
import { FullPageLoader } from "@/components/ui/loaders";

export default function IntlAirtimeVariationScreen() {
  const selectedCountry = useIntlAirtimeStore.use.selectedCountry();
  const selectedProductType = useIntlAirtimeStore.use.selectedProductType();
  const selectedOperator = useIntlAirtimeStore.use.selectedOperator();
  const variations = useIntlAirtimeStore.use.variations();
  const loadingVariations = useIntlAirtimeStore.use.isLoadingVariations();
  const variationsError = useIntlAirtimeStore.use.variationsError();
  const fetchVariations = useIntlAirtimeStore.use.fetchVariations();
  const setSelectedVariation = useIntlAirtimeStore.use.setSelectedVariation();

  useEffect(() => {
    if (!selectedOperator || !selectedProductType) {
      router.replace("/(app)/vtpass/intl-airtime");
      return;
    }
    if (variations.length === 0 && !loadingVariations && !variationsError) {
      fetchVariations(
        selectedOperator.operator_id,
        String(selectedProductType.product_type_id),
      );
    }
  }, [
    selectedOperator,
    selectedProductType,
    variations.length,
    loadingVariations,
    variationsError,
    fetchVariations,
  ]);

  function handleSelect(v: IntlVariation) {
    setSelectedVariation(v);
    router.push("/(app)/vtpass/intl-airtime/amount");
  }

  if (!selectedOperator || !selectedProductType) return null;

  if (loadingVariations && variations.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <IntlAirtimeHeader title="Select plan" />
        <View className="flex-1">
          <FullPageLoader message="Loading plans…" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <IntlAirtimeHeader title="Select plan" />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-10"
      >
        <VariationPicker
          variations={variations}
          selectedCode={null}
          onSelect={handleSelect}
          loading={loadingVariations}
          error={variationsError}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
