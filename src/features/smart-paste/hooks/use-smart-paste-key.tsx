import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";

import type { KeypadKey } from "@/components/keypad";
import { colors } from "@/constants/colors";

import type { SmartPasteApi } from "./use-smart-paste";

export interface UseSmartPasteKeyOptions {
  paste: SmartPasteApi;
  /** Hide even when the clipboard has content, e.g. PIN entry. */
  enabled?: boolean;
}

/**
 * Paste key for the secure keypad's empty bottom-left cell — the custom keypad
 * replaces the system keyboard, and with it the paste gesture. Only appears
 * when the clipboard holds text. Pass to `<Keypad leftKey={…} />`.
 */
export function useSmartPasteKey({
  paste,
  enabled = true,
}: UseSmartPasteKeyOptions): KeypadKey | undefined {
  const { hasClipboardText, pasteFromClipboard } = paste;

  return useMemo<KeypadKey | undefined>(() => {
    if (!enabled || !hasClipboardText) return undefined;

    return {
      type: "action",
      id: "paste",
      accessibilityLabel: "Paste from clipboard",
      ghost: true,
      icon: (
        <Ionicons
          name="clipboard-outline"
          size={22}
          color={colors.orange[500]}
        />
      ),
      onPress: () => {
        void pasteFromClipboard();
      },
    };
  }, [enabled, hasClipboardText, pasteFromClipboard]);
}
