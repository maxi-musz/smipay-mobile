import { useEffect, useState } from "react";
import { Image, Linking, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { logout as logoutApi, removePushToken } from "@/api";
import {
  clearLastRegisteredToken,
  getLastRegisteredToken,
} from "@/lib/push-notifications";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToastStore } from "@/components/ui/toast";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";
import {
  isOtaDebugUser,
  OTA_DEBUG_BUILD_MARKER,
} from "@/constants/ota-debug-marker";
import { useAuthStore, useHomepageStore, useProfileStore } from "@/store";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type MenuItem = {
  icon: IconName;
  label: string;
  id: string;
};

const PRIVACY_POLICY_URL = "https://www.smipay.ng/privacy";

const menuItems: MenuItem[] = [
  { id: "basic-information", icon: "person-outline", label: "Basic Information" },
  { id: "referral", icon: "gift-outline", label: "Referral" },
  { id: "security", icon: "shield-checkmark-outline", label: "Security" },
  { id: "notifications", icon: "notifications-outline", label: "Notifications" },
  { id: "help", icon: "help-circle-outline", label: "Help & Support" },
  { id: "privacy", icon: "document-text-outline", label: "Privacy Policy" },
  { id: "account-deletion", icon: "trash-outline", label: "Delete account" },
];

