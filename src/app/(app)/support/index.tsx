import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";

import { fetchConversations } from "@/api";
import { SupportSocketContext } from "@/context/support-socket";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import type { ConversationListItem } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  waiting_support: "Waiting for support",
  waiting_user: "Waiting for your reply",
  closed: "Closed",
};

function formatTimeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export default function SupportListScreen() {
  const { isDark } = useAppTheme();
  const { socket } = useContext(SupportSocketContext);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bg = isDark ? "#0F172A" : "#F8F9FB";
  const cardBg = isDark ? "#1E293B" : "#F5F6F8";
  const dividerColor = isDark ? "#2D3A4D" : "#E8EAED";

  const load = useCallback(
    async (isRefresh = false, silent = false) => {
      if (!silent) {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
      }
      setError(null);
      const REFRESH_TIMEOUT_MS = 15000;
      const timeoutId =
        !silent && isRefresh
          ? setTimeout(() => {
              setRefreshing(false);
            }, REFRESH_TIMEOUT_MS)
          : undefined;
      try {
        const response = await fetchConversations();
        setConversations(response.data.conversations ?? []);
      } catch {
        if (!silent) setError("Unable to load conversations.");
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (!silent) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  // When user navigates back from chat, refetch in the background so the list stays up to date
  // (e.g. new chat appears) without showing a spinner — list just updates when the request completes.
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      load(true, true);
    }, [load]),
  );

  // Real-time: refetch list when conversation_updated (new reply, claimed, closed, etc.)
  useEffect(() => {
    if (!socket) return;
    const handler = () => load(true, true);
    socket.on("conversation_updated", handler);
    return () => {
      socket.off("conversation_updated", handler);
    };
  }, [socket, load]);

  const onRefresh = useCallback(() => {
    load(true);
  }, [load]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: bg }}>
        <Animated.View
          className="flex-row items-center justify-between px-5 pb-3 pt-14"
          entering={FadeInDown.duration(220)}
        >
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6" }}
          >
            <Ionicons name="chevron-back" size={20} color={isDark ? "#E5E7EB" : "#111827"} />
          </Pressable>
          <Text className="text-base font-semibold text-foreground">
            Help & Support
          </Text>
          <View className="h-9 w-9" />
        </Animated.View>

        {loading ? (
          <FullPageLoader message="Loading..." />
        ) : error ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-muted-foreground">{error}</Text>
          </View>
        ) : conversations.length === 0 ? (
          <Animated.View
            className="flex-1 items-center justify-center px-8"
            entering={FadeInDown.delay(60).duration(220)}
          >
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Ionicons name="headset-outline" size={32} color="#F4831F" />
            </View>
            <Text className="text-center text-lg font-medium text-foreground">
              Need help?
            </Text>
            <Text className="mt-2 text-center text-muted-foreground">
              Start a chat and our team will respond.
            </Text>
            <Button
              className="mt-6"
              variant="outline"
              onPress={() => router.push("/(app)/smileai/chat/new")}
            >
              <Text className="font-semibold text-foreground">Ask Smile first</Text>
            </Button>
            <Button
              className="mt-3"
              onPress={() => router.push("/(app)/support/chat")}
            >
              <Text className="font-semibold text-primary-foreground">Talk to a human</Text>
            </Button>
          </Animated.View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pb-24"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              entering={FadeInDown.delay(80).duration(220)}
            >
              <Button
                className="mb-4"
                onPress={() => router.push("/(app)/support/chat")}
              >
                <Text className="font-semibold text-primary-foreground">Start new chat</Text>
              </Button>
            </Animated.View>

            {conversations.map((conv, index) => (
              <Animated.View
                key={conv.id}
                entering={FadeInDown.delay(120 + index * 40).duration(220)}
              >
                <Pressable
                className="mb-3 flex-row overflow-hidden rounded-2xl py-4 px-4 active:opacity-70"
                style={{ backgroundColor: cardBg }}
                onPress={() =>
                  router.push({ pathname: "/(app)/support/chat", params: { id: conv.id } })
                }
              >
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-semibold text-foreground">
                      {conv.assigned_admin_name ?? "Waiting for support"}
                    </Text>
                    {conv.has_unread && (
                      <View className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </View>
                  {conv.last_message && (
                    <Text
                      className="mt-0.5 text-sm text-muted-foreground"
                      numberOfLines={2}
                    >
                      {conv.last_message.message}
                    </Text>
                  )}
                  <View className="mt-2 flex-row items-center gap-2">
                    <Text className="text-xs text-muted-foreground">
                      {STATUS_LABEL[conv.status] ?? conv.status}
                    </Text>
                    <Text className="text-xs text-muted-foreground">•</Text>
                    <Text className="text-xs text-muted-foreground">
                      {formatTimeAgo(conv.last_message_at)}
                    </Text>
                  </View>
                  {conv.ticket && (
                    <View className="mt-2 rounded bg-primary/10 px-2 py-0.5 self-start">
                      <Text className="text-xs text-primary">
                        Ticket: {conv.ticket.ticket_number}
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={isDark ? "#808999" : "#9CA3B0"}
                />
              </Pressable>
              </Animated.View>
            ))}
          </ScrollView>
        )}
      </View>
    </>
  );
}
