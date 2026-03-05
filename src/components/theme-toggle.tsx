import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/hooks/use-app-theme";

interface ThemeToggleProps {
  size?: number;
}

export function ThemeToggle({ size = 18 }: ThemeToggleProps) {
  const { isDark, toggle } = useAppTheme();

  return (
    <Pressable
      onPress={toggle}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="h-9 w-9 items-center justify-center rounded-full active:bg-muted"
    >
      <Ionicons
        name={isDark ? "sunny-outline" : "moon-outline"}
        size={size}
        color={isDark ? "#FBBF24" : "#6B7280"}
      />
    </Pressable>
  );
}
