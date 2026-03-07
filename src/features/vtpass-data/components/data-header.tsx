import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";

interface DataHeaderProps {
  /** When true, show "Buy Data" with wifi icon and subtitle (web-style). Default: true on main screen. */
  showBuyDataTitle?: boolean;
  /** Step title when not using Buy Data title (e.g. "Amount & pay"). */
  title?: string;
}

export function DataHeader({
  showBuyDataTitle = true,
  title = "Data",
}: DataHeaderProps) {
  const { isDark } = useAppTheme();
  const iconColor = isDark ? colors.gray[400] : colors.gray[600];

  return (
    <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
      <Pressable
        onPress={() => router.back()}
        className="h-10 w-10 items-center justify-center rounded-full"
        hitSlop={12}
      >
        <Ionicons name="arrow-back" size={24} color={iconColor} />
      </Pressable>

      {showBuyDataTitle ? (
        <View className="flex-1 items-center justify-center px-2">
          <View className="flex-row items-center gap-2">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/15">
              <Ionicons name="wifi" size={20} color={colors.orange[500]} />
            </View>
            <Text className="text-lg font-bold text-foreground">Buy Data</Text>
          </View>
          <Text
            className="mt-1 text-center text-xs text-muted-foreground"
            numberOfLines={1}
          >
            Choose a network and data plan.
          </Text>
        </View>
      ) : (
        <Text
          className="flex-1 text-center text-lg font-semibold text-foreground"
          numberOfLines={1}
        >
          {title}
        </Text>
      )}

      <Pressable
        onPress={() =>
          router.push({
            pathname: "/(app)/(tabs)/history",
            params: { type: "data" },
          })
        }
        className="min-w-[60] items-end"
        hitSlop={12}
      >
        <Text className="text-base font-medium text-primary">History</Text>
      </Pressable>
    </View>
  );
}
