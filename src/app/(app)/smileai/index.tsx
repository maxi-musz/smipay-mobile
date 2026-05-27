import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";

import { listSmileConversations } from "@/api/services/smileai";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useSmileaiStore } from "@/store";
import type { SmileConversationListItem } from "@/types/smileai";

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

export default function SmileaiListScreen() {
  const { isDark } = useAppTheme();
  const setConversations = useSmileaiStore.use.setConversations();
  const conversations = useSmileaiStore.use.conversations();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await listSmileConversations();
      setConversations(res.data?.items ?? []);
    } catch {
      setError("Unable to load conversations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setConversations]);

  useEffect(() => {
    load();
  }, [load]);

  const openChat = (item?: SmileConversationListItem) => {
    if (item) {
      router.push({ pathname: "/(app)/smileai/chat/[id]", params: { id: item.id } });
    } else {
      router.push("/(app)/smileai/chat/new");
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <FullPageLoader message="Loading Smile…" />
      </SafeAreaView>
    );
  }

  const cardBg = isDark ? "#1E293B" : "#F5F6F8";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={isDark ? "#F8FAFC" : "#0F172A"} />
        </Pressable>
        <Text className="text-xl font-bold">Smile</Text>
        <Pressable
          onPress={() => router.push("/(app)/smileai/settings")}
          hitSlop={12}
          accessibilityLabel="Smile settings"
        >
          <Ionicons name="settings-outline" size={22} color={isDark ? "#94A3B8" : "#64748B"} />
        </Pressable>
      </View>

      <View className="px-4 pb-3">
        <Button onPress={() => openChat()}>New chat</Button>
      </View>

      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
      >
        {error ? (
          <Text className="py-4 text-center text-muted-foreground">{error}</Text>
        ) : null}
        {conversations.length === 0 && !error ? (
          <Text className="py-8 text-center text-muted-foreground">
            No conversations yet. Start a new chat with Smile.
          </Text>
        ) : null}
        {conversations.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => openChat(c)}
            style={{
              backgroundColor: cardBg,
              borderRadius: 12,
              padding: 16,
              marginBottom: 10,
              minHeight: 44,
            }}
            accessibilityRole="button"
            accessibilityLabel={`Conversation ${c.status}`}
          >
            <Text className="font-medium capitalize">{c.status.replace(/_/g, " ")}</Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              {formatTimeAgo(c.last_message_at)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
