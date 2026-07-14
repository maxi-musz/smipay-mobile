import { useContext, useEffect, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { getSmilePreferences } from "@/api/services/smileai";
import { SmileaiSocketContext } from "@/context/smileai-socket";
import { SMILEY_ASSISTANT_NAME } from "@/constants/smiley";
import { isOtaDebugUser } from "@/constants/ota-debug-marker";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuthStore, useSmileaiStore } from "@/store";
import type { SmilePreferences } from "@/types/smileai";

/**
 * User-facing toggles are locked for now — defaults / server values are shown
 * but cannot be changed from this screen. Flip to `true` when self-serve
 * preferences ship again.
 */
const SETTINGS_EDITABLE = false;

/** Locked product defaults while SETTINGS_EDITABLE is false. */
const LOCKED = {
  performActions: true,
  paused: false,
  suggestedReplies: false,
  sound: true,
} as const;

export default function SmileaiSettingsScreen() {
  const { isDark } = useAppTheme();
  const user = useAuthStore.use.user();
  const ui = useSmileaiStore.use.ui();
  const { onModeChanged } = useContext(SmileaiSocketContext);

  const [prefs, setPrefs] = useState<SmilePreferences | null>(null);

  // Same allowlist as OTA marker / settings gear — block deep links for everyone else.
  useEffect(() => {
    if (!isOtaDebugUser(user?.email)) {
      router.replace("/(app)/smileai");
    }
  }, [user?.email]);

  // Keep runtime UI prefs aligned with the locked product defaults.
  useEffect(() => {
    if (SETTINGS_EDITABLE) return;
    useSmileaiStore.setState((s) => ({
      ui: {
        ...s.ui,
        suggestedRepliesEnabled: LOCKED.suggestedReplies,
        soundEnabled: LOCKED.sound,
      },
      suggestions: LOCKED.suggestedReplies ? s.suggestions : {},
    }));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await getSmilePreferences();
        if (res.data) setPrefs(res.data);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    onModeChanged((p) => {
      if (!p) return;
      if (p.scope === "user" || p.scope === "global") {
        getSmilePreferences()
          .then((res) => {
            if (res.data) setPrefs(res.data);
          })
          .catch(() => undefined);
      }
    });
    return () => onModeChanged(null);
  }, [onModeChanged]);

  const adminReadOnly = prefs?.admin_mode === "read_only";
  const writesAllowed = (prefs?.user_mode ?? "read_write") === "read_write";
  const paused = prefs?.paused ?? false;

  const performActionsValue = SETTINGS_EDITABLE
    ? !adminReadOnly && writesAllowed
    : LOCKED.performActions && !adminReadOnly;
  const pausedValue = SETTINGS_EDITABLE ? paused : LOCKED.paused;
  const suggestedValue = SETTINGS_EDITABLE
    ? ui.suggestedRepliesEnabled
    : LOCKED.suggestedReplies;
  const soundValue = SETTINGS_EDITABLE ? ui.soundEnabled : LOCKED.sound;

  const rowOpacity = SETTINGS_EDITABLE ? 1 : 0.55;

  if (!isOtaDebugUser(user?.email)) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={isDark ? "#F8FAFC" : "#0F172A"}
          />
        </Pressable>
        <Text className="ml-3 text-xl font-bold">
          {SMILEY_ASSISTANT_NAME} settings
        </Text>
      </View>

      {!SETTINGS_EDITABLE ? (
        <Text className="mx-4 mb-1 text-xs text-muted-foreground">
          These preferences are managed by SmiPay for now and can&apos;t be
          changed in the app.
        </Text>
      ) : null}

      <Text className="mx-4 mt-4 text-xs uppercase text-muted-foreground">
        Permissions
      </Text>

      <View
        className="mx-4 mt-2 rounded-xl bg-card p-4"
        style={{ opacity: rowOpacity }}
      >
        <View className="flex-row items-center justify-between">
          <View className="mr-3 flex-1">
            <Text className="font-semibold">
              Allow {SMILEY_ASSISTANT_NAME} to perform actions
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              {adminReadOnly
                ? `Disabled by admin. ${SMILEY_ASSISTANT_NAME} is in read-only mode for everyone right now.`
                : `Lets ${SMILEY_ASSISTANT_NAME} help with airtime top-ups, bill payments, and other actions on your behalf.`}
            </Text>
          </View>
          <Switch
            value={performActionsValue}
            onValueChange={() => undefined}
            disabled
          />
        </View>
      </View>

      <View
        className="mx-4 mt-3 rounded-xl bg-card p-4"
        style={{ opacity: rowOpacity }}
      >
        <View className="flex-row items-center justify-between">
          <View className="mr-3 flex-1">
            <Text className="font-semibold">Pause {SMILEY_ASSISTANT_NAME}</Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              Hides {SMILEY_ASSISTANT_NAME} and stops responses until you turn
              it back on.
            </Text>
          </View>
          <Switch
            value={pausedValue}
            onValueChange={() => undefined}
            disabled
          />
        </View>
      </View>

      <Text className="mx-4 mt-6 text-xs uppercase text-muted-foreground">
        Display
      </Text>
      <View
        className="mx-4 mt-2 rounded-xl bg-card p-4"
        style={{ opacity: rowOpacity }}
      >
        <View className="flex-row items-center justify-between">
          <View className="mr-3 flex-1">
            <Text className="font-semibold">Suggested replies</Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              Show follow-up chips under {SMILEY_ASSISTANT_NAME}&apos;s replies
              and above the message box.
            </Text>
          </View>
          <Switch
            value={suggestedValue}
            onValueChange={() => undefined}
            disabled
          />
        </View>
      </View>
      <View
        className="mx-4 mt-3 flex-row items-center justify-between rounded-xl bg-card p-4"
        style={{ opacity: rowOpacity }}
      >
        <Text>Sound</Text>
        <Switch value={soundValue} onValueChange={() => undefined} disabled />
      </View>
    </SafeAreaView>
  );
}
