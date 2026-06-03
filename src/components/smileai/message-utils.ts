import type { SmileMessage } from "@/types/smileai";

function byTime(a: SmileMessage, b: SmileMessage): number {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

/**
 * Collapse duplicate rows that appear when optimistic client ids race with
 * server fetches, or when the engine persisted the same turn twice.
 */
export function dedupeSmileMessages(messages: SmileMessage[]): SmileMessage[] {
  const sorted = [...messages].sort(byTime);

  const byId = new Map<string, SmileMessage>();
  for (const m of sorted) byId.set(m.id, m);
  const unique = [...byId.values()].sort(byTime);

  const serverUserText = new Set(
    unique
      .filter((m) => m.role === "user" && !m.localStatus)
      .map((m) => m.content.trim()),
  );

  const withoutOptimisticDupes = unique.filter((m) => {
    if (m.role !== "user" || !m.localStatus) return true;
    return !serverUserText.has(m.content.trim());
  });

  const seenUserText = new Set<string>();
  const seenAssistantText = new Set<string>();
  const out: SmileMessage[] = [];

  for (const m of withoutOptimisticDupes) {
    const text = m.content.trim();
    if (m.role === "user") {
      if (seenUserText.has(text)) continue;
      seenUserText.add(text);
    } else if (m.role === "assistant") {
      if (seenAssistantText.has(text)) continue;
      seenAssistantText.add(text);
    }
    out.push(m);
  }

  return out;
}

export function mergeSmileMessages(
  existing: SmileMessage[],
  incoming: SmileMessage[],
): SmileMessage[] {
  const byId = new Map<string, SmileMessage>();
  for (const m of existing) byId.set(m.id, m);
  for (const m of incoming) {
    if (!byId.has(m.id)) byId.set(m.id, m);
  }
  return dedupeSmileMessages([...byId.values()]);
}
