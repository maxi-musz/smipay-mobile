/**
 * Light & dark theme semantic tokens.
 * These map abstract roles (background, text, border, …) to concrete colors.
 * Components should reference these tokens so the entire app re-skins with one toggle.
 */

import { colors } from "./colors";

export interface Theme {
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  primary: string;
  primaryLight: string;
  primaryDark: string;

  secondary: string;
  secondaryLight: string;
  secondaryDark: string;

  border: string;
  borderStrong: string;

  card: string;
  cardElevated: string;

  success: string;
  error: string;
  warning: string;
  info: string;

  overlay: string;
  shadow: string;
}

export type ThemeMode = "light" | "dark" | "system";

export const lightTheme: Theme = {
  background: colors.white,
  backgroundSecondary: colors.gray[50],
  backgroundTertiary: colors.gray[100],

  text: colors.gray[900],
  textSecondary: colors.gray[600],
  textTertiary: colors.gray[400],
  textInverse: colors.white,

  primary: colors.orange[500],
  primaryLight: colors.orange[100],
  primaryDark: colors.orange[700],

  secondary: colors.green[500],
  secondaryLight: colors.green[100],
  secondaryDark: colors.green[700],

  border: colors.gray[200],
  borderStrong: colors.gray[300],

  card: colors.white,
  cardElevated: colors.white,

  success: colors.success,
  error: colors.error,
  warning: colors.warning,
  info: colors.info,

  overlay: "rgba(0, 0, 0, 0.5)",
  shadow: "rgba(0, 0, 0, 0.08)",
};

export const darkTheme: Theme = {
  background: colors.gray[900],
  backgroundSecondary: colors.gray[800],
  backgroundTertiary: colors.gray[700],

  text: colors.gray[50],
  textSecondary: colors.gray[400],
  textTertiary: colors.gray[500],
  textInverse: colors.gray[900],

  primary: colors.orange[400],
  primaryLight: colors.orange[950],
  primaryDark: colors.orange[300],

  secondary: colors.green[400],
  secondaryLight: colors.green[950],
  secondaryDark: colors.green[300],

  border: colors.gray[700],
  borderStrong: colors.gray[600],

  card: colors.gray[800],
  cardElevated: colors.gray[700],

  success: "#22C55E",
  error: "#EF4444",
  warning: "#FBBF24",
  info: "#3B82F6",

  overlay: "rgba(0, 0, 0, 0.7)",
  shadow: "rgba(0, 0, 0, 0.3)",
};
