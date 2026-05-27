import { Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useSmileaiStore } from "@/store";

export default function SmileaiSettingsScreen() {
  const { isDark } = useAppTheme();
  const ui = useSmileaiStore.use.ui();
  const store = useSmileaiStore;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={isDark ? "#F8FAFC" : "#0F172A"} />
        </Pressable>
        <Text className="ml-3 text-xl font-bold">Smile settings</Text>
      </View>
      <View className="mx-4 mt-4 flex-row items-center justify-between rounded-xl bg-card p-4">
        <Text>Suggested replies</Text>
        <Switch
          value={ui.suggestedRepliesEnabled}
          onValueChange={(v) =>
            store.setState((s) => ({
              ui: { ...s.ui, suggestedRepliesEnabled: v },
            }))
          }
        />
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
