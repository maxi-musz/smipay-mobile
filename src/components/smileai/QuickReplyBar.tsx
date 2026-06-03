import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";

type Props = {
  suggestions: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
};

/**
 * Horizontal quick-reply strip above the composer — larger tap targets and
 * clearer contrast than tiny pills.
 */
export function QuickReplyBar({ suggestions, onSelect, disabled }: Props) {
  const { isDark } = useAppTheme();
  const chipBg = isDark ? "#1E293B" : "#FFFFFF";
  const chipBorder = isDark ? "rgba(148,163,184,0.25)" : "#E2E8F0";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const accent = isDark ? "#FB923C" : "#EA580C";

  return (
    <View
      className="bg-background px-4 py-2"
      pointerEvents={disabled ? "none" : "auto"}
      style={disabled ? { opacity: 0.45 } : undefined}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
      >
        {suggestions.map((s) => (
          <Pressable
            key={s}
            onPress={() => onSelect(s)}
            accessibilityRole="button"
            accessibilityLabel={`Suggested question: ${s}`}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              maxWidth: 280,
              backgroundColor: chipBg,
              borderWidth: 1,
              borderColor: chipBorder,
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 12,
              minHeight: 48,
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={accent} />
            <Text
              numberOfLines={2}
              style={{
                flexShrink: 1,
                fontSize: 15,
                fontWeight: "500",
                lineHeight: 20,
                color: textColor,
              }}
            >
              {s}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
