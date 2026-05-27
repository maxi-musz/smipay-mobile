import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";

export function AskSmileCard() {
  const { isDark } = useAppTheme();
  const bg = isDark ? "#1E293B" : "#FFF7ED";

  return (
    <Pressable
      onPress={() => router.push("/(app)/smileai/chat/new")}
      accessibilityRole="button"
      accessibilityLabel="Ask Smile anything"
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
        <Text className="font-semibold">Ask Smile anything</Text>
        <Text className="mt-0.5 text-sm text-muted-foreground">
          Transactions, KYC, limits — or talk to a human
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={isDark ? "#94A3B8" : "#64748B"} />
    </Pressable>
  );
}
