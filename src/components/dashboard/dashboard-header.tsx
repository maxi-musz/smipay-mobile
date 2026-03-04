import { Image, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuthStore } from "@/store";

export function DashboardHeader() {
  const user = useAuthStore.use.user();
  const lock = useAuthStore.use.lock();
  const { isDark } = useAppTheme();
  const firstName = user?.first_name ?? "there";

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
        <Pressable className="p-2" onPress={lock} hitSlop={8}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={isDark ? "#E5E7EB" : "#374151"}
          />
        </Pressable>
        <ThemeToggle />
      </View>
    </View>
  );
}
