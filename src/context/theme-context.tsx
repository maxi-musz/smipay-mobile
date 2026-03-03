import React, { createContext, useCallback, useMemo } from "react";
import { useColorScheme as useDeviceColorScheme } from "react-native";

import { darkTheme, lightTheme } from "@/constants/theme";
import type { Theme, ThemeMode } from "@/constants/theme";
import { useAppStore } from "@/store";

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useDeviceColorScheme();
  const mode = useAppStore.use.themeMode();
  const setThemeMode = useAppStore.use.setThemeMode();

  const resolvedDark =
    mode === "system" ? deviceScheme === "dark" : mode === "dark";

  const theme = resolvedDark ? darkTheme : lightTheme;

  const toggle = useCallback(() => {
    const next =
      mode === "system"
        ? resolvedDark ? "light" : "dark"
        : mode === "dark" ? "light" : "dark";
    setThemeMode(next);
  }, [mode, resolvedDark, setThemeMode]);

  const setMode = useCallback(
    (m: ThemeMode) => setThemeMode(m),
    [setThemeMode],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, isDark: resolvedDark, setMode, toggle }),
    [theme, mode, resolvedDark, setMode, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
