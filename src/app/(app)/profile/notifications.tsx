import { useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";

import { registerPushToken, removePushToken } from "@/api";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { AlertModal } from "@/components/ui/modals";
import { useAppTheme } from "@/hooks/use-app-theme";
import { getDeviceId } from "@/lib/device";
import {
  clearLastRegisteredToken,
  getLastRegisteredToken,
  getLastPushErrorReason,
  isPushSupported,
  markRegistrationDone,
  registerForPushNotificationsAsync,
  setLastRegisteredToken,
} from "@/lib/push-notifications";
import { useAppStore } from "@/store";

export default function NotificationsScreen() {
  const { isDark } = useAppTheme();
  const pushEnabled = useAppStore.use.pushNotificationsEnabled();
  const setPushEnabled = useAppStore.use.setPushNotificationsEnabled();

  const [busy, setBusy] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    variant: "success" | "error" | "info";
    title: string;
    message: string;
  }>({ visible: false, variant: "info", title: "", message: "" });

  const cardBg = isDark ? "#1E293B" : "#F5F6F8";
  const bg = isDark ? "#0F172A" : "#F8F9FB";
  const pushUnavailable = !isPushSupported();

  async function handlePushToggle(value: boolean) {
    if (busy) return;
    if (pushUnavailable && value) return;

    if (value) {
      setBusy(true);
      try {
        const token = await registerForPushNotificationsAsync();
        if (!token) {
          const reason = getLastPushErrorReason();
          setAlertModal({
            visible: true,
            variant: "error",
            title: "Could not enable",
            message:
              reason ??
              "Permission was denied or push is unavailable. Check system settings and try again.",
          });
          return;
        }
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
        setPushEnabled(true);
        setAlertModal({
          visible: true,
          variant: "success",
          title: "Push notifications on",
          message: "You'll receive transaction alerts, support updates, and other important notifications.",
        });
      } catch {
        setAlertModal({
          visible: true,
          variant: "error",
          title: "Something went wrong",
          message: "We couldn't turn on push notifications. Please try again later.",
        });
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      const token = getLastRegisteredToken();
      if (token) await removePushToken(token);
      clearLastRegisteredToken();
      setPushEnabled(false);
      setAlertModal({
        visible: true,
        variant: "success",
        title: "Push notifications off",
        message: "You won't receive push notifications until you turn them back on.",
      });
    } catch {
      setAlertModal({
        visible: true,
        variant: "error",
        title: "Something went wrong",
        message: "We couldn't turn off push notifications. Please try again later.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: bg }}>
        <View className="flex-row items-center justify-between px-5 pb-3 pt-14">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6",
            }}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={isDark ? "#E5E7EB" : "#111827"}
            />
          </Pressable>
          <Text className="text-base font-semibold text-foreground">
            Notifications
          </Text>
          <View className="h-9 w-9" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-24"
          showsVerticalScrollIndicator={false}
        >
          <View
            className="mt-4 overflow-hidden rounded-2xl px-4 py-4"
            style={{ backgroundColor: cardBg }}
          >
            <Text className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Push notifications
            </Text>
            <View className="flex-row items-center justify-between">
              <View className="flex-row flex-1 items-center">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Ionicons name="notifications-outline" size={22} color="#F4831F" />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-medium text-foreground">
                    Push notifications
                  </Text>
                  <Text className="mt-0.5 text-xs text-muted-foreground">
                    {pushUnavailable
                      ? "Not available in Expo Go or on simulators. Use a development build to enable."
                      : pushEnabled
                        ? "Receive alerts for transactions, support, and more"
                        : "Turn on to get important updates on this device"}
                  </Text>
                </View>
              </View>
              <Switch
                value={pushUnavailable ? false : pushEnabled}
                onValueChange={handlePushToggle}
                disabled={busy || pushUnavailable}
              />
            </View>
          </View>
        </ScrollView>
      </View>

      <AlertModal
        visible={alertModal.visible}
        variant={alertModal.variant}
        title={alertModal.title}
        message={alertModal.message}
        primaryAction={{ label: "OK", onPress: () => setAlertModal((p) => ({ ...p, visible: false })) }}
        onClose={() => setAlertModal((p) => ({ ...p, visible: false }))}
      />
    </>
  );
}
