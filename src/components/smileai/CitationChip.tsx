import { Pressable } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import type { SmileCitation } from "@/types/smileai";

type Props = {
  citation: SmileCitation;
  onPress?: () => void;
};

export function CitationChip({ citation, onPress }: Props) {
  const { isDark } = useAppTheme();
  const label = `${citation.doc_slug}${citation.heading ? ` · ${citation.heading}` : ""}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Citation ${label}`}
      style={{
        backgroundColor: isDark ? "#334155" : "#E2E8F0",
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 6,
        minHeight: 44,
        justifyContent: "center",
      }}
    >
      <Text className="text-xs text-muted-foreground" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
