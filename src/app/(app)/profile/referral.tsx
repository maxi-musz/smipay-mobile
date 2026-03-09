import { useEffect } from "react";
import { Pressable, ScrollView, Share, View } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { FullPageLoader } from "@/components/ui/loaders";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";
import { useProfileStore } from "@/store";
import { useToastStore } from "@/components/ui/toast";

export default function ReferralScreen() {
  const { isDark } = useAppTheme();
  const profileData = useProfileStore.use.data();
  const fetchProfile = useProfileStore.use.fetchProfile();
  const isLoading = useProfileStore.use.isLoading();
  const error = useProfileStore.use.error();

  const profileUser = profileData?.user;
  const smipayTag = profileUser?.smipay_tag ?? "";
  const referralCode =
    profileUser?.referral_code ?? (smipayTag ? `@${smipayTag}` : "");
  const referralAnalysis = profileData?.referral_analysis;
  const programConfig = referralAnalysis?.program_config;

  const cardBg = isDark ? "#1E293B" : "#F5F6F8";
  const dividerColor = isDark ? "#2D3A4D" : "#E8EAED";
  const bg = isDark ? "#0F172A" : "#F8F9FB";

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleShareReferral() {
    if (!referralCode) return;
    try {
      await Share.share({
        message: `Join SmiPay and get rewarded! Use my referral code ${referralCode} when you sign up.`,
        title: "Join SmiPay",
      });
    } catch {
      useToastStore.getState().show({
        variant: "error",
        title: "Could not share",
        message: "Sharing is not available.",
      });
    }
  }

  if (isLoading && !profileData) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1" style={{ backgroundColor: bg }}>
          <View className="flex-row items-center px-5 pb-3 pt-14">
            <Pressable
              onPress={() => router.back()}
              className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6" }}
            >
              <Ionicons name="chevron-back" size={20} color={isDark ? "#E5E7EB" : "#111827"} />
            </Pressable>
          </View>
          <FullPageLoader message="Loading..." />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: bg }}>
        <View className="flex-row items-center justify-between px-5 pb-3 pt-14">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6" }}
          >
            <Ionicons name="chevron-back" size={20} color={isDark ? "#E5E7EB" : "#111827"} />
          </Pressable>
          <Text className="text-base font-semibold text-foreground">Referral</Text>
          <View className="h-9 w-9" />
        </View>

        {error ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-muted-foreground">{error}</Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pb-24"
            showsVerticalScrollIndicator={false}
          >
            {/* Referral code card */}
            {referralCode ? (
              <Animated.View
                className="mt-4 overflow-hidden rounded-2xl px-4 py-5"
                style={{
                  backgroundColor: isDark ? "#0F172A" : "#FFF7ED",
                  borderWidth: 1,
                  borderColor: colors.orange[200],
                }}
                entering={FadeInDown.duration(320).springify().damping(15)}
              >
                <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Your Referral Code
                </Text>
                <View className="mt-3 flex-row items-center justify-between">
                  <Text
                    className="text-2xl font-bold tracking-wider"
                    style={{ color: colors.orange[600] }}
                  >
                    {referralCode}
                  </Text>
                  <Pressable
                    onPress={handleShareReferral}
                    className="flex-row items-center gap-2 rounded-xl px-5 py-3 active:opacity-80"
                    style={{ backgroundColor: colors.orange[500] }}
                  >
                    <Ionicons name="share-social-outline" size={20} color="#fff" />
                    <Text className="text-sm font-semibold text-white">Share</Text>
                  </Pressable>
                </View>
                {programConfig && (
                  <Text className="mt-3 text-sm text-muted-foreground">
                    Earn ₦{programConfig.referrer_reward_amount} when friends sign up and make their first transaction. They get ₦{programConfig.referee_reward_amount} too.
                  </Text>
                )}
              </Animated.View>
            ) : (
              <Animated.View
                className="mt-4 overflow-hidden rounded-2xl px-4 py-5"
                style={{ backgroundColor: cardBg }}
                entering={FadeInDown.duration(320).springify().damping(15)}
              >
                <Text className="text-sm text-muted-foreground">
                  Your referral code will appear here once your account is set up.
                </Text>
              </Animated.View>
            )}

            {/* Referral stats */}
            {referralAnalysis && (
              <Animated.View
                className="mt-4 overflow-hidden rounded-2xl px-4 py-4"
                style={{ backgroundColor: cardBg }}
                entering={FadeInDown.delay(60).duration(320).springify().damping(15)}
              >
                <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Your Stats
                </Text>
                <View className="mt-3 flex-row flex-wrap gap-3">
                  <StatChip
                    label="Referred"
                    value={String(referralAnalysis.total_referred)}
                    isDark={isDark}
                  />
                  <StatChip
                    label="Rewarded"
                    value={String(referralAnalysis.referrer_rewards_issued)}
                    isDark={isDark}
                  />
                  <StatChip
                    label="Earned"
                    value={`₦${new Intl.NumberFormat("en-NG").format(referralAnalysis.referrer_rewards_total_amount)}`}
                    isDark={isDark}
                    highlight
                  />
                  {/* <StatChip
                    label="Slots left"
                    value={String(referralAnalysis.slots_remaining)}
                    isDark={isDark}
                  /> */}
                </View>
                {referralAnalysis.by_status &&
                  Object.keys(referralAnalysis.by_status).length > 0 && (
                    <View
                      className="mt-3 pt-3"
                      style={{ borderTopWidth: 1, borderTopColor: dividerColor }}
                    >
                      <Text className="mb-2 text-xs font-medium text-muted-foreground">
                        By status
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {Object.entries(referralAnalysis.by_status).map(([status, count]) =>
                          (count ?? 0) > 0 ? (
                            <View
                              key={status}
                              className="rounded-lg px-2.5 py-1"
                              style={{
                                backgroundColor: isDark ? "#111827" : "#F3F4F6",
                              }}
                            >
                              <Text className="text-xs font-medium text-foreground">
                                {status}: {count}
                              </Text>
                            </View>
                          ) : null
                        )}
                      </View>
                    </View>
                  )}
              </Animated.View>
            )}

            {/* Program info */}
            {programConfig && (
              <Animated.View
                className="mt-4 overflow-hidden rounded-2xl px-4 py-4"
                style={{ backgroundColor: cardBg }}
                entering={FadeInDown.delay(120).duration(320).springify().damping(15)}
              >
                <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  How It Works
                </Text>
                <Text className="mt-2 text-sm text-foreground">
                  Share your code with friends. When they sign up and make their first transaction of ₦{programConfig.min_transaction_amount} or more, you both earn rewards.
                </Text>
                <Text className="mt-2 text-xs text-muted-foreground">
                  You can refer up to {programConfig.max_referrals_per_user} people.
                </Text>
              </Animated.View>
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

function StatChip({
  label,
  value,
  isDark,
  highlight,
}: {
  label: string;
  value: string;
  isDark: boolean;
  highlight?: boolean;
}) {
  return (
    <View
      className="rounded-xl px-3 py-2"
      style={{
        backgroundColor: highlight
          ? (isDark ? "#052E16" : "#DCFCE7")
          : isDark
            ? "#111827"
            : "#F3F4F6",
      }}
    >
      <Text className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Text>
      <Text
        className="mt-0.5 text-sm font-bold"
        style={{ color: highlight ? colors.green[600] : undefined }}
      >
        {value}
      </Text>
    </View>
  );
}
