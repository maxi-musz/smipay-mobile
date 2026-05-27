import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { CitationChip } from "./CitationChip";
import type { SmileCitation } from "@/types/smileai";

type Props = {
  role: "user" | "assistant";
  content: string;
  citations?: SmileCitation[];
  onCitationPress?: (citation: SmileCitation) => void;
};

export function MessageBubble({ role, content, citations, onCitationPress }: Props) {
  const { isDark } = useAppTheme();
  const isUser = role === "user";
  const bubbleBg = isUser
    ? isDark
      ? "#EA580C"
      : "#F97316"
    : isDark
      ? "#1E293B"
      : "#F1F5F9";
  const textColor = isUser ? "#FFFFFF" : isDark ? "#F8FAFC" : "#0F172A";

  return (
    <View
      className={`mb-3 max-w-[88%] ${isUser ? "self-end" : "self-start"}`}
      accessibilityRole="text"
      accessibilityLabel={isUser ? `You: ${content}` : `Smile: ${content}`}
    >
      <View
        style={{
          backgroundColor: bubbleBg,
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text style={{ color: textColor, fontSize: 15, lineHeight: 22 }}>{content}</Text>
      </View>
      {!isUser && citations && citations.length > 0 ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {citations.map((c) => (
            <CitationChip
              key={`${c.chunk_id}-${c.doc_slug}`}
              citation={c}
              onPress={() => onCitationPress?.(c)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
