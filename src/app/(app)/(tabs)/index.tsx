import { useEffect, useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BalanceCard,
  DashboardHeader,
  PromoBanner,
  RecentTransactions,
  ServicesGrid,
  TransferSection,
} from "@/components/dashboard";
import { FullPageLoader } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useAuthStore, useHomepageStore } from "@/store";
import { colors } from "@/constants/colors";

export default function HomeScreen() {
  const isLocked = useAuthStore.use.isLocked();
  const data = useHomepageStore.use.data();
  const isLoading = useHomepageStore.use.isLoading();
  const error = useHomepageStore.use.error();
  const fetchHomepage = useHomepageStore.use.fetchHomepage();
  const wasLockedRef = useRef(isLocked);

  // Fetch on mount only.
  useEffect(() => {
    fetchHomepage();
  }, [fetchHomepage]);

  // After unlock only: refetch once so dashboard loads with new token. Do not refetch on every error (avoids loop when backend is down).
  useEffect(() => {
    const justUnlocked = wasLockedRef.current && !isLocked;
    wasLockedRef.current = isLocked;
    if (justUnlocked && !data) {
      fetchHomepage();
    }
  }, [isLocked, data, fetchHomepage]);

  if (isLoading && !data) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <FullPageLoader message="Loading..." />
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-8" edges={["top"]}>
        <Text className="mb-4 text-center text-muted-foreground">{error}</Text>
        <Pressable
          className="rounded-xl px-6 py-3"
          style={{ backgroundColor: colors.orange[500] }}
          onPress={fetchHomepage}
        >
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="z-10 bg-background pb-4">
        <DashboardHeader />
        <BalanceCard
          walletBalance={data?.wallet_card?.current_balance ?? "₦0.00"}
          cashbackBalance={data?.cashback_wallet?.current_balance ?? "₦0.00"}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-24"
        showsVerticalScrollIndicator={false}
      >
        <PromoBanner banners={data?.reward_banners ?? []} />
        <ServicesGrid cashbackRates={data?.cashback_rates} />
        <TransferSection />
        <RecentTransactions transactions={data?.transaction_history ?? []} />
      </ScrollView>
    </SafeAreaView>
  );
}
