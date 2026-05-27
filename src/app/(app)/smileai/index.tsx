import { useCallback, useEffect, useMemo, useState } from "react";
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
import type {
  AIConversationStatus,
  SmileConversationListItem,
} from "@/types/smileai";

/**
 * Smile landing screen. This is what `(tabs)/smile/index.tsx` and other
 * Smile entry points push to. It lets the user pick between starting a
 * new chat and resuming a non-closed conversation.
 *
 * Terminal statuses (`closed`, `resolved`, `abandoned`) are filtered out
 * by default — they live in the in-chat sidebar drawer instead. The
 * landing keeps a "Show closed conversations" toggle as an escape hatch
 * if the user wants to revisit one without opening a chat first.
 */
const STATUS_LABEL: Record<AIConversationStatus, string> = {
  active: "Active",
  awaiting_user: "Waiting for you",
  handoff_pending: "Connecting to support",
  handed_off: "With support",
  resolved: "Resolved",
  closed: "Closed",
  abandoned: "Abandoned",
};

const TERMINAL_STATUSES: ReadonlySet<AIConversationStatus> = new Set([
  "closed",
  "resolved",
  "abandoned",
]);

function isResumable(status: AIConversationStatus): boolean {
  return !TERMINAL_STATUSES.has(status);
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
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
    return "";
  }
}

export default function SmileLandingScreen() {
  const { isDark } = useAppTheme();
  const setConversations = useSmileaiStore.use.setConversations();
  const [items, setItems] = useState<SmileConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await listSmileConversations();
        const list = res.data?.items ?? [];
        const sorted = [...list].sort((a, b) => {
          const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return tb - ta;
        });
        setItems(sorted);
        setConversations(sorted);
      } catch {
        setError("Unable to load conversations.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [setConversations],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const { resumable, closed } = useMemo(() => {
    const r: SmileConversationListItem[] = [];
    const c: SmileConversationListItem[] = [];
    for (const item of items) {
      if (isResumable(item.status)) r.push(item);
      else c.push(item);
    }
    return { resumable: r, closed: c };
  }, [items]);

  const startNewChat = () => {
    router.push("/(app)/smileai/chat/new");
  };

  const openConversation = (item: SmileConversationListItem) => {
    router.push({
      pathname: "/(app)/smileai/chat/[id]",
      params: { id: item.id },
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <FullPageLoader message="Loading Smile…" />
      </SafeAreaView>
    );
  }

  const cardBg = isDark ? "#1E293B" : "#F5F6F8";
  const chipBg = isDark ? "#1E3A5F" : "#DBEAFE";
  const chipText = isDark ? "#93C5FD" : "#1D4ED8";
  const closedChipBg = isDark ? "#334155" : "#E2E8F0";
  const closedChipText = isDark ? "#CBD5E1" : "#475569";

  const visibleClosed = showClosed ? closed : [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Go back"
          style={{ minWidth: 32, minHeight: 32, justifyContent: "center" }}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={isDark ? "#F8FAFC" : "#0F172A"}
          />
        </Pressable>
        <Text className="text-xl font-bold">Smile</Text>
        <Pressable
          onPress={() => router.push("/(app)/smileai/settings")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Smile settings"
          style={{
            minWidth: 32,
            minHeight: 32,
            justifyContent: "center",
            alignItems: "flex-end",
          }}
        >
          <Ionicons
            name="settings-outline"
            size={22}
            color={isDark ? "#94A3B8" : "#64748B"}
          />
        </Pressable>
      </View>

      <View className="px-4 pb-3">
        <Button onPress={startNewChat}>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text className="font-semibold text-primary-foreground">
              Start a new chat
            </Text>
          </View>
        </Button>
        <Text className="mt-2 text-xs text-muted-foreground">
          Smile helps with wallet, KYC, transactions, airtime, data, cards, and
          bill payments.
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerClassName="pb-12"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
          />
        }
      >
        {error ? (
          <Text className="py-4 text-center text-muted-foreground">{error}</Text>
        ) : null}

        {resumable.length > 0 ? (
          <>
            <Text className="mb-2 mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Continue a conversation
            </Text>
            {resumable.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => openConversation(item)}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 10,
                  minHeight: 44,
                }}
                accessibilityRole="button"
                accessibilityLabel={`Smile conversation, ${STATUS_LABEL[item.status]}`}
              >
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <View
                    style={{
                      backgroundColor: chipBg,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 999,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: chipText,
                      }}
                    >
                      Smile
                    </Text>
                  </View>
                  <Text className="flex-1 font-medium" numberOfLines={1}>
                    Smile assistant
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={isDark ? "#94A3B8" : "#94A3B8"}
                  />
                </View>
                <View
                  className="mt-2 flex-row items-center"
                  style={{ gap: 8 }}
                >
                  <Text className="text-xs text-muted-foreground">
                    {STATUS_LABEL[item.status]}
                  </Text>
                  <Text className="text-xs text-muted-foreground">•</Text>
                  <Text className="text-xs text-muted-foreground">
                    {formatTimeAgo(item.last_message_at)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </>
        ) : !error ? (
          <View
            className="mt-4 items-center rounded-2xl border border-dashed border-border px-6 py-8"
            style={{ gap: 6 }}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={28}
              color={isDark ? "#94A3B8" : "#64748B"}
            />
            <Text className="text-center text-base font-medium">
              No active conversations
            </Text>
            <Text className="text-center text-xs text-muted-foreground">
              Tap "Start a new chat" to ask Smile anything.
            </Text>
          </View>
        ) : null}

        {closed.length > 0 ? (
          <View className="mt-6">
            <Pressable
              onPress={() => setShowClosed((s) => !s)}
              accessibilityRole="button"
              accessibilityLabel={
                showClosed ? "Hide closed conversations" : "Show closed conversations"
              }
              className="flex-row items-center py-2"
              style={{ gap: 6 }}
            >
              <Ionicons
                name={showClosed ? "chevron-down" : "chevron-forward"}
                size={16}
                color={isDark ? "#94A3B8" : "#64748B"}
              />
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Closed conversations ({closed.length})
              </Text>
            </Pressable>
            {visibleClosed.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => openConversation(item)}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 10,
                  minHeight: 44,
                  opacity: 0.85,
                }}
                accessibilityRole="button"
                accessibilityLabel={`Closed Smile conversation, ${STATUS_LABEL[item.status]}`}
              >
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <View
                    style={{
                      backgroundColor: closedChipBg,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 999,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: closedChipText,
                      }}
                    >
                      {STATUS_LABEL[item.status]}
                    </Text>
                  </View>
                  <Text className="flex-1 font-medium" numberOfLines={1}>
                    Smile assistant
                  </Text>
                </View>
                <Text className="mt-2 text-xs text-muted-foreground">
                  {formatTimeAgo(item.last_message_at)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
