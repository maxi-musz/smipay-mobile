import { useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AddMoneyModal,
  BalanceCard,
  DashboardHeader,
  FundWithCardFlow,
  PromoBanner,
  RecentTransactions,
  ServicesGrid,
} from "@/components/dashboard";
import { FullPageLoader } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast/toast-store";
import { useAuthStore, useHomepageStore } from "@/store";
import { colors } from "@/constants/colors";

export default function HomeScreen() {
  const isLocked = useAuthStore.use.isLocked();
  const data = useHomepageStore.use.data();
  const isLoading = useHomepageStore.use.isLoading();
  const error = useHomepageStore.use.error();
  const fetchHomepage = useHomepageStore.use.fetchHomepage();
  const wasLockedRef = useRef(isLocked);

  const [addMoneyModalVisible, setAddMoneyModalVisible] = useState(false);
  const [fundWithCardModalVisible, setFundWithCardModalVisible] = useState(false);

  // TODO: REMOVE THIS — temporary OTA test banner
  const [otaBannerVisible, setOtaBannerVisible] = useState(true);

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

  const loadFailed = !!error;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {otaBannerVisible && (
        <View className="flex-row items-center justify-between bg-green-600 px-4 py-2.5">
          <Text className="text-sm font-semibold text-white">
            OTA Update Working!!!!!!!!!
          </Text>
          <Pressable onPress={() => setOtaBannerVisible(false)}>
            <Text className="text-sm font-bold text-white">✕</Text>
          </Pressable>
        </View>
      )}
      <Animated.View
        className="z-10 bg-background pb-2"
        entering={FadeInDown.duration(400).springify().damping(15)}
      >
        <DashboardHeader />
        <BalanceCard
          walletBalance={data?.wallet_card?.current_balance ?? "₦0.00"}
          cashbackBalance={data?.cashback_wallet?.current_balance ?? "₦0.00"}
          onAddMoneyPress={() => setAddMoneyModalVisible(true)}
          loadFailed={loadFailed}
          onRetry={fetchHomepage}
        />
      </Animated.View>

      <AddMoneyModal
        visible={addMoneyModalVisible}
        onClose={() => setAddMoneyModalVisible(false)}
        onFundWithCard={() => {
          setAddMoneyModalVisible(false);
          // Delay so the Add Money sheet can unmount before showing Fund with Card (avoids modal stack conflict)
          setTimeout(() => setFundWithCardModalVisible(true), 350);
        }}
        onFundViaTag={() => {
          setAddMoneyModalVisible(false);
          useToastStore.getState().show({
            variant: "info",
            title: "Coming soon",
            message: "Fund Via Tag will be available soon.",
          });
        }}
      />

      <FundWithCardFlow
        visible={fundWithCardModalVisible}
        onClose={() => setFundWithCardModalVisible(false)}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-24"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && !!data}
            onRefresh={fetchHomepage}
            tintColor={colors.orange[500]}
          />
        }
      >
        <Animated.View
          entering={FadeInDown.delay(80).duration(380).springify().damping(15)}
        >
          <PromoBanner
          banners={
            [...(data?.reward_banners ?? [])].sort((a, b) => {
              const order: ("cashback" | "referral" | "first_transaction")[] = [
                "cashback",
                "referral",
                "first_transaction",
              ];
              return order.indexOf(a.type) - order.indexOf(b.type);
            })
          }
        />
        </Animated.View>
        <Animated.View
          entering={FadeInDown.delay(160).duration(380).springify().damping(15)}
        >
          <RecentTransactions
            transactions={(data?.transaction_history ?? []).slice(0, 2)}
            loadFailed={loadFailed}
            onRetry={fetchHomepage}
          />
        </Animated.View>
        <Animated.View
          entering={FadeInDown.delay(240).duration(380).springify().damping(15)}
        >
          <ServicesGrid cashbackRates={data?.cashback_rates} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
