import { useCallback, useEffect } from "react";
import {
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";

import { FullPageLoader } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  formatTierPropertyValue,
  getLimitProperties,
  getVerificationProperties,
} from "@/lib/format-tier-property";
import { useKycVerificationStore, useProfileStore } from "@/store";
import type { ProfileTier, TierProperty } from "@/types/profile";

function TierLimitCell({ property }: { property: TierProperty }) {
  return (
    <Text className="text-[13px] font-medium text-foreground">
      {formatTierPropertyValue(property)}
    </Text>
  );
}

function VerificationCta({
  property,
  onPress,
}: {
  property: TierProperty;
  onPress: () => void;
}) {
  if (property.is_met) {
    return (
      <View className="flex-row items-center gap-1">
        <Ionicons name="checkmark-circle" size={14} color={colors.green[600]} />
        <Text className="text-[12px] font-semibold text-green-600">Verified</Text>
      </View>
    );
  }

  if (property.key === "phone_verification") {
    return (
      <Pressable
        onPress={onPress}
        className="rounded-full px-3 py-1.5 active:opacity-80"
        style={{ backgroundColor: colors.orange[500] }}
      >
        <Text className="text-[12px] font-semibold text-white">Verify</Text>
      </Pressable>
    );
  }

  return (
    <Text className="text-[12px] font-medium text-muted-foreground">Pending</Text>
  );
}

