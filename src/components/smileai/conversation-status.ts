import type { AIConversationStatus } from "@/types/smileai";

const TERMINAL_STATUSES: ReadonlySet<AIConversationStatus> = new Set([
  "closed",
  "resolved",
  "abandoned",
]);

export function isTerminalConversationStatus(
  status: string | undefined | null,
): boolean {
  return TERMINAL_STATUSES.has(status as AIConversationStatus);
}
