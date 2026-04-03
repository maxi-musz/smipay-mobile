import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { formatNairaNumberForDisplay } from "@/lib/money";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useHomepageStore } from "@/store";
import type { RewardBanner } from "@/types";

const VALID_TYPES: RewardBanner["type"][] = [
  "cashback",
  "referral",
  "first_transaction",
];

const DATA_KEY_LABELS: Partial<Record<string, string>> = {
  max_per_transaction: "Max per transaction",
  max_per_user: "Max per user",
  bonus_amount: "Bonus amount",
  min_amount: "Minimum amount",
};

function isRewardType(v: string): v is RewardBanner["type"] {
  return VALID_TYPES.includes(v as RewardBanner["type"]);
}

function labelForDataKey(key: string): string {
  if (DATA_KEY_LABELS[key]) return DATA_KEY_LABELS[key]!;
  return key
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export default function RewardBannerDetailScreen() {
  const { type: typeParam } = useLocalSearchParams<{ type: string }>();
  const { isDark } = useAppTheme();
  const data = useHomepageStore.use.data();
  const fetchHomepage = useHomepageStore.use.fetchHomepage();
  const isLoading = useHomepageStore.use.isLoading();

  const typeOk = typeParam && isRewardType(typeParam);

  const banner = useMemo(() => {
    if (!typeOk || !data?.reward_banners) return undefined;
    return data.reward_banners.find((b) => b.type === typeParam);
  }, [data?.reward_banners, typeOk, typeParam]);

  // If homepage was never loaded (e.g. deep link), fetch once. Do not refetch in a loop when
  // the API simply omits this banner type.
  useEffect(() => {
    if (!typeOk) return;
    if (banner) return;
    if (data !== null) return;
    if (isLoading) return;
    fetchHomepage();
  }, [banner, data, fetchHomepage, isLoading, typeOk]);

  const bg = isDark ? "#0F172A" : "#F8F9FB";
  const cardBg = isDark ? "#1E293B" : "#FFFFFF";

  const dataEntries = banner?.data
    ? Object.entries(banner.data).filter(([, v]) => typeof v === "number")
    : [];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: bg }}>
        <View className="flex-row items-center justify-between px-5 pb-3 pt-14">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6" }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={isDark ? "#E5E7EB" : "#111827"}
            />
          </Pressable>
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {banner?.title ?? "Reward"}
          </Text>
          <View className="h-9 w-9" />
        </View>

        {!typeOk ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-muted-foreground">
              This offer isn&apos;t available.
            </Text>
          </View>
        ) : !banner ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-muted-foreground">
              This offer isn&apos;t available right now. Pull to refresh on the home
              screen to try again.
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pb-24"
            showsVerticalScrollIndicator={false}
          >
            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: cardBg }}
            >
              <Text className="text-xl font-semibold text-foreground">
                {banner.title}
              </Text>
              <Text className="mt-3 text-base leading-6 text-muted-foreground">
                {banner.message}
              </Text>
            </View>

            {dataEntries.length > 0 && (
              <View className="mt-6">
                <Text className="mb-3 text-sm font-semibold text-foreground">
                  Details
                </Text>
                <View
                  className="rounded-2xl overflow-hidden"
                  style={{ backgroundColor: cardBg }}
                >
                  {dataEntries.map(([key, value], index) => (
                    <View
                      key={key}
                      className="flex-row items-center justify-between px-4 py-3"
                      style={{
                        borderBottomWidth: index < dataEntries.length - 1 ? 1 : 0,
                        borderBottomColor: isDark ? "#2D3A4D" : "#E8EAED",
                      }}
                    >
                      <Text className="mr-3 flex-1 text-sm text-muted-foreground">
                        {labelForDataKey(key)}
                      </Text>
                      <Text className="text-sm font-medium text-foreground">
                        {formatNairaNumberForDisplay(value)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}
