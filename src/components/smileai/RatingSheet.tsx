import { useState } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { SMILEY_ASSISTANT_NAME } from "@/constants/smiley";
import { useAppTheme } from "@/hooks/use-app-theme";

type Props = {
  visible: boolean;
  onSubmit: (rating: number, feedback?: string) => void;
  onDismiss: () => void;
  submitting?: boolean;
};

export function RatingSheet({ visible, onSubmit, onDismiss, submitting }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const sheetBg = isDark ? "#1E293B" : "#FFFFFF";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onDismiss}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: sheetBg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 20,
            paddingTop: 16,
          }}
        >
          <Text className="text-lg font-semibold">How was {SMILEY_ASSISTANT_NAME}?</Text>
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
                  size={36}
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
            className="min-h-[80px] rounded-xl border border-border bg-background px-3 py-2 text-foreground"
          />
          <Button
            className="mt-4"
            disabled={rating == null || submitting}
            onPress={() => rating != null && onSubmit(rating, feedback.trim() || undefined)}
          >
            <Text className="font-semibold text-primary-foreground">Submit</Text>
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
