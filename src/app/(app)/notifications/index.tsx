import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { fetchInbox, markAllInboxRead, type InboxItem } from "@/api";
import { Text } from "@/components/ui/text";
import { FullPageLoader } from "@/components/ui/loaders";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";
import { useToastStore } from "@/components/ui/toast/toast-store";

export default function NotificationInboxScreen() {
  const { isDark } = useAppTheme();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const bg = isDark ? "#020617" : "#F8F9FB";
  const cardBg = isDark ? "#111827" : "#FFFFFF";

  const load = useCallback(async (p = 1, append = false) => {
    try {
      const data = await fetchInbox(p, 20);
      if (append) {
        setItems((prev) => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setHasMore(p < data.pages);
      setPage(p);
    } catch {
      useToastStore.getState().show({
        variant: "error",
        title: "Error",
        message: "Could not load notifications.",
      });
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(1).finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(1);
    setRefreshing(false);
  };

  const onEndReached = () => {
    if (!hasMore || loading || refreshing) return;
    load(page + 1, true);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllInboxRead();
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
      useToastStore.getState().show({
        variant: "success",
        title: "Done",
        message: "All notifications marked as read.",
      });
    } catch {
      useToastStore.getState().show({
        variant: "error",
        title: "Error",
        message: "Could not mark notifications as read.",
      });
    }
  };

  const renderItem = ({ item }: { item: InboxItem }) => {
    const date = new Date(item.createdAt);
    const timeStr = date.toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <Pressable
        onPress={() => router.push(`/(app)/notifications/${item.id}`)}
        style={{
          backgroundColor: cardBg,
          borderRadius: 14,
          padding: 16,
          marginHorizontal: 16,
          marginBottom: 10,
          borderLeftWidth: item.is_read ? 0 : 3,
          borderLeftColor: item.is_read ? "transparent" : colors.primary,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: item.is_read ? "500" : "700",
                color: isDark ? "#F1F5F9" : "#0F172A",
              }}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: isDark ? "#94A3B8" : "#64748B",
                marginTop: 4,
              }}
              numberOfLines={2}
            >
              {item.body}
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: isDark ? "#64748B" : "#94A3B8", flexShrink: 0 }}>
            {timeStr}
          </Text>
        </View>
      </Pressable>
    );
  };

  if (loading && items.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <FullPageLoader message="Loading notifications..." />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: bg }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: 56,
            paddingBottom: 12,
            backgroundColor: cardBg,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "#1E293B" : "#E2E8F0",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="arrow-back" size={22} color={isDark ? "#F1F5F9" : "#0F172A"} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: "700", color: isDark ? "#F1F5F9" : "#0F172A" }}>
              Notifications
            </Text>
          </View>
          <Pressable onPress={handleMarkAllRead} hitSlop={10}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>
              Mark all read
            </Text>
          </Pressable>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Ionicons name="notifications-off-outline" size={48} color={isDark ? "#475569" : "#CBD5E1"} />
              <Text style={{ fontSize: 14, color: isDark ? "#64748B" : "#94A3B8", marginTop: 12 }}>
                No notifications yet
              </Text>
            </View>
          }
        />
      </View>
    </>
  );
}
