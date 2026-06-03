import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import type { SmileConversationListItem } from "@/types/smileai";
import {
  conversationAccessibilityLabel,
  conversationListSubtitle,
  conversationListTitle,
} from "./conversation-list-display";

type Props = {
  item: SmileConversationListItem;
  onPress: () => void;
  isDark: boolean;
  timeAgo: string;
  /** Landing cards show a Smile chip; drawer rows show status in the chip instead. */
  chipLabel: string;
  chipBg: string;
  chipText: string;
  cardBg: string;
  showChevron?: boolean;
  isCurrent?: boolean;
  railColor?: string;
  opacity?: number;
  compact?: boolean;
};

export function ConversationListRow({
  item,
  onPress,
  isDark,
  timeAgo,
  chipLabel,
  chipBg,
  chipText,
  cardBg,
  showChevron = false,
  isCurrent = false,
  railColor,
  opacity = 1,
  compact = false,
}: Props) {
  const title = conversationListTitle(item);
  const subtitle = conversationListSubtitle(item);

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: cardBg,
        borderRadius: 12,
        padding: compact ? 12 : 16,
        marginBottom: compact ? 8 : 10,
        minHeight: 44,
        opacity,
        borderLeftWidth: isCurrent ? 3 : 0,
        borderLeftColor: railColor,
      }}
      accessibilityRole="button"
      accessibilityLabel={conversationAccessibilityLabel(item)}
    >
      <View className="flex-row items-start" style={{ gap: 8 }}>
        <View
          style={{
            backgroundColor: chipBg,
            paddingHorizontal: compact ? 6 : 8,
            paddingVertical: 2,
            borderRadius: 999,
            marginTop: 2,
          }}
        >
          <Text
            style={{
              fontSize: compact ? 10 : 11,
              fontWeight: "600",
              color: chipText,
            }}
          >
            {chipLabel}
          </Text>
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
            <Text
              className={compact ? "flex-1 text-sm font-medium" : "flex-1 font-medium"}
              numberOfLines={1}
            >
              {title}
            </Text>
            {timeAgo ? (
              <Text
                className="text-muted-foreground"
                style={{ fontSize: compact ? 11 : 12, flexShrink: 0 }}
              >
                {timeAgo}
              </Text>
            ) : null}
          </View>
          {subtitle ? (
            <Text
              className="text-muted-foreground"
              numberOfLines={1}
              style={{
                fontSize: compact ? 11 : 12,
                marginTop: 4,
                lineHeight: compact ? 15 : 16,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {showChevron ? (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isDark ? "#94A3B8" : "#94A3B8"}
            style={{ marginTop: 2 }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
