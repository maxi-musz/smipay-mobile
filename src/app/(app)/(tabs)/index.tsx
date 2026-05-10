import { useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  // AddMoneyModal,
  AccountDetailsModal,
  BalanceCard,
  DashboardHeader,
  // FundWithCardFlow,
  PromoBanner,
  RecentTransactions,
  ServicesGrid,
  SetTransactionPinModal,
} from "@/components/dashboard";
import { FullPageLoader } from "@/components/ui/loaders";
// import { useToastStore } from "@/components/ui/toast/toast-store";
import { useAuthStore, useHomepageStore, useProfileStore } from "@/store";
import { colors } from "@/constants/colors";

export default function HomeScreen() {
  const isLocked = useAuthStore.use.isLocked();
  const data = useHomepageStore.use.data();
  const isLoading = useHomepageStore.use.isLoading();
  const error = useHomepageStore.use.error();
  const fetchHomepage = useHomepageStore.use.fetchHomepage();
  const refreshHomepageSilently = useHomepageStore.use.refreshHomepageSilently();
  const fetchProfile = useProfileStore.use.fetchProfile();
  const wasLockedRef = useRef(isLocked);

  const [addMoneyModalVisible, setAddMoneyModalVisible] = useState(false);
  // const [fundWithCardModalVisible, setFundWithCardModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  /**
   * The transaction PIN setup is mandatory: the modal stays visible for as long
   * as the homepage tells us the user has no PIN. There is no dismiss path —
   * once a PIN is saved, `is_four_digit_pin_set` flips to `true` and the modal
   * unmounts on the next homepage refresh.
   */
  const pinModalVisible = !!data?.user
    ? !(
        data.user.is_four_digit_pin_set === true ||
        data.user.isTransactionPinSetup === true
      )
    : false;

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
      <Animated.View
        className="z-10 bg-background pb-2"
        entering={FadeInDown.duration(400)}
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


      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-24"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              Promise.resolve(fetchHomepage()).finally(() => setIsRefreshing(false));
            }}
            tintColor={colors.orange[500]}
          />
        }
      >
        <Animated.View>
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
        <Animated.View>
          <ServicesGrid cashbackRates={data?.cashback_rates} />
        </Animated.View>
        <Animated.View>
          <RecentTransactions
            transactions={(data?.transaction_history ?? []).slice(0, 3)}
            loadFailed={loadFailed}
            onRetry={fetchHomepage}
          />
        </Animated.View>
      </ScrollView>
      <AccountDetailsModal
        visible={addMoneyModalVisible}
        onClose={() => setAddMoneyModalVisible(false)}
        accounts={data?.accounts ?? []}
      />
      <SetTransactionPinModal
        visible={pinModalVisible}
        onSuccess={async () => {
          // Silent refetch — once the homepage flips `is_four_digit_pin_set`
          // to true, the modal unmounts on its own.
          await Promise.all([refreshHomepageSilently(), fetchProfile()]);
        }}
      />
    </SafeAreaView>
  );
}
