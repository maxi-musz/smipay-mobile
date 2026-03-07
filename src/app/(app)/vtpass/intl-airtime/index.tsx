import { useEffect } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { IntlAirtimeHeader, WalletBalanceCard, CountryPicker } from "@/features/vtpass-intl-airtime/components";
import { useIntlAirtimeStore } from "@/features/vtpass-intl-airtime/lib/store";
import type { IntlCountry } from "@/types/vtpass-intl-airtime";
import { FullPageLoader } from "@/components/ui/loaders";
import { useHomepageStore } from "@/store";

export default function IntlAirtimeScreen() {
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

  const countries = useIntlAirtimeStore.use.countries();
  const loadingCountries = useIntlAirtimeStore.use.isLoadingCountries();
  const countriesError = useIntlAirtimeStore.use.countriesError();
  const fetchCountries = useIntlAirtimeStore.use.fetchCountries();
  const setSelectedCountry = useIntlAirtimeStore.use.setSelectedCountry();
  const fetchProductTypes = useIntlAirtimeStore.use.fetchProductTypes();

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  function handleSelectCountry(country: IntlCountry) {
    setSelectedCountry(country);
    fetchProductTypes(country.code);
    router.push("/(app)/vtpass/intl-airtime/product-type");
  }

  if (loadingCountries && countries.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <IntlAirtimeHeader />
        <View className="flex-1">
          <FullPageLoader message="Loading countries…" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <IntlAirtimeHeader />

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

        <CountryPicker
          countries={countries}
          selectedCode={null}
          onSelect={handleSelectCountry}
          loading={loadingCountries}
          error={countriesError}
          onRetry={() => fetchCountries(true)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
