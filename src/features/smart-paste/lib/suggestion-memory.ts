import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";

/**
 * Remembers what the user turned down.
 *
 * Two kinds, with deliberately different lifetimes:
 *
 * - A *suggestion* is keyed to the number itself, so it persists for a few
 *   hours; copying anything else clears it on its own.
 * - An *offer* has no content to key on, so it can only be keyed to the field.
 *   That is far too broad to persist — the clipboard changes while it is in
 *   force — so it lasts one foreground and is never written to storage.
 */

const STORAGE_KEY = "@smipay/smart_paste_memory_v2";

const SEEN_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_SEEN = 30;

interface MemoryShape {
  /** signature → epoch ms when it was turned down. */
  seen: Record<string, number>;
}

let memory: MemoryShape | null = null;
let loading: Promise<MemoryShape> | null = null;

export function suggestionSignature(kind: string, value: string): string {
  return `${kind}:${value}`;
}

function prune(state: MemoryShape): MemoryShape {
  const now = Date.now();
  const fresh = Object.entries(state.seen)
    .filter(([, at]) => now - at < SEEN_TTL_MS)
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_SEEN);

  return { seen: Object.fromEntries(fresh) };
}

async function load(): Promise<MemoryShape> {
  if (memory) return memory;
  if (loading) return loading;

  loading = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<MemoryShape>) : null;
      memory = prune({
        seen:
          parsed && typeof parsed.seen === "object" && parsed.seen
            ? parsed.seen
            : {},
      });
    } catch {
      memory = { seen: {} };
    }
    loading = null;
    return memory;
  })();

  return loading;
}

/** Fire-and-forget: a lost write only costs one extra prompt. */
function persist(next: MemoryShape): void {
  memory = next;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
}

export async function isSuppressed(signature: string): Promise<boolean> {
  const state = await load();
  const at = state.seen[signature];
  const suppressed = at != null && Date.now() - at < SEEN_TTL_MS;

  if (__DEV__ && suppressed) {
    console.log(
      `[smart-paste] suppressed "${signature}" — turned down ${Math.round(
        (Date.now() - at) / 60000,
      )} min ago. resetSmartPasteMemory() clears this.`,
    );
  }

  return suppressed;
}

/** Only for an explicit "Not now" or dismiss — not a backdrop tap. */
export async function rememberDismissed(signature: string): Promise<void> {
  const state = await load();
  persist(prune({ seen: { ...state.seen, [signature]: Date.now() } }));
}

/**
 * Offers dismissed this foreground. Cleared on return from another app, which
 * is the moment the clipboard could have changed and the offer become useful
 * again.
 */
const dismissedOffers = new Set<string>();

AppState.addEventListener("change", (next) => {
  if (next === "active") dismissedOffers.clear();
});

export function noteOfferDismissed(signature: string): void {
  dismissedOffers.add(signature);
}

export function isOfferDismissed(signature: string): boolean {
  return dismissedOffers.has(signature);
}

export async function resetSmartPasteMemory(): Promise<void> {
  memory = { seen: {} };
  dismissedOffers.clear();
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}
