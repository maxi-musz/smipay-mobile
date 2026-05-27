import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { DisclaimerBanner } from "./DisclaimerBanner";

const DEFAULT_CHIPS = [
  "Why was my transfer pending?",
  "Buy MTN airtime",
  "How do I upgrade my KYC?",
];

type Props = {
  firstName?: string;
  onChipPress: (text: string) => void;
};

export function WelcomeCard({ firstName, onChipPress }: Props) {
  const greeting = firstName?.trim()
    ? `Hi ${firstName.trim()}, I'm Smile.`
    : "Hi, I'm Smile.";

  return (
    <View className="px-4 pt-6">
      <Text className="text-2xl font-bold">{greeting}</Text>
      <Text className="mt-2 text-muted-foreground">
        Ask about transactions, KYC, limits, or get help from a human.
      </Text>
      <View className="mt-6 flex-row flex-wrap gap-2">
        {DEFAULT_CHIPS.map((chip) => (
          <Pressable
            key={chip}
            onPress={() => onChipPress(chip)}
            accessibilityRole="button"
            accessibilityLabel={`Suggestion: ${chip}`}
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
          • Look up recent transactions{"\n"}• Explain fees and limits{"\n"}• Connect
          you to support when needed
        </Text>
      </View>
      <DisclaimerBanner />
    </View>
  );
}
