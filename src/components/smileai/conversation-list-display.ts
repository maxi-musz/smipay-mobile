import type {
  AIConversationStatus,
  SmileConversationListItem,
} from "@/types/smileai";

const DEFAULT_TITLE = "New conversation";

const STATUS_LABEL: Record<AIConversationStatus, string> = {
  active: "Active",
  awaiting_user: "Waiting for you",
  handoff_pending: "Connecting to support",
  handed_off: "With support",
  resolved: "Resolved",
  closed: "Closed",
  abandoned: "Abandoned",
};

export function conversationListTitle(item: SmileConversationListItem): string {
  return item.title_preview?.trim() || DEFAULT_TITLE;
}

/** WhatsApp-style subtitle: last message, prefixed with "You: " when the user sent it. */
export function conversationListSubtitle(
  item: SmileConversationListItem,
): string {
  const preview = item.last_message_preview?.trim();
  if (!preview) return STATUS_LABEL[item.status] ?? "";
  if (item.last_message_role === "user") return `You: ${preview}`;
  return preview;
}

export function conversationAccessibilityLabel(
  item: SmileConversationListItem,
): string {
  const title = conversationListTitle(item);
  const subtitle = conversationListSubtitle(item);
  return `${title}. ${subtitle}`;
}
