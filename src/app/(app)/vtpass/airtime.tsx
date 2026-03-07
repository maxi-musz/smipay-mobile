import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";

export default function VtpassAirtimeScreen() {
  const { isDark } = useAppTheme();
  const iconColor = isDark ? colors.gray[400] : colors.gray[600];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center gap-3 px-5 pt-2 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-muted"
        >
          <Ionicons name="arrow-back" size={22} color={iconColor} />
        </Pressable>
        <Text className="text-lg font-semibold text-foreground">Airtime</Text>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center text-foreground">
          vtpass airtime provider
        </Text>
      </View>
    </SafeAreaView>
  );
}