function TierRow({
  tier,
  isDark,
  onVerifyPhone,
}: {
  tier: ProfileTier;
  isDark: boolean;
  onVerifyPhone: () => void;
}) {
  const limitProps = getLimitProperties(tier.properties);
  const verificationProps = getVerificationProperties(tier.properties);
  const dailyLimit = limitProps.find((p) => p.key === "daily_transfer_limit");
  const balanceLimit = limitProps.find((p) => p.key === "max_account_balance");
  const singleLimit = limitProps.find((p) => p.key === "single_transfer_limit");

  const rowBg = isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF";
  const borderColor = isDark ? "rgba(148,163,184,0.12)" : "rgba(0,0,0,0.06)";

  return (
    <View
      className="mb-3 overflow-hidden rounded-2xl border px-4 py-4"
      style={{ backgroundColor: rowBg, borderColor }}
    >
      <View className="mb-3 flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-[16px] font-semibold text-foreground">
              {tier.name}
            </Text>
            {tier.is_current ? (
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: isDark ? "rgba(34,197,94,0.16)" : colors.green[50] }}
              >
                <Text
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: colors.green[600] }}
                >
                  Current
                </Text>
              </View>
            ) : null}
          </View>
          {tier.description ? (
            <Text className="mt-1 text-[13px] text-muted-foreground">
              {tier.description}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="gap-2.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-[12px] text-muted-foreground">Daily limit</Text>
          {dailyLimit ? (
            <TierLimitCell property={dailyLimit} />
          ) : (
            <Text className="text-[13px] text-muted-foreground">—</Text>
          )}
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-[12px] text-muted-foreground">Single transfer</Text>
          {singleLimit ? (
            <TierLimitCell property={singleLimit} />
          ) : (
            <Text className="text-[13px] text-muted-foreground">—</Text>
          )}
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-[12px] text-muted-foreground">Max balance</Text>
          {balanceLimit ? (
            <TierLimitCell property={balanceLimit} />
          ) : (
            <Text className="text-[13px] text-muted-foreground">—</Text>
          )}
        </View>
      </View>

      {verificationProps.length > 0 ? (
        <View
          className="mt-3 gap-2 border-t pt-3"
          style={{ borderColor }}
        >
          {verificationProps.map((property) => (
            <View
              key={property.id}
              className="flex-row items-center justify-between gap-3"
            >
              <Text className="flex-1 text-[13px] text-foreground">
                {property.label}
              </Text>
              <VerificationCta
                property={property}
                onPress={onVerifyPhone}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function AccountLimitsScreen() {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.show);

  const profileData = useProfileStore.use.data();
  const profileLoading = useProfileStore.use.isLoading();
  const fetchProfile = useProfileStore.use.fetchProfile();

  const kycStatus = useKycVerificationStore.use.data();
  const fetchKycStatus = useKycVerificationStore.use.fetchStatus();

  const loadData = useCallback(async () => {
    await Promise.all([fetchProfile(), fetchKycStatus()]);
  }, [fetchProfile, fetchKycStatus]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const tiers = kycStatus?.available_tiers ?? profileData?.available_tiers ?? [];
  const currentTier = kycStatus?.current_tier ?? profileData?.current_tier;
  const user = profileData?.user;
  const phone =
    kycStatus?.phone_verification?.masked_phone ?? user?.phone_number ?? "";
  const fullName = user?.name ?? "User";

  async function copyPhone() {
    const rawPhone = user?.phone_number;
    if (!rawPhone) return;
    await Clipboard.setStringAsync(rawPhone);
    showToast({
      variant: "success",
      title: "Copied",
      message: "Phone number copied to clipboard.",
    });
  }

  if (profileLoading && !profileData && !kycStatus) {
    return <FullPageLoader />;
  }

  const cardGold = isDark ? "#3D3422" : "#FFF7E6";
  const cardBorder = isDark ? "rgba(245,180,60,0.25)" : "rgba(245,180,60,0.35)";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        className="flex-1 bg-background"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6" }}
          >
            <Ionicons name="chevron-back" size={20} color={isDark ? "#E5E7EB" : "#111827"} />
          </Pressable>
          <Text className="text-base font-semibold text-foreground">
            Account Limits
          </Text>
          <View className="h-9 w-9" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 24) + 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            className="mb-5 overflow-hidden rounded-3xl border p-5"
            style={{ backgroundColor: cardGold, borderColor: cardBorder }}
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Pressable
                  onPress={() => void copyPhone()}
                  className="flex-row items-center gap-2 active:opacity-70"
                >
                  <Text className="text-[22px] font-bold tracking-tight text-foreground">
                    {phone || "—"}
                  </Text>
                  {user?.phone_number ? (
                    <Ionicons
                      name="copy-outline"
                      size={18}
                      color={colors.orange[500]}
                    />
                  ) : null}
                </Pressable>
                <Text className="mt-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {fullName}
                </Text>
              </View>
              {currentTier ? (
                <LinearGradient
                  colors={["#D4AF37", "#B8860B"]}
                  style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}
                >
                  <Text className="text-[11px] font-bold uppercase text-white">
                    {currentTier.order ?? 1} Tier
                  </Text>
                </LinearGradient>
              ) : null}
            </View>
          </View>

          <Pressable
            onPress={() => {
              const phonePending =
                kycStatus?.phone_verification?.is_required &&
                !kycStatus?.phone_verification?.is_met;
              if (phonePending) {
                router.push("/(app)/profile/phone-verification");
              }
            }}
            className="mb-5 flex-row items-center justify-between rounded-2xl border px-4 py-4 active:opacity-80"
            style={{
              backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
              borderColor: isDark ? "rgba(148,163,184,0.12)" : "rgba(0,0,0,0.06)",
            }}
          >
            <View>
              <Text className="text-[12px] text-muted-foreground">Linked ID</Text>
              <Text className="mt-1 text-[15px] font-medium text-foreground">
                {[
                  user?.is_verified ? "Email verified" : "Email pending",
                  kycStatus?.phone_verification?.is_met
                    ? "Phone verified"
                    : "Phone pending",
                ].join(" · ")}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={isDark ? "#94A3B8" : "#9CA3AF"}
            />
          </Pressable>

          <Text className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Level benefits
          </Text>

          {tiers.length === 0 ? (
            <View className="rounded-2xl border px-4 py-8 items-center"
              style={{
                borderColor: isDark ? "rgba(148,163,184,0.12)" : "rgba(0,0,0,0.06)",
              }}
            >
              <Text className="text-sm text-muted-foreground">
                No account tiers configured yet.
              </Text>
            </View>
          ) : (
            tiers.map((tier) => (
              <TierRow
                key={tier.id ?? tier.tier}
                tier={tier}
                isDark={isDark}
                onVerifyPhone={() => router.push("/(app)/profile/phone-verification")}
              />
            ))
          )}
        </ScrollView>
      </View>
    </>
  );
}
