import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { resolveClipboardText, SURFACE_MIN_CONFIDENCE } from "../lib/detect";
import {
  CAN_DETECT_SILENTLY,
  clipboardHasText,
  getClipboardText,
  readClipboardForUser,
} from "../lib/clipboard-source";
import {
  isOfferDismissed,
  isSuppressed,
  noteOfferDismissed,
  rememberDismissed,
  suggestionSignature,
} from "../lib/suggestion-memory";
import type { SmartPasteCandidate, SmartPasteKind } from "../lib/types";

export interface UseSmartPasteOptions {
  /** Kinds this field can hold, in preference order. */
  accepts: readonly SmartPasteKind[];
  /** `home` uses a stricter confidence floor than `field`. */
  surface: "home" | "field";
  onAccept: (candidate: SmartPasteCandidate) => void;
  /** Current field contents — never suggested back. */
  currentValue?: string;
  /** Turn off entirely, e.g. while a checkout modal is open. */
  enabled?: boolean;
  /** Allow manual paste but never prompt. */
  proactive?: boolean;
  /** Only used when `accepts` includes `"amount"`. */
  amountBounds?: { min?: number; max?: number };
}

export interface SmartPasteApi {
  suggestion: SmartPasteCandidate | null;
  /** Clipboard has text but the platform won't let us read it unprompted. */
  needsUserTap: boolean;
  hasClipboardText: boolean;
  hint: string | null;
  /** A read is in flight; on iOS this spans the "Allow Paste" alert. */
  pasting: boolean;
  accept: () => void;
  /** Close for this visit. Records nothing. */
  close: () => void;
  /** Explicit no — quietens this value for a few hours. */
  dismiss: () => void;
  applyText: (text: string) => boolean;
  pasteFromClipboard: () => Promise<boolean>;
}

const HINT_TTL_MS = 4500;

/**
 * Key for the offer state, which has no content to key on. Scoped by what the
 * field accepts so screens don't silence each other.
 */
function manualSignature(accepts: readonly SmartPasteKind[]): string {
  return `offer:${[...accepts].sort().join("+")}`;
}

function describe(accepts: readonly SmartPasteKind[]): string {
  if (accepts.includes("phone")) return "phone number";
  if (accepts.includes("meter")) return "meter number";
  if (accepts.includes("smartcard")) return "smartcard number";
  if (accepts.includes("account")) return "account number";
  if (accepts.includes("amount")) return "amount";
  return "number";
}

/**
 * Watches the clipboard for something this field can use. Scans on focus and
 * on return to the foreground. Where the clipboard can't be read unprompted
 * (iOS) it sets `needsUserTap` instead and classifies on the user's tap.
 */
