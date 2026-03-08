import { useEffect } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import {
  CableHeader,
  WalletBalanceCard,
  ProviderRow,
  BouquetList,
} from "@/features/vtpass-cable/components";
import { getProviderTraits } from "@/features/vtpass-cable/lib/constants";
import { useCableStore } from "@/features/vtpass-cable/lib/store";
import { useHomepageStore } from "@/store";
import { FullPageLoader } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import type { CableServiceItem, CableVariation } from "@/types/vtpass-cable";

export default function CableIndexScreen() {
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

  const providers = useCableStore.use.providers();
  const selectedProvider = useCableStore.use.selectedProvider();
  const variations = useCableStore.use.variations();
  const isLoadingProviders = useCableStore.use.isLoadingProviders();
  const isLoadingVariations = useCableStore.use.isLoadingVariations();
  const providersError = useCableStore.use.providersError();
  const variationsError = useCableStore.use.variationsError();
  const fetchProviders = useCableStore.use.fetchProviders();
  const setSelectedProvider = useCableStore.use.setSelectedProvider();
  const setSelectedVariation = useCableStore.use.setSelectedVariation();
  const fetchVariationCodes = useCableStore.use.fetchVariationCodes();

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  useEffect(() => {
    if (providers.length > 0 && !selectedProvider) {
      setSelectedProvider(providers[0]);
    }
  }, [providers, selectedProvider, setSelectedProvider]);

  useEffect(() => {
    if (selectedProvider) {
      fetchVariationCodes(selectedProvider.serviceID);
    }
  }, [selectedProvider?.serviceID, fetchVariationCodes]);

  function handleSelectProvider(provider: CableServiceItem) {
    setSelectedProvider(provider);
  }

  function handleSelectPlan(plan: CableVariation) {
    if (!selectedProvider) return;
    setSelectedVariation(plan);

    const traits = getProviderTraits(selectedProvider.serviceID);

    if (traits.supportsVerify) {
      router.push("/(app)/vtpass/cable/smartcard");
    } else {
      router.push("/(app)/vtpass/cable/purchase");
    }
  }

  if (isLoadingProviders && providers.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <CableHeader />
        <View className="flex-1">
          <FullPageLoader message="Loading providers…" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <CableHeader />

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

        <ProviderRow
          providers={providers}
          selectedServiceID={selectedProvider?.serviceID ?? null}
          onSelect={handleSelectProvider}
          error={providersError}
          onRetry={() => fetchProviders(true)}
        />

        {selectedProvider && (
          <View className="mt-6">
            <Text className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Select bouquet
            </Text>
            {isLoadingVariations && variations.length === 0 ? (
              <View className="rounded-xl bg-muted/30 px-4 py-8">
                <Text className="text-center text-sm text-muted-foreground">
                  Loading plans…
                </Text>
              </View>
            ) : (
              <BouquetList
                plans={variations}
                onSelectPlan={handleSelectPlan}
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
