import { useEffect, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { ThemeToggle } from "@/components/theme-toggle";
import { useResponsiveScale } from "@/hooks/use-responsive-scale";
import { resolveProfileImageUrl } from "@/lib/profile-image-url";
import { colors } from "@/constants/colors";
import {
  isOtaDebugUser,
  OTA_DEBUG_BUILD_MARKER,
} from "@/constants/ota-debug-marker";
import { useAuthStore, useHomepageStore, useInboxStore } from "@/store";

const SUPPORT_ICON_COLOR = "#2563EB";
const NOTIFICATION_ICON_COLOR = colors.orange[500];

export function DashboardHeader() {
  const authUser = useAuthStore.use.user();
  const homepageData = useHomepageStore.use.data();
  const unreadCount = useInboxStore.use.unreadCount();
  const fetchInboxFirstPage = useInboxStore.use.fetchInboxFirstPage();
  const { s } = useResponsiveScale();
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    void fetchInboxFirstPage();
  }, [fetchInboxFirstPage]);

  const firstName =
    homepageData?.user?.first_name ?? authUser?.first_name ?? "there";

  const email = authUser?.email ?? null;

  const profileImageUrl = resolveProfileImageUrl(
    homepageData?.user?.profile_image ?? authUser?.profile_image ?? null,
  );
  const hasValidPicture = profileImageUrl !== null && !avatarLoadFailed;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [profileImageUrl]);

  return (
    <View
      className="flex-row items-center justify-between"
      style={{
        paddingHorizontal: s(12),
        paddingBottom: s(12),
        paddingTop: s(8),
      }}
    >
      <Pressable
        className="flex-row items-center rounded-xl"
        style={{ gap: s(12) }}
        onPress={() => router.push("/(app)/(tabs)/profile")}
      >
        {hasValidPicture && profileImageUrl ? (
          <Image
            source={{ uri: profileImageUrl }}
            style={{
              width: s(40),
              height: s(40),
              borderRadius: s(20),
            }}
            resizeMode="cover"
            onError={() => setAvatarLoadFailed(true)}
            accessibilityLabel="Your profile photo"
          />
        ) : (
          <Image
            source={require("@/assets/images/icon.png")}
            style={{ width: s(40), height: s(40) }}
            className="rounded-xl"
            resizeMode="contain"
            accessibilityLabel="SmiPay"
          />
        )}
        <Text
          className="font-bold text-foreground"
          style={{ fontSize: s(20) }}
        >
          Hi, {firstName}
        </Text>
      </Pressable>

      {/* OTA build marker — centered, debug user only. Absolutely positioned so
          it never shifts the existing left/right header layout. */}
      {isOtaDebugUser(email) ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            className="text-muted-foreground"
            style={{ fontSize: s(11), fontWeight: "700" }}
          >
            OTA:{OTA_DEBUG_BUILD_MARKER}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center" style={{ gap: s(4) }}>
        <Pressable
          style={{ padding: s(6) }}
          onPress={() => router.push("/(app)/support")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Chat with support"
        >
          <Ionicons
            name="headset-outline"
            size={s(18)}
            color={SUPPORT_ICON_COLOR}
          />
        </Pressable>
        <Pressable
          style={{ padding: s(6) }}
          onPress={() => router.push("/(app)/notifications")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
        >
          <View>
            <Ionicons
              name="notifications-outline"
              size={s(18)}
              color={NOTIFICATION_ICON_COLOR}
            />
            {unreadCount > 0 ? (
              <View
                style={{
                  position: "absolute",
                  right: -2,
                  top: -2,
                  minWidth: s(14),
                  height: s(14),
                  borderRadius: s(7),
                  backgroundColor: colors.error,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: s(3),
                }}
              >
                <Text
                  style={{
                    fontSize: s(9),
                    fontWeight: "700",
                    color: colors.white,
                  }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
        <ThemeToggle size={s(18)} />
      </View>
    </View>
  );
}
