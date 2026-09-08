import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { fetchBvnStatus } from "@/api";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import type { BvnVerificationStatusData } from "@/types/bvn-verification";

/**
 * Self-contained BVN entry for the KYC hub. Renders nothing until it knows the
 * feature is enabled server-side, so turning BVN on/off from the admin panel
 * shows/hides this with no app release.
 */
export function BvnVerificationCard() {
  const { isDark } = useAppTheme();
  const [status, setStatus] = useState<BvnVerificationStatusData | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchBvnStatus();
      if (res.success && res.data) setStatus(res.data);
    } catch {
      /* leave hidden on error */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded || !status?.enabled) return null;

  const verified = status.is_verified;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/(app)/profile/bvn-verification" })}
      disabled={verified}
      className="mb-5 flex-row items-center justify-between rounded-2xl border px-4 py-4 active:opacity-80"
      style={{
        backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
        borderColor: isDark ? "rgba(148,163,184,0.12)" : "rgba(0,0,0,0.06)",
      }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{
            backgroundColor: verified
              ? "rgba(16,185,129,0.12)"
              : "rgba(245,130,32,0.12)",
          }}
        >
          <Ionicons
            name={verified ? "checkmark-circle" : "finger-print"}
            size={20}
            color={verified ? colors.success : colors.orange[500]}
          />
        </View>
        <View>
          <Text className="text-[12px] text-muted-foreground">
            BVN verification
          </Text>
          <Text className="mt-0.5 text-[15px] font-medium text-foreground">
            {verified
              ? `Verified${status.bvn_last4 ? ` · ****${status.bvn_last4}` : ""}`
              : "Verify your BVN"}
          </Text>
        </View>
      </View>
      {!verified ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={isDark ? "#94A3B8" : "#9CA3AF"}
        />
      ) : null}
    </Pressable>
  );
}
