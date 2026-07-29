import type { ReactNode } from "react";

/**
 * One cell of the keypad grid. `empty` renders a same-sized spacer so the grid
 * never collapses (a missing cell is the classic cause of misaligned rows).
 */
export type KeypadKey =
  | { type: "digit"; value: string }
  | { type: "backspace" }
  | { type: "empty" }
  | {
      type: "action";
      /** Stable id — used for the press lock and as the React key. */
      id: string;
      label?: string;
      icon?: ReactNode;
      onPress: () => void;
      disabled?: boolean;
      accessibilityLabel?: string;
      /** Overrides the default key text colour (e.g. brand orange). */
      tint?: string;
      /** Renders without the tile background — a plain text/icon button. */
      ghost?: boolean;
    };

export type KeypadLayout = readonly (readonly KeypadKey[])[];

/** What a key press should feel like. Mapped to a platform primitive at runtime. */
export type KeypadHapticEvent = "key" | "delete" | "reject";

export type KeypadHapticAdapter = (event: KeypadHapticEvent) => void;

/** Tile look. `tiles` = filled key backgrounds, `flat` = numbers on the surface. */
export type KeypadAppearance = "tiles" | "flat";

/** What a held backspace does. */
export type KeypadBackspaceBehavior = "repeat" | "clear" | "none";
