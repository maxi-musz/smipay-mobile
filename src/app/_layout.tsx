import "../global.css";

import React, { useCallback, useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import { useColorScheme } from "nativewind";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SplashOverlay } from "@/components/splash-overlay";
import { ToastContainer } from "@/components/ui/toast";
import { ThemeProvider } from "@/context/theme-context";
import { useAppTheme } from "@/hooks/use-app-theme";

SplashScreen.preventAutoHideAsync();

function InnerLayout() {
  const { isDark } = useAppTheme();
  const { setColorScheme } = useColorScheme();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    setColorScheme(isDark ? "dark" : "light");
  }, [isDark, setColorScheme]);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <>
      <StatusBar style={showSplash ? "dark" : isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      {showSplash && <SplashOverlay onFinish={handleSplashFinish} />}
      <ToastContainer />
      <PortalHost />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <InnerLayout />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
