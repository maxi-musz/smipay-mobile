import React, { createContext, useCallback, useMemo, useState } from "react";
import { useColorScheme as useDeviceColorScheme } from "react-native";

import { darkTheme, lightTheme } from "@/constants/theme";
import type { Theme, ThemeMode } from "@/constants/theme";

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
  const [mode, setMode] = useState<ThemeMode>("system");

  const resolvedDark =
    mode === "system" ? deviceScheme === "dark" : mode === "dark";

  const theme = resolvedDark ? darkTheme : lightTheme;

  const toggle = useCallback(() => {
    setMode((prev) => {
      if (prev === "system") return resolvedDark ? "light" : "dark";
      return prev === "dark" ? "light" : "dark";
    });
  }, [resolvedDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, isDark: resolvedDark, setMode, toggle }),
    [theme, mode, resolvedDark, setMode, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
