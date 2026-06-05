import { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { MarkdownContent } from "./MarkdownContent";
import { CitationRow } from "./CitationRow";
import { filterDisplayCitations } from "./citation-display";
import { MessageCopyToolbar, type MessageCopyAnchor } from "./MessageCopyToolbar";
import { SMILEY_ASSISTANT_NAME } from "@/constants/smiley";
import type { SmileCitation, SmileMessage } from "@/types/smileai";

const LONG_PRESS_MS = 2000;

type Props = {
  role: "user" | "assistant";
  content: string;
  citations?: SmileCitation[];
  /** Delivery state for optimistic user messages. */
  localStatus?: SmileMessage["localStatus"];
  /** Server timestamp for the message (rendered as 12-hour HH:MM). */
  createdAt?: string;
  /** Render as plain text while the assistant is still streaming. */
  plainText?: boolean;
  onCitationPress?: (citation: SmileCitation) => void;
  /** When false, hides the tappable topic chips under assistant replies. */
  showCitationChips?: boolean;
  /** When false, long-press copy is disabled (e.g. non-text cards). */
  copyable?: boolean;
};

function formatBubbleTime(iso?: string): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return null;
  }
}

export function MessageBubble({
  role,
  content,
  citations,
  localStatus,
  createdAt,
  plainText,
  onCitationPress,
  showCitationChips = true,
  copyable = true,
}: Props) {
  const { isDark } = useAppTheme();
  const bubbleRef = useRef<View>(null);
  const [copyAnchor, setCopyAnchor] = useState<MessageCopyAnchor | null>(null);
  const isUser = role === "user";
  const canCopy = copyable && content.trim().length > 0;
  const displayCitations = filterDisplayCitations(citations ?? []);
  const bubbleBg = isUser
    ? isDark
      ? "#EA580C"
      : "#F97316"
    : isDark
      ? "#1E293B"
      : "#F1F5F9";
  const textColor = isUser ? "#FFFFFF" : isDark ? "#F8FAFC" : "#0F172A";
  const metaColor = isUser
    ? "rgba(255,255,255,0.78)"
    : isDark
      ? "#94A3B8"
      : "#64748B";
  const time = formatBubbleTime(createdAt);

  const showStatus = isUser && (localStatus === "sending" || localStatus === "sent");
  const accessibilityStatus =
    localStatus === "sending"
      ? " (sending)"
      : localStatus === "sent"
        ? " (sent)"
        : "";

  const handleLongPress = () => {
    if (!canCopy) return;
    bubbleRef.current?.measureInWindow((x, y, width, height) => {
      setCopyAnchor({ x, y, width, height });
    });
  };

  return (
    <View
      className={`mb-3 max-w-[88%] ${isUser ? "self-end" : "self-start"}`}
      accessibilityRole="text"
      accessibilityLabel={
        isUser
          ? `You: ${content}${accessibilityStatus}`
          : `${SMILEY_ASSISTANT_NAME}: ${content}`
      }
    >
      <Pressable
        onLongPress={canCopy ? handleLongPress : undefined}
        delayLongPress={LONG_PRESS_MS}
        accessibilityHint={canCopy ? "Press and hold to copy message" : undefined}
      >
        <View
          ref={bubbleRef}
          collapsable={false}
          style={{
            backgroundColor: bubbleBg,
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingTop: 10,
            paddingBottom: 6,
          }}
        >
        {isUser ? (
          <Text style={{ color: textColor, fontSize: 15, lineHeight: 22 }}>{content}</Text>
        ) : (
          <MarkdownContent
            content={content}
            color={textColor}
            plain={plainText}
          />
        )}
        {(time || showStatus) && (
          <View
            style={{
              marginTop: 4,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 4,
            }}
          >
            {time ? (
              <Text style={{ color: metaColor, fontSize: 11 }}>{time}</Text>
            ) : null}
            {showStatus ? (
              <Ionicons
                name={localStatus === "sending" ? "time-outline" : "checkmark"}
                size={13}
                color={metaColor}
              />
            ) : null}
          </View>
        )}
        </View>
      </Pressable>
      <MessageCopyToolbar
        visible={copyAnchor != null}
        anchor={copyAnchor}
        text={content}
        onClose={() => setCopyAnchor(null)}
      />
      {!isUser && showCitationChips && displayCitations.length > 0 ? (
        <CitationRow
          citations={displayCitations}
          onCitationPress={onCitationPress}
          onViewAll={
            onCitationPress && displayCitations.length > 0
              ? () => onCitationPress(displayCitations[0])
              : undefined
          }
        />
      ) : null}
    </View>
  );
}
