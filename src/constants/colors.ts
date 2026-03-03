/**
 * SmiPay brand color palette.
 * Single source of truth -- change a value here and it propagates everywhere.
 *
 * Orange extracted from the "S" / "Smi" in the logo.
 * Green extracted from the smile / "Pay" in the logo.
 */

export const colors = {
  // ── Brand ────────────────────────────────────────────
  orange: {
    50: "#FFF7ED",
    100: "#FFEDD5",
    200: "#FED7AA",
    300: "#FDBA74",
    400: "#FB923C",
    500: "#F58220", // ← primary brand orange (from logo)
    600: "#EA6C0B",
    700: "#C2520A",
    800: "#9A3F0D",
    900: "#7C320E",
    950: "#431506",
  },

  green: {
    50: "#ECFDF5",
    100: "#D1FAE5",
    200: "#A7F3D0",
    300: "#6EE7B7",
    400: "#34D399",
    500: "#1B8C3D", // ← primary brand green (from logo)
    600: "#15803D",
    700: "#166534",
    800: "#14532D",
    900: "#052E16",
    950: "#022C22",
  },

  // ── Neutrals ─────────────────────────────────────────
  white: "#FFFFFF",
  black: "#000000",

  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
    950: "#030712",
  },

  // ── Semantic ─────────────────────────────────────────
  success: "#16A34A",
  error: "#DC2626",
  warning: "#F59E0B",
  info: "#2563EB",
} as const;

export type ColorToken = typeof colors;
