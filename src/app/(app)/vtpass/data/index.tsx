import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import {
  DataHeader,
  DataBalanceCard,
  ProviderRow,
  PlanCategoryFilters,
  PlanList,
  FAVOURITES_CATEGORY,
} from "@/features/vtpass-data/components";
import { useDataFavourites } from "@/features/vtpass-data/lib/data-favourites";
import { useDataStore } from "@/features/vtpass-data/lib/store";
import { useHomepageStore } from "@/store";
import type { DataServiceItem, DataVariation } from "@/types/vtpass-data";
import { Text } from "@/components/ui/text";
import { FullPageLoader } from "@/components/ui/loaders";

export default function DataScreen() {
  const homepageData = useHomepageStore.use.data();
  const walletBalance =
    homepageData?.wallet_card?.current_balance ?? "₦0.00";

  const providers = useDataStore.use.providers();
  const selectedProvider = useDataStore.use.selectedProvider();
  const variations = useDataStore.use.variations();
  const variationsCategorized = useDataStore.use.variationsCategorized();
  const isLoadingProviders = useDataStore.use.isLoadingProviders();
  const isLoadingVariations = useDataStore.use.isLoadingVariations();
  const providersError = useDataStore.use.providersError();
  const variationsError = useDataStore.use.variationsError();
  const fetchProviders = useDataStore.use.fetchProviders();
  const setSelectedProvider = useDataStore.use.setSelectedProvider();
  const setSelectedVariation = useDataStore.use.setSelectedVariation();
  const fetchVariationCodes = useDataStore.use.fetchVariationCodes();

  const [selectedCategory, setSelectedCategory] = useState("All");

  const {
    isFavourite,
    toggleFavourite,
    favouriteCountForProvider,
  } = useDataFavourites();

  const favouriteCountForCurrentProvider =
    selectedProvider != null
      ? favouriteCountForProvider(
          selectedProvider.serviceID,
          variations.map((v) => v.variation_code),
        )
      : 0;

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
      setSelectedCategory("All");
    }
  }, [selectedProvider?.serviceID, fetchVariationCodes]);

  const categoryKeys = useMemo(
    () =>
      Object.keys(variationsCategorized).filter(
        (k) => variationsCategorized[k]?.variations?.length > 0,
      ),
    [variationsCategorized],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categoryKeys.forEach((k) => {
      const block = variationsCategorized[k];
      counts[k] = block?.variations?.length ?? 0;
    });
    return counts;
  }, [categoryKeys, variationsCategorized]);

  const plansForCategory = useMemo(() => {
    if (selectedCategory === FAVOURITES_CATEGORY) {
      return variations.filter((v) =>
        selectedProvider
          ? isFavourite(selectedProvider.serviceID, v.variation_code)
          : false,
      );
    }
    if (selectedCategory === "All") return variations;
    const block = variationsCategorized[selectedCategory];
    return block?.variations ?? [];
  }, [
    selectedCategory,
    variations,
    variationsCategorized,
    selectedProvider,
    isFavourite,
  ]);

  useEffect(() => {
    if (
      selectedCategory === FAVOURITES_CATEGORY &&
      favouriteCountForCurrentProvider === 0
    ) {
      setSelectedCategory("All");
    }
  }, [selectedCategory, favouriteCountForCurrentProvider]);

  function handleSelectProvider(provider: DataServiceItem) {
    setSelectedProvider(provider);
  }

  function handleSelectPlan(plan: DataVariation) {
    setSelectedVariation(plan);
    router.push("/(app)/vtpass/data/amount");
  }

  if (isLoadingProviders && providers.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <DataHeader />
        <View className="flex-1">
          <FullPageLoader message="Loading networks…" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <DataHeader />

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-10"
      >
        <DataBalanceCard walletBalance={walletBalance} />

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
              Select plan
            </Text>
            {isLoadingVariations && variations.length === 0 ? (
              <View className="rounded-xl bg-muted/30 px-4 py-8">
                <Text className="text-center text-sm text-muted-foreground">
                  Loading plans…
                </Text>
              </View>
            ) : (
              <>
                <PlanCategoryFilters
                  categories={categoryKeys}
                  categoryCounts={categoryCounts}
                  totalCount={variations.length}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  favouritesCount={favouriteCountForCurrentProvider}
                />
                <PlanList
                  serviceID={selectedProvider.serviceID}
                  plans={plansForCategory}
                  onSelectPlan={handleSelectPlan}
                  isFavourite={(plan) =>
                    isFavourite(selectedProvider.serviceID, plan.variation_code)
                  }
                  onToggleFavourite={(plan) =>
                    toggleFavourite(selectedProvider.serviceID, plan.variation_code)
                  }
                  loading={isLoadingVariations}
                  error={variationsError}
                  emptyMessage={
                    selectedCategory === FAVOURITES_CATEGORY
                      ? "No favourite plans. Tap the star on a plan to add it."
                      : "No plans in this category"
                  }
                />
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
