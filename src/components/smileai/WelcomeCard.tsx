import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { SMILEY_ASSISTANT_NAME } from "@/constants/smiley";
import { useAppTheme } from "@/hooks/use-app-theme";
import { SmileAvatar } from "./SmileAvatar";
import { DisclaimerBanner } from "./DisclaimerBanner";

/**
 * Starter prompts shown on the empty new-chat screen. Each maps to a
 * service that is actually available today (transactions, airtime, data,
 * cashback) so the first tap never leads Smiley into a coming-soon topic.
 */
const SUGGESTIONS: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
}[] = [
  { icon: "receipt-outline", text: "Show my transactions this month" },
  { icon: "call-outline", text: "I had an airtime purchase issue" },
  { icon: "wifi-outline", text: "I had a data purchase issue" },
  { icon: "gift-outline", text: "How does cashback work?" },
];

const CAPABILITIES = [
  "Summarise your recent transactions",
  "Help with airtime, data and bill payments",
  "Explain cashback, fees, and limits",
];

type Props = {
  firstName?: string;
  onChipPress: (text: string) => void;
  disabled?: boolean;
};

export function WelcomeCard({ firstName, onChipPress, disabled }: Props) {
  const { isDark } = useAppTheme();
  const greeting = firstName?.trim()
    ? `Hi ${firstName.trim()}, I'm ${SMILEY_ASSISTANT_NAME}`
    : `Hi, I'm ${SMILEY_ASSISTANT_NAME}`;

  const brand = isDark ? "#FB923C" : "#C2520A";
  const bubble = isDark ? "rgba(245,130,32,0.15)" : "#FFF7ED";
  const muted = isDark ? "#64748B" : "#94A3B8";

  return (
    <View className="px-4 pt-6">
      {/* Hero */}
      <View className="items-center">
        <SmileAvatar size={72} withHalo />
        <Text className="mt-4 text-center text-2xl font-bold">{greeting}</Text>
        <Text
          className="mt-2 px-2 text-center text-muted-foreground"
          style={{ fontSize: 15, lineHeight: 21 }}
        >
          Your SmiPay assistant for airtime, data, bills, transactions and
          cashback. Ask me anything — or tap a suggestion to start.
        </Text>
        <View
          className="mt-3 flex-row items-center rounded-full px-3 py-1"
          style={{ backgroundColor: bubble }}
        >
          <Ionicons name="lock-closed" size={11} color={brand} />
          <Text
            className="ml-1"
            style={{ fontSize: 11, fontWeight: "600", color: brand }}
          >
            Private & securely stored
          </Text>
        </View>
      </View>

      {/* Starter prompts */}
      <Text className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Try asking
      </Text>
      <View
        className="gap-2"
        pointerEvents={disabled ? "none" : "auto"}
        style={disabled ? { opacity: 0.45 } : undefined}
      >
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s.text}
            onPress={() => onChipPress(s.text)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Suggestion: ${s.text}`}
            accessibilityState={{ disabled: !!disabled }}
            className="flex-row items-center rounded-2xl border border-border bg-card px-3 active:opacity-80"
            style={{ minHeight: 56 }}
          >
            <View
              className="items-center justify-center rounded-full"
              style={{ width: 36, height: 36, backgroundColor: bubble }}
            >
              <Ionicons name={s.icon} size={18} color={brand} />
            </View>
            <Text className="ml-3 flex-1 text-[15px]">{s.text}</Text>
            <Ionicons name="arrow-forward" size={16} color={muted} />
          </Pressable>
        ))}
      </View>

      {/* Capabilities */}
      <View className="mt-6 rounded-2xl bg-card p-4">
        <Text className="font-semibold">What I can do</Text>
        <View className="mt-3 gap-2">
          {CAPABILITIES.map((c) => (
            <View key={c} className="flex-row items-center">
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={brand}
                style={{ marginRight: 8 }}
              />
              <Text className="flex-1 text-sm text-muted-foreground">{c}</Text>
            </View>
          ))}
        </View>
      </View>

      <DisclaimerBanner />
    </View>
  );
}
