import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";

/**
 * Thin, always-visible reassurance strip pinned just under the chat header.
 *
 * Lives outside the message ScrollView so it never moves while the user
 * scrolls history. Mirrors the orange Smile brand and the lock metaphor
 * used on the home floating button.
 */
export function SecurityNotice() {
  const { isDark } = useAppTheme();
  const bg = isDark ? "rgba(245,130,32,0.10)" : "#FFF7ED";
  const border = isDark ? "rgba(251,146,60,0.18)" : "rgba(245,130,32,0.18)";
  const iconColor = isDark ? "#FB923C" : "#C2520A";
  const textColor = isDark ? "#FDBA74" : "#9A3412";

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="You are chatting with Smile, SmiPay's customer support AI. Your messages are encrypted and securely stored."
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: bg,
        borderBottomWidth: 1,
        borderBottomColor: border,
      }}
    >
      <Ionicons name="lock-closed" size={13} color={iconColor} />
      <Text
        numberOfLines={2}
        style={{
          flex: 1,
          fontSize: 11,
          lineHeight: 15,
          color: textColor,
        }}
      >
        You're chatting with Smile, SmiPay's customer support AI. Your messages
        are encrypted and securely stored.
      </Text>
    </View>
  );
}