export default function ProfileScreen() {
  const authUser = useAuthStore.use.user();
  const storeLogout = useAuthStore.use.logout();
  const homepageData = useHomepageStore.use.data();
  const profileData = useProfileStore.use.data();
  const fetchProfile = useProfileStore.use.fetchProfile();
  const { isDark } = useAppTheme();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const hpUser = homepageData?.user;
  const profileUser = profileData?.user;
  const firstName = hpUser?.first_name ?? authUser?.first_name ?? profileUser?.first_name ?? "";
  const lastName = hpUser?.last_name ?? authUser?.last_name ?? profileUser?.last_name ?? "";
  const fullName = `${firstName} ${lastName}`.trim() || "User";
  const email = hpUser?.email ?? authUser?.email ?? profileUser?.email ?? "";
  const phone = hpUser?.phone_number ?? authUser?.phone_number ?? profileUser?.phone_number ?? "";
  const smipayTag = hpUser?.smipay_tag ?? profileUser?.smipay_tag ?? "";
  const profileImage =
    hpUser?.profile_image ?? authUser?.profile_image ?? profileUser?.profile_image ?? null;
  const isVerified =
    hpUser?.is_email_verified ?? authUser?.is_email_verified ?? profileUser?.is_verified ?? false;

  const walletBalance = homepageData?.wallet_card?.current_balance ?? "₦0.00";
  const tier = homepageData?.current_tier ?? profileData?.current_tier;

  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "U";

  const cardBg = isDark ? "#1E293B" : "#F5F6F8";
  const dividerColor = isDark ? "#2D3A4D" : "#E8EAED";
  const chevronColor = isDark ? "#808999" : "#9CA3B0";

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const pushToken = getLastRegisteredToken();
      if (pushToken) {
        await removePushToken(pushToken);
      }
      clearLastRegisteredToken();
    } catch {
      // Proceed with logout even if push remove fails
    }
    try {
      await logoutApi();
    } catch {
      // Silently ignore
    }
    await storeLogout();
    useToastStore.getState().show({
      variant: "success",
      title: "Signed Out",
      message: "You have been signed out successfully.",
    });
    router.replace("/(auth)/sign-in");
  }

  async function handleMenuPress(id: string) {
    if (id === "security") {
      router.push("/(app)/profile/security");
    } else if (id === "basic-information") {
      router.push("/(app)/profile/basic-information");
    } else if (id === "referral") {
      router.push("/(app)/profile/referral");
    } else if (id === "notifications") {
      router.push("/(app)/profile/notifications");
    } else if (id === "help") {
      router.push("/(app)/smileai");
    } else if (id === "privacy") {
      try {
        const canOpen = await Linking.canOpenURL(PRIVACY_POLICY_URL);
        if (canOpen) {
          await Linking.openURL(PRIVACY_POLICY_URL);
        } else {
          useToastStore.getState().show({
            variant: "error",
            title: "Could not open",
            message: "Privacy policy could not be opened.",
          });
        }
      } catch {
        useToastStore.getState().show({
          variant: "error",
          title: "Could not open",
          message: "Privacy policy could not be opened.",
        });
      }
    } else if (id === "account-deletion") {
      router.push("/(app)/profile/account-deletion");
    }
  }

  function renderMenuItem(item: MenuItem, index: number) {
    const isLast = index === menuItems.length - 1;
    return (
      <Pressable
        key={item.id}
        className="flex-row items-center px-4 py-4 active:opacity-70"
        style={
          !isLast ? { borderBottomWidth: 1, borderBottomColor: dividerColor } : undefined
        }
        onPress={() => handleMenuPress(item.id)}
      >
        <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Ionicons name={item.icon} size={18} color={colors.orange[500]} />
        </View>
        <Text className="flex-1 text-[15px] text-foreground">
          {item.label}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={chevronColor} />
      </Pressable>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <Animated.View
        className="flex-row items-center justify-between px-6 pb-2 pt-3"
        entering={FadeInDown.duration(220)}
      >
        <Text variant="h3" className="text-foreground">
          Profile
        </Text>
        <View className="flex-row items-center gap-1">
          <Pressable
            className="p-1.5"
            onPress={() => router.push("/(app)/smileai")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Chat with Smile"
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color={colors.info}
            />
          </Pressable>
          <ThemeToggle size={18} />
        </View>
      </Animated.View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-24"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <Animated.View
          className="mt-4 items-center rounded-2xl px-6 py-6"
          style={{ backgroundColor: cardBg }}
          entering={FadeInDown.delay(60).duration(220)}
        >
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              className="h-20 w-20 rounded-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-20 w-20 items-center justify-center rounded-full bg-primary">
              <Text className="text-2xl font-bold text-primary-foreground">
                {initials}
              </Text>
            </View>
          )}

          <View className="mt-3 flex-row items-center gap-1.5">
            <Text variant="h4" className="text-foreground">
              {fullName}
            </Text>
            {isVerified && (
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            )}
          </View>

          {smipayTag !== "" && (
            <Text className="mt-0.5 text-sm font-medium" style={{ color: colors.orange[600] }}>
              @{smipayTag}
            </Text>
          )}

          <Text className="mt-1 text-muted-foreground">{email}</Text>

          {phone !== "" && (
            <Text className="mt-0.5 text-sm text-muted-foreground">
              {phone}
            </Text>
          )}

          {isOtaDebugUser(email) ? (
            <Text
              className="mt-2 text-center"
              style={{
                fontSize: 9,
                lineHeight: 12,
                color: isDark ? "#64748B" : "#94A3B8",
                opacity: 0.9,
              }}
              selectable
            >
              OTA marker: {OTA_DEBUG_BUILD_MARKER}
            </Text>
          ) : null}
        </Animated.View>

        {/* Wallet & Tier info */}
        <Animated.View
          className="mt-4 flex-row rounded-2xl px-4 py-4"
          style={{ backgroundColor: cardBg }}
          entering={FadeInDown.delay(100).duration(220)}
        >
          <View className="flex-1 items-center">
            <Text className="text-xs text-muted-foreground">Wallet Balance</Text>
            <Text className="mt-1 text-lg font-bold text-foreground">
              {walletBalance}
            </Text>
          </View>

          <View
            className="mx-3"
            style={{ width: 1, backgroundColor: dividerColor }}
          />

          <View className="flex-1 items-center">
            <Text className="text-xs text-muted-foreground">Account Tier</Text>
            <Text className="mt-1 text-lg font-bold text-foreground">
              {tier?.name ?? "Basic"}
            </Text>
          </View>
        </Animated.View>

        {/* Menu items */}
        <Animated.View
          className="mt-6 overflow-hidden rounded-2xl"
          style={{ backgroundColor: cardBg }}
          entering={FadeInDown.delay(140).duration(220)}
        >
          {menuItems.map((item, index) => renderMenuItem(item, index))}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(180).duration(220)}
        >
          <Button
            variant="outline"
            className="mt-6 h-12 rounded-2xl border-destructive"
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <Spinner color="#ef4444" />
            ) : (
              <Text className="text-sm font-semibold text-destructive">
                Sign Out
              </Text>
            )}
          </Button>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