export function useSmartPaste(options: UseSmartPasteOptions): SmartPasteApi {
  const {
    accepts,
    surface,
    onAccept,
    currentValue,
    enabled = true,
    proactive = true,
    amountBounds,
  } = options;

  const [suggestion, setSuggestion] = useState<SmartPasteCandidate | null>(null);
  const [needsUserTap, setNeedsUserTap] = useState(false);
  const [hasText, setHasText] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);

  const minConfidence =
    surface === "home"
      ? SURFACE_MIN_CONFIDENCE.home
      : SURFACE_MIN_CONFIDENCE.field;

  // Via refs so a changing field value doesn't re-subscribe the listeners.
  const onAcceptRef = useRef(onAccept);
  onAcceptRef.current = onAccept;
  const currentValueRef = useRef(currentValue);
  currentValueRef.current = currentValue;
  const acceptsRef = useRef(accepts);
  acceptsRef.current = accepts;
  const boundsRef = useRef(amountBounds);
  boundsRef.current = amountBounds;

  /**
   * `skipCurrent` drops a reading that matches the field's current value. Right
   * for an unprompted suggestion, wrong for a paste the user asked for — there
   * it would surface as "no number found".
   */
  const resolve = useCallback(
    (text: string, skipCurrent: boolean) =>
      resolveClipboardText(text, {
        accepts: acceptsRef.current,
        minConfidence,
        exclude: skipCurrent ? currentValueRef.current : undefined,
        amountBounds: boundsRef.current,
      }),
    [minConfidence],
  );

  /** `fresh` bypasses the per-foreground read cache. */
  const scanQuietly = useCallback(
    async (fresh = false) => {
      if (!enabled) {
        setSuggestion(null);
        setNeedsUserTap(false);
        return;
      }

      const has = await clipboardHasText();
      setHasText(has);

      if (!has || !proactive) {
        setSuggestion(null);
        setNeedsUserTap(false);
        return;
      }

      if (!CAN_DETECT_SILENTLY) {
        setSuggestion(null);
        setNeedsUserTap(!isOfferDismissed(manualSignature(acceptsRef.current)));
        return;
      }

      const text = await getClipboardText(fresh);
      if (!text) {
        setSuggestion(null);
        return;
      }

      const { candidate } = resolve(text, true);
      if (!candidate) {
        setSuggestion(null);
        return;
      }

      const seen = await isSuppressed(
        suggestionSignature(candidate.kind, candidate.value),
      );
      if (seen) {
        setSuggestion(null);
        return;
      }

      setHint(null);
      setSuggestion(candidate);
    },
    [enabled, proactive, resolve],
  );

  useFocusEffect(
    useCallback(() => {
      void scanQuietly();
    }, [scanQuietly]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") void scanQuietly(true);
    });
    return () => sub.remove();
  }, [scanQuietly]);

  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => setHint(null), HINT_TTL_MS);
    return () => clearTimeout(timer);
  }, [hint]);

  useEffect(() => {
    if (!suggestion || !currentValue) return;
    if (currentValue.replace(/\D/g, "") === suggestion.value) {
      setSuggestion(null);
    }
  }, [currentValue, suggestion]);

  // Accepting records nothing: `exclude` already covers the field it went into,
  // and the same number is often wanted on the next screen too.
  const accept = useCallback(() => {
    if (!suggestion) return;
    setSuggestion(null);
    setHint(null);
    onAcceptRef.current(suggestion);
  }, [suggestion]);

  const close = useCallback(() => {
    setSuggestion(null);
    setNeedsUserTap(false);
    setHint(null);
  }, []);

  const dismiss = useCallback(() => {
    if (suggestion) {
      void rememberDismissed(
        suggestionSignature(suggestion.kind, suggestion.value),
      );
    } else {
      noteOfferDismissed(manualSignature(acceptsRef.current));
    }

    setSuggestion(null);
    setNeedsUserTap(false);
    setHint(null);
  }, [suggestion]);

  const applyText = useCallback(
    (text: string): boolean => {
      const { candidate, containsSensitive } = resolve(text, false);

      if (!candidate) {
        setHint(
          containsSensitive
            ? "That looks like a card or ID number, so we didn't paste it."
            : `No ${describe(acceptsRef.current)} found on your clipboard.`,
        );
        return false;
      }

      setHint(null);
      setSuggestion(null);
      setNeedsUserTap(false);
      onAcceptRef.current(candidate);
      return true;
    },
    [resolve],
  );

  const pasteFromClipboard = useCallback(async (): Promise<boolean> => {
    setPasting(true);
    try {
      const read = await readClipboardForUser();

      if (read.status === "empty") {
        setHint("Your clipboard is empty.");
        return false;
      }
      if (read.status === "blocked") {
        setHint("Paste wasn't allowed. Tap Paste again and choose Allow Paste.");
        return false;
      }
      return applyText(read.text);
    } finally {
      setPasting(false);
    }
  }, [applyText]);

  return {
    suggestion,
    needsUserTap,
    hasClipboardText: hasText,
    hint,
    pasting,
    accept,
    close,
    dismiss,
    applyText,
    pasteFromClipboard,
  };
}
