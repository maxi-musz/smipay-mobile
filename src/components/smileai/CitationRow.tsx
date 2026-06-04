import { Pressable, ScrollView, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import type { SmileCitation } from "@/types/smileai";
import { CitationChip } from "./CitationChip";

type Props = {
  citations: SmileCitation[];
  onCitationPress?: (citation: SmileCitation) => void;
  onViewAll?: () => void;
};

const INLINE_LIMIT = 3;

/**
 * One horizontal row of source pills under an assistant reply — never a
 * tall vertical stack that pushes the chat off screen.
 */
export function CitationRow({ citations, onCitationPress, onViewAll }: Props) {
  const { isDark } = useAppTheme();
  if (!citations.length) return null;

  const visible = citations.slice(0, INLINE_LIMIT);
  const extra = citations.length - visible.length;

  return (
    <View style={{ marginTop: 8, width: "100%" }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      >
        {visible.map((c) => (
          <CitationChip
            key={`${c.chunk_id}-${c.doc_slug}`}
            citation={c}
            onPress={onCitationPress ? () => onCitationPress(c) : undefined}
          />
        ))}
        {extra > 0 ? (
          <Pressable
            onPress={onViewAll}
            disabled={!onViewAll}
            accessibilityRole="button"
            accessibilityLabel={`View ${extra} more sources`}
            style={{
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 10,
              justifyContent: "center",
              backgroundColor: isDark ? "rgba(245,130,32,0.15)" : "#FFF7ED",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: isDark ? "#FB923C" : "#C2520A",
              }}
            >
              +{extra} more
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
