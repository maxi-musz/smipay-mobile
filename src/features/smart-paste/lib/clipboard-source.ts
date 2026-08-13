import { AppState, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";

/**
 * Clipboard access, with the platform rules in one place.
 *
 * Android lets a foregrounded app read freely, but Android 12+ shows a
 * "pasted from …" toast per read, so we read once per foreground and share it.
 *
 * iOS shows a banner or an "Allow Paste" alert on any programmatic read, so we
 * never read unprompted — `hasStringAsync` (silent) tells us whether to offer,
 * and the read happens on the user's tap.
 */

/** Whether clipboard content can be read without the user asking. */
export const CAN_DETECT_SILENTLY = Platform.OS === "android";

interface ClipboardCache {
  text: string | null;
  at: number;
}

let cache: ClipboardCache | null = null;

// Bound at module load, not lazily: a lazy binding registers after the hooks'
// own listeners, and RN dispatches in registration order, so a foreground scan
// would read the cache before this cleared it.
AppState.addEventListener("change", (next) => {
  if (next === "active") cache = null;
});

/** Silent on every platform — never triggers an iOS prompt. */
export async function clipboardHasText(): Promise<boolean> {
  try {
    return await Clipboard.hasStringAsync();
  } catch {
    return false;
  }
}

/** Reads clipboard text, reusing the value already read this foreground. */
export async function getClipboardText(
  force = false,
): Promise<string | null> {
  if (!force && cache) return cache.text;

  try {
    const text = await Clipboard.getStringAsync();
    cache = { text: text || null, at: Date.now() };
    return cache.text;
  } catch {
    cache = { text: null, at: Date.now() };
    return null;
  }
}

/** Call after the app itself writes to the clipboard. */
export function invalidateClipboardCache(): void {
  cache = null;
}

export type ClipboardRead =
  | { status: "ok"; text: string }
  | { status: "empty" }
  /** Text is present but the OS withheld it — consent refused. */
  | { status: "blocked" };

/** Cumulative ~9s, long enough to read the iOS alert and decide. */
const CONSENT_RETRY_DELAYS_MS = [400, 600, 900, 1200, 1600, 2000, 2500];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function readOnce(): Promise<string> {
  try {
    return (await Clipboard.getStringAsync()) ?? "";
  } catch {
    return "";
  }
}

/**
 * Reads for a paste the user explicitly asked for.
 *
 * On iOS 16+ the first read of an ungranted pasteboard item returns empty
 * immediately and shows the "Allow Paste" alert asynchronously — it does not
 * block for the answer, so the promise resolves before the user taps anything.
 * `hasStringAsync` never prompts and still reports true in that state, which
 * distinguishes *empty* from *withheld*; when withheld, keep reading until the
 * user answers.
 */
export async function readClipboardForUser(): Promise<ClipboardRead> {
  const first = await readOnce();
  if (first) {
    cache = { text: first, at: Date.now() };
    return { status: "ok", text: first };
  }

  if (!(await clipboardHasText())) {
    cache = { text: null, at: Date.now() };
    return { status: "empty" };
  }

  for (const delay of CONSENT_RETRY_DELAYS_MS) {
    await sleep(delay);

    const text = await readOnce();
    if (text) {
      cache = { text, at: Date.now() };
      return { status: "ok", text };
    }

    // Item went away mid-wait — the user copied something else, or cleared it.
    if (!(await clipboardHasText())) {
      cache = { text: null, at: Date.now() };
      return { status: "empty" };
    }
  }

  return { status: "blocked" };
}
