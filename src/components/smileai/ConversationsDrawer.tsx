import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listSmileConversations } from "@/api/services/smileai";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useSmileaiStore } from "@/store";
import type {
  AIConversationStatus,
  SmileConversationListItem,
} from "@/types/smileai";

/**
 * Right-side drawer that lists every SmileAI conversation for the
 * current user, plus a "New chat" entry. Mounts inside `ChatScreen` so
 * users can switch chats without leaving the chat surface — the original
 * design pushed them all the way back to the standalone history screen,
 * which broke the in-chat mental model.
 *
 * The drawer:
 *   - Slides in from the right (≈85% of screen width).
 *   - Groups conversations into "Active" (resumable) and "Closed"
 *     (terminal) sections so resumable chats stay at the top.
 *   - Marks the currently-open conversation with a left rail accent.
 *   - Refreshes the list each time it opens, and supports pull-to-refresh.
 *   - Closes when the user taps the dimmed backdrop, the close icon, or
 *     selects a row (the parent route navigates after the row tap).
 */
type Props = {
  visible: boolean;
  activeConversationId: string | null;
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
  onStartNewChat: () => void;
};

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

export function ConversationsDrawer({
  visible,
  activeConversationId,
  onClose,
  onSelectConversation,
  onStartNewChat,
}: Props) {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const cachedConversations = useSmileaiStore.use.conversations();
  const setConversations = useSmileaiStore.use.setConversations();

  const [items, setItems] = useState<SmileConversationListItem[]>(
    cachedConversations ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Slide-in animation. We keep the Modal mounted with `transparent` and
  // animate the panel ourselves so the backdrop fades and the panel
  // glides instead of the platform's default jarring slide.
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slide, visible]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await listSmileConversations();
        const list = res.data?.items ?? [];
        const sorted = [...list].sort((a, b) => {
          const ta = a.last_message_at
            ? new Date(a.last_message_at).getTime()
            : 0;
          const tb = b.last_message_at
            ? new Date(b.last_message_at).getTime()
            : 0;
          return tb - ta;
        });
        setItems(sorted);
        setConversations(sorted);
      } catch {
        setError("Couldn't load conversations.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [setConversations],
  );

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const { resumable, closed } = useMemo(() => {
    const r: SmileConversationListItem[] = [];
    const c: SmileConversationListItem[] = [];
    for (const item of items) {
      if (isResumable(item.status)) r.push(item);
      else c.push(item);
    }
    return { resumable: r, closed: c };
  }, [items]);

  const panelBg = isDark ? "#0F172A" : "#FFFFFF";
  const cardBg = isDark ? "#1E293B" : "#F5F6F8";
  const chipActiveBg = isDark ? "#1E3A5F" : "#DBEAFE";
  const chipActiveText = isDark ? "#93C5FD" : "#1D4ED8";
  const chipClosedBg = isDark ? "#334155" : "#E2E8F0";
  const chipClosedText = isDark ? "#CBD5E1" : "#475569";
  const railColor = isDark ? "#F58220" : "#F58220";

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });
  const backdropOpacity = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 flex-row">
        <Animated.View
          style={{
            ...StyleSheetAbsoluteFill,
            backgroundColor: "#000",
            opacity: backdropOpacity,
          }}
          pointerEvents={visible ? "auto" : "none"}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={onClose}
            accessibilityLabel="Close conversations drawer"
          />
        </Animated.View>

        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: "85%",
            maxWidth: 420,
            backgroundColor: panelBg,
            transform: [{ translateX }],
            borderTopLeftRadius: 20,
            borderBottomLeftRadius: 20,
            shadowColor: "#000",
            shadowOffset: { width: -4, height: 0 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          <View
            className="border-b border-border px-4"
            style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold">Conversations</Text>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close conversations drawer"
                style={{
                  minWidth: 36,
                  minHeight: 36,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={isDark ? "#F8FAFC" : "#0F172A"}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                onClose();
                onStartNewChat();
              }}
              accessibilityRole="button"
              accessibilityLabel="Start a new chat"
              className="mt-3 flex-row items-center justify-center rounded-xl bg-primary px-4 py-3"
              style={{ minHeight: 44 }}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text className="ml-2 font-semibold text-primary-foreground">
                New chat
              </Text>
            </Pressable>
          </View>

          <ScrollView
            className="flex-1 px-4"
            contentContainerClassName="py-3"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load(true)}
              />
            }
          >
            {loading && items.length === 0 ? (
              <Text className="py-6 text-center text-xs text-muted-foreground">
                Loading…
              </Text>
            ) : null}

            {error ? (
              <Text className="py-4 text-center text-xs text-muted-foreground">
                {error}
              </Text>
            ) : null}

            {resumable.length > 0 ? (
              <>
                <Text className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Active
                </Text>
                {resumable.map((item) => {
                  const isCurrent = item.id === activeConversationId;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        onClose();
                        if (!isCurrent) onSelectConversation(item.id);
                      }}
                      style={{
                        backgroundColor: cardBg,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 8,
                        minHeight: 44,
                        borderLeftWidth: isCurrent ? 3 : 0,
                        borderLeftColor: railColor,
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Smile conversation, ${STATUS_LABEL[item.status]}${isCurrent ? ", currently open" : ""}`}
                    >
                      <View
                        className="flex-row items-center"
                        style={{ gap: 8 }}
                      >
                        <View
                          style={{
                            backgroundColor: chipActiveBg,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 999,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "600",
                              color: chipActiveText,
                            }}
                          >
                            {STATUS_LABEL[item.status]}
                          </Text>
                        </View>
                        <Text
                          className="flex-1 text-sm font-medium"
                          numberOfLines={1}
                        >
                          Smile chat
                        </Text>
                      </View>
                      <Text className="mt-1 text-[11px] text-muted-foreground">
                        {formatTimeAgo(item.last_message_at)}
                      </Text>
                    </Pressable>
                  );
                })}
              </>
            ) : null}

            {closed.length > 0 ? (
              <>
                <Text className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Closed
                </Text>
                {closed.map((item) => {
                  const isCurrent = item.id === activeConversationId;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        onClose();
                        if (!isCurrent) onSelectConversation(item.id);
                      }}
                      style={{
                        backgroundColor: cardBg,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 8,
                        minHeight: 44,
                        opacity: 0.85,
                        borderLeftWidth: isCurrent ? 3 : 0,
                        borderLeftColor: railColor,
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Closed Smile conversation, ${STATUS_LABEL[item.status]}${isCurrent ? ", currently open" : ""}`}
                    >
                      <View
                        className="flex-row items-center"
                        style={{ gap: 8 }}
                      >
                        <View
                          style={{
                            backgroundColor: chipClosedBg,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 999,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "600",
                              color: chipClosedText,
                            }}
                          >
                            {STATUS_LABEL[item.status]}
                          </Text>
                        </View>
                        <Text
                          className="flex-1 text-sm font-medium"
                          numberOfLines={1}
                        >
                          Smile chat
                        </Text>
                      </View>
                      <Text className="mt-1 text-[11px] text-muted-foreground">
                        {formatTimeAgo(item.last_message_at)}
                      </Text>
                    </Pressable>
                  );
                })}
              </>
            ) : null}

            {!loading && !error && items.length === 0 ? (
              <Text className="py-6 text-center text-xs text-muted-foreground">
                No conversations yet. Tap "New chat" above to start one.
              </Text>
            ) : null}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// React Native doesn't expose `StyleSheet.absoluteFill` as a value when we
// only want the constant — inline it here so the file has no extra import.
const StyleSheetAbsoluteFill = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
