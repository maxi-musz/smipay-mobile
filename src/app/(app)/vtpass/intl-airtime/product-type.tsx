import { useEffect } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { IntlAirtimeHeader, ProductTypePicker } from "@/features/vtpass-intl-airtime/components";
import { useIntlAirtimeStore } from "@/features/vtpass-intl-airtime/lib/store";
import type { IntlProductType } from "@/types/vtpass-intl-airtime";
import { FullPageLoader } from "@/components/ui/loaders";

export default function IntlAirtimeProductTypeScreen() {
  const selectedCountry = useIntlAirtimeStore.use.selectedCountry();
  const productTypes = useIntlAirtimeStore.use.productTypes();
  const loadingProductTypes = useIntlAirtimeStore.use.isLoadingProductTypes();
  const productTypesError = useIntlAirtimeStore.use.productTypesError();
  const fetchProductTypes = useIntlAirtimeStore.use.fetchProductTypes();
  const setSelectedProductType = useIntlAirtimeStore.use.setSelectedProductType();
  const fetchOperators = useIntlAirtimeStore.use.fetchOperators();

  useEffect(() => {
    if (!selectedCountry) {
      router.replace("/(app)/vtpass/intl-airtime");
      return;
    }
    if (productTypes.length === 0 && !loadingProductTypes && !productTypesError) {
      fetchProductTypes(selectedCountry.code);
    }
  }, [selectedCountry, productTypes.length, loadingProductTypes, productTypesError, fetchProductTypes]);

  function handleSelect(pt: IntlProductType) {
    if (!selectedCountry) return;
    setSelectedProductType(pt);
    fetchOperators(selectedCountry.code, String(pt.product_type_id));
    router.push("/(app)/vtpass/intl-airtime/operator");
  }

  if (!selectedCountry) return null;

  if (loadingProductTypes && productTypes.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <IntlAirtimeHeader title="Product type" />
        <View className="flex-1">
          <FullPageLoader message="Loading product types…" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <IntlAirtimeHeader title="Product type" />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-10"
      >
        <ProductTypePicker
          productTypes={productTypes}
          selectedId={null}
          onSelect={handleSelect}
          loading={loadingProductTypes}
          error={productTypesError}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
