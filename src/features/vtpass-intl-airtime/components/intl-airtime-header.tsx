import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";

interface IntlAirtimeHeaderProps {
  /** Step title for wizard screens (e.g. "Product type"). Default: "International Airtime" */
  title?: string;
}

export function IntlAirtimeHeader({ title = "International Airtime" }: IntlAirtimeHeaderProps) {
  const { isDark } = useAppTheme();
  const iconColor = isDark ? colors.gray[400] : colors.gray[600];

  return (
    <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
      <Pressable
        onPress={() => router.back()}
        className="h-10 w-10 items-center justify-center rounded-full bg-muted"
      >
        <Ionicons name="arrow-back" size={22} color={iconColor} />
      </Pressable>
      <Text className="text-lg font-semibold text-foreground" numberOfLines={1}>
        {title}
      </Text>
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/(app)/(tabs)/history",
            params: { type: "airtime" },
          })
        }
        hitSlop={12}
      >
        <Text className="text-base font-medium text-primary">History</Text>
      </Pressable>
    </View>
  );
}
