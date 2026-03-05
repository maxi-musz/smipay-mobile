import "../global.css";

import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import { useColorScheme } from "nativewind";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { LockScreen } from "@/components/lock-screen";
import { FullPageLoader } from "@/components/ui/loaders";
import { SplashOverlay } from "@/components/splash-overlay";
import { ToastContainer } from "@/components/ui/toast";
import { ThemeProvider } from "@/context/theme-context";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  startInactivityTracking,
  stopInactivityTracking,
} from "@/lib/inactivity";
import { useAppStore, useAuthStore } from "@/store";

SplashScreen.preventAutoHideAsync();

function InnerLayout() {
  const { isDark } = useAppTheme();
  const { setColorScheme } = useColorScheme();
  const [showSplash, setShowSplash] = useState(true);

  const isHydrated = useAppStore.use.isHydrated();
  const isAuthenticated = useAuthStore.use.isAuthenticated();
  const isLocked = useAuthStore.use.isLocked();

  useEffect(() => {
    setColorScheme(isDark ? "dark" : "light");
  }, [isDark, setColorScheme]);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isLocked) {
      startInactivityTracking();
    } else {
      stopInactivityTracking();
    }
    return () => stopInactivityTracking();
  }, [isAuthenticated, isLocked]);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Wait for auth rehydration before deciding route; avoids flashing dashboard then lock.
  if (!isHydrated) {
    return (
      <View className="flex-1 bg-background">
        <StatusBar style="dark" />
        <FullPageLoader message="Loading..." />
        <ToastContainer />
        <PortalHost />
      </View>
    );
  }

  // When locked, show only lock screen so user never sees dashboard.
  if (isAuthenticated && isLocked) {
    return (
      <View className="flex-1 bg-background">
        <StatusBar style={isDark ? "light" : "dark"} />
        <LockScreen />
        <ToastContainer />
        <PortalHost />
      </View>
    );
  }

  return (
    <View className="flex-1">
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
    </View>
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
