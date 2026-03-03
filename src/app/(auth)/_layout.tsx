import { View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout() {
  const { top } = useSafeAreaInsets();

  return (
    <View className="flex-1">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
          animation: "slide_from_right",
        }}
      />
      <View
        style={{ top: top + 8 }}
        className="absolute right-4 z-10"
      >
        <ThemeToggle />
      </View>
    </View>
  );
}
