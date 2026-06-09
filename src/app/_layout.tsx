import "../global.css";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { LogBox, Platform, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { PortalHost } from "@rn-primitives/portal";
import { useColorScheme } from "nativewind";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { LockScreen } from "@/components/lock-screen";
import { FullPageLoader } from "@/components/ui/loaders";
import { SplashOverlay } from "@/components/splash-overlay";
import { ToastContainer } from "@/components/ui/toast";
import { VersionGateModal } from "@/components/version-gate-modal";
import { VersionGateProvider, useVersionGateContext } from "@/context/version-gate-context";
import { SupportSocketProvider } from "@/context/support-socket";
import { ThemeProvider } from "@/context/theme-context";
import { WebhookEventsSocketProvider } from "@/context/webhook-events-socket";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  startInactivityTracking,
  stopInactivityTracking,
} from "@/lib/inactivity";
import { getDeviceId } from "@/lib/device";
import * as Notifications from "expo-notifications";
import {
  didRegisterRecently,
  flushPendingNotificationNavigation,
  markRegistrationDone,
  processNotificationResponse,
  registerForPushNotificationsAsync,
  setLastRegisteredToken,
} from "@/lib/push-notifications";
import { useAppStore, useAuthStore, useHomepageStore } from "@/store";
import { registerPushToken } from "@/api";
import * as Application from "expo-application";

// Expo Go (SDK 53+) dropped Android remote push, so `expo-notifications` logs an
// error/warning the moment it is imported. It's harmless here — push works in
// development/production builds — so we silence just those two messages to keep
// the dev LogBox clean. (LogBox only runs in __DEV__, so this is a no-op in prod.)
LogBox.ignoreLogs([
  /expo-notifications: Android Push notifications/,
  /expo-notifications.*not fully supported in Expo Go/,
]);

// Wrapped in catch: on iOS, presenting a React Native Modal (e.g. the required
// transaction-PIN sheet) creates a separate view controller, and the native
// splash module can reject for that VC. Without this catch it surfaces as an
// "Uncaught (in promise)" red error in dev. Harmless to ignore.
SplashScreen.preventAutoHideAsync().catch(() => {});

function InnerLayout() {
  const { isDark } = useAppTheme();
  const { setColorScheme } = useColorScheme();
  const [showSplash, setShowSplash] = useState(true);

  const isHydrated = useAppStore.use.isHydrated();
  const isAuthenticated = useAuthStore.use.isAuthenticated();
  const isLocked = useAuthStore.use.isLocked();

  // Server-driven force/soft update gate. Mounted at the root so it can sit
  // above every screen, including the lock screen, when a force update is due.
  const versionGate = useVersionGateContext();

  const hadLockedRef = useRef(false);
  useEffect(() => {
    if (isLocked) hadLockedRef.current = true;
  }, [isLocked]);

  /** After unlock, do not show the splash overlay — it resets UX and drops deep links (e.g. push → notification). */
  useEffect(() => {
    if (!isLocked && hadLockedRef.current) {
      setShowSplash(false);
    }
  }, [isLocked]);

  const prevLockedRef = useRef(isLocked);
  useEffect(() => {
    if (prevLockedRef.current && !isLocked && isAuthenticated) {
      flushPendingNotificationNavigation();
    }
    prevLockedRef.current = isLocked;
  }, [isLocked, isAuthenticated]);

  const initialNotificationHandledRef = useRef(false);
  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;
    if (initialNotificationHandledRef.current) return;
    initialNotificationHandledRef.current = true;
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) processNotificationResponse(response);
    });
  }, [isHydrated, isAuthenticated]);

  useEffect(() => {
    setColorScheme(isDark ? "dark" : "light");
  }, [isDark, setColorScheme]);

  // Hide native splash as soon as we have real UI (lock screen, main app, or loader).
  // Otherwise when showing lock screen we never mount SplashOverlay, so it would stay stuck.
  useEffect(() => {
    if (isHydrated) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isHydrated]);

  useEffect(() => {
    if (isAuthenticated && !isLocked) {
      startInactivityTracking();
    } else {
      stopInactivityTracking();
    }
    return () => stopInactivityTracking();
  }, [isAuthenticated, isLocked]);

  const pushNotificationsEnabled = useAppStore.use.pushNotificationsEnabled();
  const homepageData = useHomepageStore.use.data();

  // Only register push token after homepage loads (confirms auth is valid).
  // Without this, stale tokens trigger a wasted 401 on every app start.
  useEffect(() => {
    if (!isAuthenticated || isLocked || !pushNotificationsEnabled || !homepageData) return;
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
  }, [isAuthenticated, isLocked, pushNotificationsEnabled, homepageData]);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
    // Hide native splash only when our custom overlay finishes; wrap in try/catch
    // in case the native view controller isn't the one that showed splash (e.g. iOS reload).
    SplashScreen.hideAsync().catch(() => {});
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

  return (
    <View className="flex-1 bg-background">
      <StatusBar
        style={
          isAuthenticated && isLocked
            ? (isDark ? "light" : "dark")
            : showSplash
            ? "dark"
            : isDark
            ? "light"
            : "dark"
        }
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      {showSplash && !isLocked && <SplashOverlay onFinish={handleSplashFinish} />}
      {isAuthenticated && isLocked && <LockScreen />}
      <ToastContainer />
      <PortalHost />

      {/*
       * Force updates are always surfaced (even over the lock screen) so a
       * broken/unsupported build can't be used. Soft updates wait until the
       * user is signed in and unlocked so we don't nag them at login.
       */}
      <VersionGateModal
        visible={
          (versionGate.effectiveLevel === "force" && !showSplash) ||
          (versionGate.effectiveLevel === "soft" &&
            !showSplash &&
            isAuthenticated &&
            !isLocked)
        }
        level={versionGate.effectiveLevel === "force" ? "force" : "soft"}
        message={versionGate.message}
        currentVersion={versionGate.currentVersion}
        targetVersion={versionGate.targetVersion}
        storeUrl={versionGate.storeUrl}
        onDismiss={() => {
          void versionGate.snoozeSoftUpdate();
        }}
      />
    </View>
  );
}

export default function RootLayout() {
  const inner = (
    <ThemeProvider>
      <SupportSocketProvider>
        <WebhookEventsSocketProvider>
          <VersionGateProvider>
            <InnerLayout />
          </VersionGateProvider>
        </WebhookEventsSocketProvider>
      </SupportSocketProvider>
    </ThemeProvider>
  );

  return (
    <SafeAreaProvider>
      <KeyboardProvider>{inner}</KeyboardProvider>
    </SafeAreaProvider>
  );
}
