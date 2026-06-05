import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { SMILEY_ASSISTANT_NAME } from "@/constants/smiley";
import { useAppTheme } from "@/hooks/use-app-theme";

type Props = {
  hasRated: boolean;
  onSubmit: (rating: number, feedback?: string) => void;
  submitting?: boolean;
};

export function ClosedConversationFooter({
  hasRated,
  onSubmit,
  submitting = false,
}: Props) {
  const { isDark } = useAppTheme();
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");

  if (hasRated) {
    return (
      <View
        className="items-center px-4 py-5"
        accessibilityRole="text"
        accessibilityLabel="This conversation is closed. Thanks for your feedback."
      >
        <Ionicons
          name="checkmark-circle"
          size={28}
          color={isDark ? "#4ADE80" : "#16A34A"}
        />
        <Text className="mt-2 text-center text-base font-semibold">
          This conversation is closed
        </Text>
        <Text className="mt-1 text-center text-sm text-muted-foreground">
          Thanks for your feedback.
        </Text>
      </View>
    );
  }

  return (
    <View className="px-4 py-4">
      <Text className="text-center text-base font-semibold">
        This conversation is closed
      </Text>
      <Text className="mt-1 text-center text-sm text-muted-foreground">
        How was {SMILEY_ASSISTANT_NAME}? Your rating helps us improve.
      </Text>

      <View className="my-4 flex-row justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => setRating(n)}
            accessibilityRole="button"
            accessibilityLabel={`${n} stars`}
            hitSlop={8}
          >
            <Ionicons
              name={(rating ?? 0) >= n ? "star" : "star-outline"}
              size={32}
              color="#F97316"
            />
          </Pressable>
        ))}
      </View>

      <TextInput
        value={feedback}
        onChangeText={setFeedback}
        placeholder="Tell us more (optional)"
        placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
        multiline
        className="min-h-[72px] rounded-xl border border-border bg-background px-3 py-2 text-foreground"
      />

      <Button
        className="mt-3"
        disabled={rating == null || submitting}
        onPress={() =>
          rating != null && onSubmit(rating, feedback.trim() || undefined)
        }
      >
        <Text className="font-semibold text-primary-foreground">Submit rating</Text>
      </Button>
    </View>
  );
}
