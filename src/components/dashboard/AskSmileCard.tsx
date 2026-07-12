import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { SMILEY_ASSISTANT_NAME } from "@/constants/smiley";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";

export function AskSmileCard() {
  const { isDark } = useAppTheme();
  const bg = isDark ? "#1E293B" : "#FFF7ED";

  return (
    <Pressable
      onPress={() => router.push("/(app)/smileai")}
      accessibilityRole="button"
      accessibilityLabel={`Ask ${SMILEY_ASSISTANT_NAME} anything`}
      className="mx-4 mb-4"
      style={{
        backgroundColor: bg,
        borderRadius: 16,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        minHeight: 44,
        borderWidth: 1,
        borderColor: isDark ? "#334155" : "#FED7AA",
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "#F97316",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="happy" size={22} color="#FFFFFF" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-semibold">Ask {SMILEY_ASSISTANT_NAME} anything</Text>
        <Text className="mt-0.5 text-sm text-muted-foreground">
          Transactions, airtime, data, cashback — or connect to a specialist
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={isDark ? "#94A3B8" : "#64748B"} />
    </Pressable>
  );
}
