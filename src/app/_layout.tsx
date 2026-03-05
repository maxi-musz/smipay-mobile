import "../global.css";

import React, { useCallback, useEffect, useState } from "react";
import { Platform, View } from "react-native";
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
import { SupportSocketProvider } from "@/context/support-socket";
import { ThemeProvider } from "@/context/theme-context";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  startInactivityTracking,
  stopInactivityTracking,
} from "@/lib/inactivity";
import { getDeviceId } from "@/lib/device";
import {
  didRegisterRecently,
  markRegistrationDone,
  registerForPushNotificationsAsync,
  setLastRegisteredToken,
} from "@/lib/push-notifications";
import { useAppStore, useAuthStore } from "@/store";
import { registerPushToken } from "@/api";
import * as Application from "expo-application";

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

  const pushNotificationsEnabled = useAppStore.use.pushNotificationsEnabled();
  useEffect(() => {
    if (!isAuthenticated || isLocked || !pushNotificationsEnabled) return;
    if (didRegisterRecently()) return;
    (async () => {
      if (didRegisterRecently()) return;
      const token = await registerForPushNotificationsAsync();
      if (!token) return;
      try {
        const [deviceId, appVersion] = await Promise.all([
          getDeviceId(),
          Promise.resolve(Application.nativeApplicationVersion ?? undefined),
        ]);
        await registerPushToken({
          token,
          platform: Platform.OS as "ios" | "android",
          device_id: deviceId,
          app_version: appVersion?.slice(0, 32),
        });
        setLastRegisteredToken(token);
        markRegistrationDone();
      } catch (e) {
        if (__DEV__) console.warn("[Push] Failed to register token with backend:", e);
      }
    })();
  }, [isAuthenticated, isLocked, pushNotificationsEnabled]);

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
        <SupportSocketProvider>
          <InnerLayout />
        </SupportSocketProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
