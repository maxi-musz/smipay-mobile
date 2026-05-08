import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";

interface DataBalanceCardProps {
  walletBalance: string;
  /** When set, shows cashback and total available (wallet + cashback) for buying plans. */
  cashbackBalance?: string;
  /** Pre-formatted, e.g. "₦9,145.50" — max you can spend on data. */
  availableForPurchases?: string;
}

const HIDDEN_LABEL = "••••••";

export function DataBalanceCard({
  walletBalance,
  cashbackBalance,
  availableForPurchases,
}: DataBalanceCardProps) {
  const { isDark } = useAppTheme();
  const [visible, setVisible] = useState(true);

  return (
    <View
      className="overflow-hidden rounded-2xl px-5 py-4"
      style={{ backgroundColor: isDark ? "#1A2332" : "#1E293B" }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 min-w-0">
          <Text
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Wallet
          </Text>
          <Text
            className="mt-1 text-2xl font-bold"
            style={{ color: "#fff" }}
          >
            {visible ? walletBalance : HIDDEN_LABEL}
          </Text>
          {cashbackBalance != null && cashbackBalance !== "" && (
            <View className="mt-3">
              <Text
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                Cashback
              </Text>
              <Text className="mt-0.5 text-base font-semibold" style={{ color: "#fff" }}>
                {visible ? cashbackBalance : HIDDEN_LABEL}
              </Text>
            </View>
          )}
          {availableForPurchases != null && availableForPurchases !== "" && (
            <Text
              className="mt-3 text-xs leading-snug"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              Available for data purchases (wallet + cashback):{" "}
              <Text style={{ fontWeight: "700", color: "#fff" }}>
                {visible ? availableForPurchases : HIDDEN_LABEL}
              </Text>
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => setVisible((v) => !v)}
          className="h-10 w-10 items-center justify-center rounded-full"
          hitSlop={8}
        >
          <Ionicons
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={22}
            color="rgba(255,255,255,0.7)"
          />
        </Pressable>
      </View>
    </View>
  );
}
