import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { fetchInboxItem, type InboxItem } from "@/api";
import { Text } from "@/components/ui/text";
import { FullPageLoader } from "@/components/ui/loaders";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useAppTheme();
  const [item, setItem] = useState<InboxItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bg = isDark ? "#020617" : "#F8F9FB";
  const cardBg = isDark ? "#111827" : "#FFFFFF";

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchInboxItem(String(id))
      .then((data) => {
        if (!data) setError("Notification not found.");
        else setItem(data);
      })
      .catch(() => setError("Could not load notification."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <FullPageLoader message="Loading..." />
      </>
    );
  }

  if (error || !item) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 14, color: colors.error, textAlign: "center" }}>{error}</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 14, color: colors.primary, fontWeight: "600" }}>Go back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const date = new Date(item.createdAt).toLocaleDateString("en-NG", {
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
            {item.title}
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
              {item.title}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: isDark ? "#94A3B8" : "#64748B",
                marginTop: 8,
                lineHeight: 20,
              }}
            >
              {item.body}
            </Text>
          </View>

          {/* Full message */}
          {item.message ? (
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
                {item.message}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </>
  );
}
