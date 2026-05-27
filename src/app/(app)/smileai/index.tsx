import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";

import { fetchConversations } from "@/api";
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
import type { ConversationListItem as SupportConversationListItem } from "@/types/support";

type UnifiedItem =
  | {
      source: "smile";
      id: string;
      status: AIConversationStatus;
      lastMessageAt: string | null;
      preview: string | null;
    }
  | {
      source: "support";
      id: string;
      status: string;
      lastMessageAt: string;
      preview: string | null;
      assignedAdminName: string | null;
      hasUnread: boolean;
      ticketNumber: string | null;
    };

const SMILE_STATUS_LABEL: Record<AIConversationStatus, string> = {
  active: "Active",
  awaiting_user: "Waiting for you",
  handoff_pending: "Connecting to support",
  handed_off: "With support",
  resolved: "Resolved",
  closed: "Closed",
  abandoned: "Abandoned",
};

const SUPPORT_STATUS_LABEL: Record<string, string> = {
  active: "Active",
  waiting_support: "Waiting for support",
  waiting_user: "Waiting for your reply",
  closed: "Closed",
};

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

function toSmileUnified(c: SmileConversationListItem): UnifiedItem {
  return {
    source: "smile",
    id: c.id,
    status: c.status,
    lastMessageAt: c.last_message_at,
    preview: null,
  };
}

function toSupportUnified(c: SupportConversationListItem): UnifiedItem {
  return {
    source: "support",
    id: c.id,
    status: c.status,
    lastMessageAt: c.last_message_at,
    preview: c.last_message?.message ?? null,
    assignedAdminName: c.assigned_admin_name,
    hasUnread: c.has_unread,
    ticketNumber: c.ticket?.ticket_number ?? null,
  };
}

export default function SmileaiHistoryScreen() {
  const { isDark } = useAppTheme();
  const setConversations = useSmileaiStore.use.setConversations();
  const [items, setItems] = useState<UnifiedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [smileRes, supportRes] = await Promise.allSettled([
          listSmileConversations(),
          fetchConversations(),
        ]);

        const smileItems =
          smileRes.status === "fulfilled"
            ? (smileRes.value.data?.items ?? [])
            : [];
        const supportItems =
          supportRes.status === "fulfilled"
            ? (supportRes.value.data?.conversations ?? [])
            : [];

        if (smileRes.status === "fulfilled") {
          setConversations(smileItems);
        }

        const merged: UnifiedItem[] = [
          ...smileItems.map(toSmileUnified),
          ...supportItems.map(toSupportUnified),
        ].sort((a, b) => {
          const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return tb - ta;
        });

        setItems(merged);

        if (
          smileRes.status === "rejected" &&
          supportRes.status === "rejected"
        ) {
          setError("Unable to load conversations.");
        }
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

  const openItem = (item: UnifiedItem) => {
    if (item.source === "smile") {
      router.push({
        pathname: "/(app)/smileai/chat/[id]",
        params: { id: item.id },
      });
    } else {
      router.push({
        pathname: "/(app)/support/chat",
        params: { id: item.id },
      });
    }
  };

  const startNewChat = () => {
    router.replace("/(app)/smileai/chat/new");
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <FullPageLoader message="Loading conversations…" />
      </SafeAreaView>
    );
  }

  const cardBg = isDark ? "#1E293B" : "#F5F6F8";
  const chipSmile = isDark ? "#1E3A5F" : "#DBEAFE";
  const chipSmileText = isDark ? "#93C5FD" : "#1D4ED8";
  const chipSupport = isDark ? "#3F1D2D" : "#FCE7F3";
  const chipSupportText = isDark ? "#FBCFE8" : "#9D174D";

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
        <Text className="text-xl font-bold">Conversations</Text>
        <Pressable
          onPress={() => router.push("/(app)/smileai/settings")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Smile settings"
          style={{ minWidth: 32, minHeight: 32, justifyContent: "center", alignItems: "flex-end" }}
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
          <Text className="font-semibold text-primary-foreground">New chat with Smile</Text>
        </Button>
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
        {items.length === 0 && !error ? (
          <Text className="py-8 text-center text-muted-foreground">
            No conversations yet. Tap "New chat with Smile" to start.
          </Text>
        ) : null}
        {items.map((item) => {
          const isSmile = item.source === "smile";
          const statusLabel = isSmile
            ? SMILE_STATUS_LABEL[(item as Extract<UnifiedItem, { source: "smile" }>).status] ??
              (item as Extract<UnifiedItem, { source: "smile" }>).status
            : SUPPORT_STATUS_LABEL[item.status] ?? item.status;

          const title = isSmile
            ? "Smile assistant"
            : (item as Extract<UnifiedItem, { source: "support" }>)
                .assignedAdminName ?? "Support team";

          const ticket = !isSmile
            ? (item as Extract<UnifiedItem, { source: "support" }>).ticketNumber
            : null;
          const hasUnread = !isSmile
            ? (item as Extract<UnifiedItem, { source: "support" }>).hasUnread
            : false;

          return (
            <Pressable
              key={`${item.source}-${item.id}`}
              onPress={() => openItem(item)}
              style={{
                backgroundColor: cardBg,
                borderRadius: 12,
                padding: 16,
                marginBottom: 10,
                minHeight: 44,
              }}
              accessibilityRole="button"
              accessibilityLabel={`${title}, ${statusLabel}`}
            >
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <View
                  style={{
                    backgroundColor: isSmile ? chipSmile : chipSupport,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: isSmile ? chipSmileText : chipSupportText,
                    }}
                  >
                    {isSmile ? "Smile" : "Support"}
                  </Text>
                </View>
                <Text className="flex-1 font-medium" numberOfLines={1}>
                  {title}
                </Text>
                {hasUnread ? (
                  <View className="h-2 w-2 rounded-full bg-primary" />
                ) : null}
              </View>
              {item.preview ? (
                <Text
                  className="mt-2 text-sm text-muted-foreground"
                  numberOfLines={2}
                >
                  {item.preview}
                </Text>
              ) : null}
              <View className="mt-2 flex-row items-center" style={{ gap: 8 }}>
                <Text className="text-xs text-muted-foreground">{statusLabel}</Text>
                <Text className="text-xs text-muted-foreground">•</Text>
                <Text className="text-xs text-muted-foreground">
                  {formatTimeAgo(item.lastMessageAt)}
                </Text>
                {ticket ? (
                  <>
                    <Text className="text-xs text-muted-foreground">•</Text>
                    <Text className="text-xs text-primary">{`Ticket ${ticket}`}</Text>
                  </>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
