import { useCallback, useContext, useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  getSmilePreferences,
  updateSmilePreferences,
} from "@/api/services/smileai";
import { SmileaiSocketContext } from "@/context/smileai-socket";
import { SMILEY_ASSISTANT_NAME } from "@/constants/smiley";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useSmileaiStore } from "@/store";
import type { SmilePreferences } from "@/types/smileai";

export default function SmileaiSettingsScreen() {
  const { isDark } = useAppTheme();
  const ui = useSmileaiStore.use.ui();
  const store = useSmileaiStore;
  const showToast = useToastStore((s) => s.show);
  const { onModeChanged } = useContext(SmileaiSocketContext);

  const [prefs, setPrefs] = useState<SmilePreferences | null>(null);
  const [savingMode, setSavingMode] = useState(false);
  const [savingPause, setSavingPause] = useState(false);

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
      // Refresh on any mode change broadcast for accuracy.
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

  const onWriteToggle = useCallback(
    async (next: boolean) => {
      if (adminReadOnly) return;
      setSavingMode(true);
      try {
        const res = await updateSmilePreferences({
          mode: next ? "read_write" : "read_only",
        });
        if (res.data) setPrefs(res.data);
      } catch {
        showToast({ variant: "error", title: "Could not save preference." });
      } finally {
        setSavingMode(false);
      }
    },
    [adminReadOnly, showToast],
  );

  const onPauseToggle = useCallback(
    async (next: boolean) => {
      setSavingPause(true);
      try {
        const res = await updateSmilePreferences({ paused: next });
        if (res.data) setPrefs(res.data);
      } catch {
        showToast({ variant: "error", title: "Could not save preference." });
      } finally {
        setSavingPause(false);
      }
    },
    [showToast],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={isDark ? "#F8FAFC" : "#0F172A"} />
        </Pressable>
        <Text className="ml-3 text-xl font-bold">{SMILEY_ASSISTANT_NAME} settings</Text>
      </View>

      <Text className="mx-4 mt-4 text-xs uppercase text-muted-foreground">
        Permissions
      </Text>

      <View className="mx-4 mt-2 rounded-xl bg-card p-4">
        <View className="flex-row items-center justify-between">
          <View className="mr-3 flex-1">
            <Text className="font-semibold">
              Allow {SMILEY_ASSISTANT_NAME} to perform actions
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              {adminReadOnly
                ? `Disabled by admin. ${SMILEY_ASSISTANT_NAME} is in read-only mode for everyone right now.`
                : `Lets ${SMILEY_ASSISTANT_NAME} help with airtime top-ups, transfers, and other write actions on your behalf.`}
            </Text>
          </View>
          <Switch
            value={!adminReadOnly && writesAllowed}
            onValueChange={onWriteToggle}
            disabled={adminReadOnly || savingMode}
          />
        </View>
      </View>

      <View className="mx-4 mt-3 rounded-xl bg-card p-4">
        <View className="flex-row items-center justify-between">
          <View className="mr-3 flex-1">
            <Text className="font-semibold">Pause {SMILEY_ASSISTANT_NAME}</Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              Hides {SMILEY_ASSISTANT_NAME} and stops responses until you turn it back on.
            </Text>
          </View>
          <Switch
            value={paused}
            onValueChange={onPauseToggle}
            disabled={savingPause}
          />
        </View>
      </View>

      <Text className="mx-4 mt-6 text-xs uppercase text-muted-foreground">
        Display
      </Text>
      <View className="mx-4 mt-2 rounded-xl bg-card p-4">
        <View className="flex-row items-center justify-between">
          <View className="mr-3 flex-1">
            <Text className="font-semibold">Suggested replies</Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              Show follow-up chips under {SMILEY_ASSISTANT_NAME}&apos;s replies and above the message
              box.
            </Text>
          </View>
          <Switch
            value={ui.suggestedRepliesEnabled}
            onValueChange={(v) =>
              store.setState((s) => ({
                ui: { ...s.ui, suggestedRepliesEnabled: v },
                suggestions: v ? s.suggestions : {},
              }))
            }
          />
        </View>
      </View>
      <View className="mx-4 mt-3 flex-row items-center justify-between rounded-xl bg-card p-4">
        <Text>Sound</Text>
        <Switch
          value={ui.soundEnabled}
          onValueChange={(v) =>
            store.setState((s) => ({
              ui: { ...s.ui, soundEnabled: v },
            }))
          }
        />
      </View>
    </SafeAreaView>
  );
}
