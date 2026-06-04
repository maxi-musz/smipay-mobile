import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";

import { FullPageLoader } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useSmileaiStore } from "@/store";
import type {
  AIConversationStatus,
  SmileConversationListItem,
} from "@/types/smileai";
import { ConversationListRow } from "@/components/smileai/ConversationListRow";

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
  const items = useSmileaiStore.use.conversations();
  const isLoadingConversations = useSmileaiStore.use.isLoadingConversations();
  const isRefreshingConversations = useSmileaiStore.use.isRefreshingConversations();
  const conversationsLoadError = useSmileaiStore.use.conversationsLoadError();
  const loadConversations = useSmileaiStore.use.loadConversations();
  const refreshConversationsSilently = useSmileaiStore.use.refreshConversationsSilently();
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

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

  const showSkeleton = isLoadingConversations && items.length === 0;

  if (showSkeleton) {
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
  const iconBtnBg = isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9";
  const iconBtnFg = isDark ? "#E2E8F0" : "#0F172A";
  const newChatBg = isDark ? "rgba(245,130,32,0.18)" : "#FFF1E3";
  const newChatFg = isDark ? "#FB923C" : "#C2520A";
  const welcomeBg = isDark ? "#1E293B" : "#FFF7ED";
  const welcomeBorder = isDark ? "rgba(251,146,60,0.18)" : "rgba(245,130,32,0.18)";
  const welcomeIconBg = isDark ? "rgba(245,130,32,0.18)" : "#FFE7D1";
  const welcomeIconFg = isDark ? "#FB923C" : "#C2520A";

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
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Pressable
            onPress={startNewChat}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Start a new chat"
            style={{
              minHeight: 36,
              paddingHorizontal: 12,
              borderRadius: 18,
              backgroundColor: newChatBg,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Ionicons name="add" size={18} color={newChatFg} />
            <Text
              style={{
                color: newChatFg,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              New chat
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(app)/smileai/settings")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Smile settings"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: iconBtnBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="settings-outline" size={19} color={iconBtnFg} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerClassName="pb-12"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingConversations}
            onRefresh={() => void refreshConversationsSilently()}
          />
        }
      >
        {conversationsLoadError ? (
          <Text className="py-4 text-center text-muted-foreground">{conversationsLoadError}</Text>
        ) : null}

        <View
          style={{
            marginTop: 8,
            marginBottom: 16,
            backgroundColor: welcomeBg,
            borderColor: welcomeBorder,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            gap: 12,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: welcomeIconBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="sparkles" size={20} color={welcomeIconFg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text className="text-base font-semibold">
              Welcome to Smile, your SmiPay assistant
            </Text>
            <Text
              className="mt-1 text-xs text-muted-foreground"
              style={{ lineHeight: 18 }}
            >
              Perform fast actions, check transactions, and get help — your
              chats are private and securely stored. Start a new chat or
              continue a recent one below.
            </Text>
            <View
              className="mt-2 flex-row items-center"
              style={{ gap: 6 }}
            >
              <Ionicons
                name="shield-checkmark"
                size={13}
                color={welcomeIconFg}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: welcomeIconFg,
                }}
              >
                End-to-end secure
              </Text>
            </View>
          </View>
        </View>

        {resumable.length > 0 ? (
          <>
            <Text className="mb-2 mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Continue a conversation
            </Text>
            {resumable.map((item) => (
              <ConversationListRow
                key={item.id}
                item={item}
                onPress={() => openConversation(item)}
                isDark={isDark}
                timeAgo={formatTimeAgo(item.last_message_at)}
                chipLabel="Smile"
                chipBg={chipBg}
                chipText={chipText}
                cardBg={cardBg}
                showChevron
              />
            ))}
          </>
        ) : !conversationsLoadError ? (
          <Pressable
            onPress={startNewChat}
            accessibilityRole="button"
            accessibilityLabel="Start a new chat"
            className="mt-4 items-center rounded-2xl border border-dashed border-border px-6 py-10 active:opacity-80"
            style={{ gap: 8 }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: isDark ? "rgba(245,130,32,0.15)" : "#FFF7ED",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="sparkles"
                size={22}
                color={isDark ? "#FB923C" : "#F58220"}
              />
            </View>
            <Text className="text-center text-base font-semibold">
              Start a conversation with Smile
            </Text>
            <Text className="text-center text-xs text-muted-foreground">
              Ask about your wallet, KYC, transactions, airtime, data, cards
              and bills — or talk to a human.
            </Text>
          </Pressable>
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
              <ConversationListRow
                key={item.id}
                item={item}
                onPress={() => openConversation(item)}
                isDark={isDark}
                timeAgo={formatTimeAgo(item.last_message_at)}
                chipLabel={STATUS_LABEL[item.status]}
                chipBg={closedChipBg}
                chipText={closedChipText}
                cardBg={cardBg}
                opacity={0.85}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
