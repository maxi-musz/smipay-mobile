import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, RefreshControl, ScrollView } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";

import {
  AccountDetailsModal,
  BalanceCard,
  DashboardHeader,
  FloatingSmileButton,
  PromoBanner,
  RecentTransactions,
  ServicesGrid,
  TransactionPinRequiredModal,
} from "@/components/dashboard";
import { useVersionGateContext } from "@/context/version-gate-context";
import { useAuthStore, useHomepageStore } from "@/store";
import { colors } from "@/constants/colors";
import { prefetchProviders } from "@/lib/provider-prefetch";

export default function HomeScreen() {
  const isLocked = useAuthStore.use.isLocked();
  const data = useHomepageStore.use.data();
  const isLoading = useHomepageStore.use.isLoading();
  const error = useHomepageStore.use.error();
  const fetchHomepage = useHomepageStore.use.fetchHomepage();
  const refreshHomepageSilently = useHomepageStore.use.refreshHomepageSilently();
  const { versionCheckComplete, effectiveLevel } = useVersionGateContext();
  const wasLockedRef = useRef(isLocked);
  const didPrefetchRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const didInitialFocusRef = useRef(false);

  const [addMoneyModalVisible, setAddMoneyModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  /**
   * Hides the (otherwise mandatory) PIN prompt while we route the user to the
   * dedicated setup screen — a native Modal would otherwise stay on top and
   * cover that screen. We un-snooze whenever the dashboard regains focus, so a
   * user who returns without finishing setup is prompted again.
   */
  const [pinPromptSnoozed, setPinPromptSnoozed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setPinPromptSnoozed(false);
      // The initial mount already fetches via the effect below, so skip that
      // first focus. On every RE-focus — e.g. returning from a purchase or a
      // transaction receipt — silently revalidate so new transactions and
      // balances appear without a manual pull-to-refresh (Opay/Kuda behaviour).
      if (!didInitialFocusRef.current) {
        didInitialFocusRef.current = true;
        return;
      }
      if (!isLocked) {
        void refreshHomepageSilently();
      }
    }, [isLocked, refreshHomepageSilently]),
  );

  // First mount: kick off a fetch. If cached data is rehydrated from disk the
  // store treats this as a silent refresh and never flips `isLoading`, so the
  // dashboard renders instantly with last-known balances and transactions
  // while we revalidate in the background.
  useEffect(() => {
    fetchHomepage();
  }, [fetchHomepage]);

  // After unlock: revalidate silently so we never block the UI behind a loader.
  useEffect(() => {
    const justUnlocked = wasLockedRef.current && !isLocked;
    wasLockedRef.current = isLocked;
    if (!justUnlocked) return;
    if (data) {
      void refreshHomepageSilently();
    } else {
      void fetchHomepage();
    }
  }, [isLocked, data, fetchHomepage, refreshHomepageSilently]);

  // Foreground transitions: when the user returns to the app from background,
  // silently refresh balances + recent transactions in the background. The UI
  // stays mounted with cached data so there's no perceptible reload — matches
  // the behavior of Kuda / Opay / similar consumer fintech apps.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      const wasBackground =
        appStateRef.current === "background" || appStateRef.current === "inactive";
      appStateRef.current = next;
      if (next === "active" && wasBackground && !isLocked) {
        void refreshHomepageSilently();
      }
    });
    return () => sub.remove();
  }, [isLocked, refreshHomepageSilently]);

  // Once the homepage has loaded (auth confirmed) and we're unlocked, silently
  // warm the utility provider caches in the background — sequentially, and only
  // for caches that are missing or expired. Runs once per app session.
  useEffect(() => {
    if (didPrefetchRef.current || !data || isLocked) return;
    didPrefetchRef.current = true;
    void prefetchProviders();
  }, [data, isLocked]);

  /**
   * PIN setup is mandatory, but a soft update prompt takes priority: we only
   * show the PIN modal after the version check has run and `effectiveLevel`
   * is `"none"` (including after the user taps "Later" on a soft update, which
   * snoozes and clears the effective level until the next window).
   */
  const pinModalVisible =
    versionCheckComplete &&
    effectiveLevel === "none" &&
    !!data?.user &&
    !(
      data.user.is_four_digit_pin_set === true ||
      data.user.isTransactionPinSetup === true
    );

  // Only treat a load as "failed" (with the inline retry CTA) when there's
  // truly nothing to show. If we have cached data and a silent refresh fails,
  // we keep showing the cache — failure is invisible to the user.
  const showSkeleton = isLoading && !data;
  const loadFailed = !!error && !data;

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
          isLoading={showSkeleton}
          onRetry={fetchHomepage}
        />
      </Animated.View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-32"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              Promise.resolve(refreshHomepageSilently()).finally(() =>
                setIsRefreshing(false),
              );
            }}
            tintColor={colors.orange[500]}
          />
        }
      >
        <Animated.View entering={FadeInUp.duration(380).delay(40)}>
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
        <Animated.View entering={FadeInUp.duration(380).delay(80)}>
          <ServicesGrid cashbackRates={data?.cashback_rates} />
        </Animated.View>
        <Animated.View entering={FadeInUp.duration(380).delay(120)}>
          <RecentTransactions
            transactions={(data?.transaction_history ?? []).slice(0, 3)}
            loadFailed={loadFailed}
            isLoading={showSkeleton}
            onRetry={fetchHomepage}
          />
        </Animated.View>
      </ScrollView>

      <FloatingSmileButton />

      <AccountDetailsModal
        visible={addMoneyModalVisible}
        onClose={() => setAddMoneyModalVisible(false)}
        accounts={data?.accounts ?? []}
      />
      <TransactionPinRequiredModal
        visible={pinModalVisible && !pinPromptSnoozed}
        onProceed={() => {
          setPinPromptSnoozed(true);
          router.push("/(app)/profile/transaction-pin");
        }}
      />
    </SafeAreaView>
  );
}
