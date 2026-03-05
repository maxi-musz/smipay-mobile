import { Image, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuthStore, useHomepageStore } from "@/store";

const ICON_SIZE = 18;
const SUPPORT_ICON_COLOR = "#2563EB";

export function DashboardHeader() {
  const authUser = useAuthStore.use.user();
  const homepageData = useHomepageStore.use.data();
  const { isDark } = useAppTheme();

  const firstName =
    homepageData?.user?.first_name ?? authUser?.first_name ?? "there";

  return (
    <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
      <Pressable
        className="flex-row items-center gap-3"
        onPress={() => router.push("/(app)/(tabs)/profile")}
      >
        <Image
          source={require("@/assets/images/icon.png")}
          className="h-10 w-10 rounded-xl"
          resizeMode="contain"
        />
        <Text className="text-xl font-bold text-foreground">
          Hi, {firstName}
        </Text>
      </Pressable>

      <View className="flex-row items-center gap-1">
        <Pressable
          className="p-1.5"
          onPress={() => router.push("/(app)/support")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Chat with support"
        >
          <Ionicons
            name="headset-outline"
            size={ICON_SIZE}
            color={SUPPORT_ICON_COLOR}
          />
        </Pressable>
        <ThemeToggle size={ICON_SIZE} />
      </View>
    </View>
  );
}
