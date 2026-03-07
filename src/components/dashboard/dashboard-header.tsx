import { Image, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { ThemeToggle } from "@/components/theme-toggle";
import { useResponsiveScale } from "@/hooks/use-responsive-scale";
import { useAuthStore, useHomepageStore } from "@/store";

const SUPPORT_ICON_COLOR = "#2563EB";

export function DashboardHeader() {
  const authUser = useAuthStore.use.user();
  const homepageData = useHomepageStore.use.data();
  const { s } = useResponsiveScale();

  const firstName =
    homepageData?.user?.first_name ?? authUser?.first_name ?? "there";

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
        <Image
          source={require("@/assets/images/icon.png")}
          style={{ width: s(40), height: s(40) }}
          className="rounded-xl"
          resizeMode="contain"
        />
        <Text
          className="font-bold text-foreground"
          style={{ fontSize: s(20) }}
        >
          Hi, {firstName}
        </Text>
      </Pressable>

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
        <ThemeToggle size={s(18)} />
      </View>
    </View>
  );
}
