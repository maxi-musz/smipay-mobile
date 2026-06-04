import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { DisclaimerBanner } from "./DisclaimerBanner";

const DEFAULT_CHIPS = [
  "Give me my transactions overview for this month",
  "Airtime purchase issue",
  "Data purchase issue",
  "What is cashback",
];

type Props = {
  firstName?: string;
  onChipPress: (text: string) => void;
  disabled?: boolean;
};

export function WelcomeCard({ firstName, onChipPress, disabled }: Props) {
  const greeting = firstName?.trim()
    ? `Hi ${firstName.trim()}, I'm Smile.`
    : "Hi, I'm Smile.";

  return (
    <View className="px-4 pt-6">
      <Text className="text-2xl font-bold">{greeting}</Text>
      <Text className="mt-2 text-muted-foreground">
        Ask about your transactions, airtime, data, cashback, or account limits.
      </Text>
      <View
        className="mt-6 flex-row flex-wrap gap-2"
        pointerEvents={disabled ? "none" : "auto"}
        style={disabled ? { opacity: 0.45 } : undefined}
      >
        {DEFAULT_CHIPS.map((chip) => (
          <Pressable
            key={chip}
            onPress={() => onChipPress(chip)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Suggestion: ${chip}`}
            accessibilityState={{ disabled: !!disabled }}
            className="rounded-full border border-border bg-card px-4 py-3"
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text className="text-sm">{chip}</Text>
          </Pressable>
        ))}
      </View>
      <View className="mt-8 rounded-xl bg-card p-4">
        <Text className="font-semibold">What I can do</Text>
        <Text className="mt-2 text-sm text-muted-foreground">
          • Summarise your recent transactions{"\n"}• Help with airtime and data
          purchases{"\n"}• Explain cashback, fees, and limits
        </Text>
      </View>
      <DisclaimerBanner />
    </View>
  );
}
