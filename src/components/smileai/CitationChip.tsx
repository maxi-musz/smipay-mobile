import { Pressable } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import type { SmileCitation } from "@/types/smileai";
import { formatCitationTitle } from "./citation-display";

type Props = {
  citation: SmileCitation;
  onPress?: () => void;
};

/** Compact horizontal pill — title only, no KB numbering. */
export function CitationChip({ citation, onPress }: Props) {
  const { isDark } = useAppTheme();
  const title = formatCitationTitle(citation);

  const bg = isDark ? "#1E293B" : "#FFFFFF";
  const border = isDark ? "rgba(148,163,184,0.28)" : "#E2E8F0";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !onPress }}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 10,
        maxWidth: 240,
        opacity: !onPress ? 0.55 : pressed ? 0.85 : 1,
      })}
    >
      <Text
        numberOfLines={2}
        style={{
          fontSize: 14,
          fontWeight: "500",
          lineHeight: 19,
          color: textColor,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
