import { useMemo } from "react";

import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";

export interface KeypadColors {
  /** Dock / panel background behind the keys. */
  surface: string;
  /** Key tile background at rest. */
  key: string;
  /** Key tile background while held. */
  keyPressed: string;
  /** Digit glyph colour. */
  keyText: string;
  /** Icons and secondary labels. */
  keyMuted: string;
  /** Hairline above the dock and around boxed slots. */
  separator: string;
  /** Brand accent — active slot, secure badge, caret. */
  accent: string;
  /** Filled dot / completed slot colour. */
  filled: string;
  /** Error state (invalid PIN, expired code). */
  danger: string;
}

const LIGHT: KeypadColors = {
  surface: "#FFFFFF",
  key: "#F1F3F6",
  keyPressed: "#DFE3E9",
  keyText: "#0F172A",
  keyMuted: "#64748B",
  separator: "rgba(15,23,42,0.08)",
  accent: colors.orange[500],
  filled: "#0F172A",
  danger: colors.error,
};

const DARK: KeypadColors = {
  surface: "#0F172A",
  key: "#1E293B",
  keyPressed: "#334155",
  keyText: "#F8FAFC",
  keyMuted: "#94A3B8",
  separator: "rgba(255,255,255,0.10)",
  accent: colors.orange[500],
  filled: "#F8FAFC",
  danger: "#F87171",
};

export type KeypadColorOverrides = Partial<KeypadColors>;

/**
 * Resolves the keypad palette from the app theme, with per-call overrides.
 * Pass `scheme` to pin the palette (e.g. a keypad on an always-dark sheet).
 */
export function useKeypadColors(
  overrides?: KeypadColorOverrides,
  scheme?: "light" | "dark",
): KeypadColors {
  const { isDark } = useAppTheme();
  const dark = scheme ? scheme === "dark" : isDark;

  return useMemo(
    () => ({ ...(dark ? DARK : LIGHT), ...overrides }),
    // Overrides are usually an inline object; compare by value, not identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dark, JSON.stringify(overrides ?? null)],
  );
}

export const keypadPalettes = { light: LIGHT, dark: DARK };
