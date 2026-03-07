import { useEffect } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { IntlAirtimeHeader, OperatorPicker } from "@/features/vtpass-intl-airtime/components";
import { useIntlAirtimeStore } from "@/features/vtpass-intl-airtime/lib/store";
import type { IntlOperator } from "@/types/vtpass-intl-airtime";
import { FullPageLoader } from "@/components/ui/loaders";

export default function IntlAirtimeOperatorScreen() {
  const selectedCountry = useIntlAirtimeStore.use.selectedCountry();
  const selectedProductType = useIntlAirtimeStore.use.selectedProductType();
  const operators = useIntlAirtimeStore.use.operators();
  const loadingOperators = useIntlAirtimeStore.use.isLoadingOperators();
  const operatorsError = useIntlAirtimeStore.use.operatorsError();
  const fetchOperators = useIntlAirtimeStore.use.fetchOperators();
  const setSelectedOperator = useIntlAirtimeStore.use.setSelectedOperator();
  const fetchVariations = useIntlAirtimeStore.use.fetchVariations();

  useEffect(() => {
    if (!selectedCountry || !selectedProductType) {
      router.replace("/(app)/vtpass/intl-airtime");
      return;
    }
    if (operators.length === 0 && !loadingOperators && !operatorsError) {
      fetchOperators(
        selectedCountry.code,
        String(selectedProductType.product_type_id),
      );
    }
  }, [
    selectedCountry,
    selectedProductType,
    operators.length,
    loadingOperators,
    operatorsError,
    fetchOperators,
  ]);

  function handleSelect(op: IntlOperator) {
    if (!selectedProductType) return;
    setSelectedOperator(op);
    fetchVariations(op.operator_id, String(selectedProductType.product_type_id));
    router.push("/(app)/vtpass/intl-airtime/variation");
  }

  if (!selectedCountry || !selectedProductType) return null;

  if (loadingOperators && operators.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <IntlAirtimeHeader title="Operator" />
        <View className="flex-1">
          <FullPageLoader message="Loading operators…" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <IntlAirtimeHeader title="Operator" />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-10"
      >
        <OperatorPicker
          operators={operators}
          selectedId={null}
          onSelect={handleSelect}
          loading={loadingOperators}
          error={operatorsError}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
