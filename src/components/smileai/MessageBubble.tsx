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
  /**
   * Name of a human support agent when this bubble is theirs (post-handoff).
   * Renders a small name label so the user can tell the specialist apart from
   * Smiley. Undefined for Smiley/user messages.
   */
  senderName?: string;
  /** When false, long-press copy is disabled (e.g. non-text cards). */
  copyable?: boolean;
  /**
   * WhatsApp-style quote of the user message this assistant reply answers.
   * Shown only when that message isn't directly above the reply (i.e. the
   * user sent more messages while Smiley was working).
   */
  replyToSnippet?: string;
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
  replyToSnippet,
  senderName,
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
          : `${senderName ?? SMILEY_ASSISTANT_NAME}: ${content}`
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
        {!isUser && senderName ? (
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: isDark ? "#7DD3FC" : "#0369A1",
              marginBottom: 4,
            }}
          >
            {senderName}
          </Text>
        ) : null}
        {!isUser && replyToSnippet ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderLeftWidth: 3,
              borderLeftColor: isDark ? "#FB923C" : "#F97316",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(15,23,42,0.05)",
              borderRadius: 6,
              paddingVertical: 4,
              paddingHorizontal: 8,
              marginBottom: 8,
            }}
          >
            <Ionicons
              name="arrow-undo-outline"
              size={12}
              color={isDark ? "#FB923C" : "#C2520A"}
            />
            <Text
              numberOfLines={1}
              style={{ flex: 1, fontSize: 12, color: isDark ? "#CBD5E1" : "#475569" }}
            >
              <Text style={{ fontWeight: "600" }}>You: </Text>
              {replyToSnippet}
            </Text>
          </View>
        ) : null}
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
