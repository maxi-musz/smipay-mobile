import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { InboxItem } from "@/api";
import { Text } from "@/components/ui/text";
import { FullPageLoader } from "@/components/ui/loaders";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";
import { useInboxStore } from "@/store";

export default function NotificationDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = idParam ? String(idParam) : "";
  const { isDark } = useAppTheme();

  const ensureInboxItem = useInboxStore.use.ensureInboxItem();

  const [fetchFinished, setFetchFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bg = isDark ? "#020617" : "#F8F9FB";
  const cardBg = isDark ? "#111827" : "#FFFFFF";

  useEffect(() => {
    if (!id) return;
    setError(null);
    setFetchFinished(false);
    let cancelled = false;
    void (async () => {
      const data = await ensureInboxItem(id);
      if (cancelled) return;
      setFetchFinished(true);
      if (!data) setError("Could not load notification.");
    })();
    return () => {
      cancelled = true;
    };
  }, [id, ensureInboxItem]);

  const displayItem: InboxItem | null = useInboxStore((s) =>
    id ? (s.detailById[id] ?? s.items.find((i) => i.id === id) ?? null) : null,
  );

  const loading = !displayItem && !fetchFinished;

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <FullPageLoader message="Loading..." />
      </>
    );
  }

  if (error || !displayItem) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 14, color: colors.error, textAlign: "center" }}>
            {error ?? "Notification not found."}
          </Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 14, color: colors.orange[500], fontWeight: "600" }}>Go back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const row = displayItem;
  const date = new Date(row.createdAt).toLocaleDateString("en-NG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: bg }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingTop: 56,
            paddingBottom: 12,
            backgroundColor: cardBg,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "#1E293B" : "#E2E8F0",
            gap: 12,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color={isDark ? "#F1F5F9" : "#0F172A"} />
          </Pressable>
          <Text
            style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#F1F5F9" : "#0F172A", flex: 1 }}
            numberOfLines={1}
          >
            {row.title}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Date */}
          <Text style={{ fontSize: 11, color: isDark ? "#64748B" : "#94A3B8", marginBottom: 16 }}>
            {date}
          </Text>

          {/* Title + Body card */}
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 14,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", color: isDark ? "#F1F5F9" : "#0F172A" }}>
              {row.title}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: isDark ? "#94A3B8" : "#64748B",
                marginTop: 8,
                lineHeight: 20,
              }}
            >
              {row.body}
            </Text>
          </View>

          {/* Full message */}
          {row.message ? (
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 14,
                padding: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: isDark ? "#E2E8F0" : "#334155",
                  lineHeight: 22,
                }}
              >
                {row.message}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </>
  );
}
