import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";

interface DataBalanceCardProps {
  walletBalance: string;
  /** When set, shows cashback and total available (wallet + cashback) for buying plans. */
  cashbackBalance?: string;
  /** Pre-formatted, e.g. "₦9,145.50" — max you can spend on data. */
  availableForPurchases?: string;
}

const HIDDEN_LABEL = "••••••";
const MUTED = "rgba(255,255,255,0.6)";
const SOFT = "rgba(255,255,255,0.75)";

export function DataBalanceCard({
  walletBalance,
  cashbackBalance,
  availableForPurchases,
}: DataBalanceCardProps) {
  const { isDark } = useAppTheme();
  const [visible, setVisible] = useState(true);
  const showCashback = cashbackBalance != null && cashbackBalance !== "";
  const showAvailable =
    availableForPurchases != null && availableForPurchases !== "";

  return (
    <View
      className="overflow-hidden rounded-xl px-3.5 py-2.5"
      style={{ backgroundColor: isDark ? "#1A2332" : "#1E293B" }}
    >
      <View className="flex-row items-center gap-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View className="min-w-0 flex-1">
            <Text
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: MUTED }}
            >
              Wallet
            </Text>
            <Text className="mt-0.5 text-base font-bold" style={{ color: "#fff" }}>
              {visible ? walletBalance : HIDDEN_LABEL}
            </Text>
          </View>

          {showCashback && (
            <>
              <View
                className="h-8 w-px self-center"
                style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
              />
              <View className="min-w-0 flex-1">
                <Text
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: MUTED }}
                >
                  Cashback
                </Text>
                <Text
                  className="mt-0.5 text-base font-bold"
                  style={{ color: "#fff" }}
                >
                  {visible ? cashbackBalance : HIDDEN_LABEL}
                </Text>
              </View>
            </>
          )}
        </View>

        <Pressable
          onPress={() => setVisible((v) => !v)}
          className="h-8 w-8 items-center justify-center rounded-full"
          hitSlop={8}
          accessibilityLabel={visible ? "Hide balances" : "Show balances"}
        >
          <Ionicons
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={18}
            color="rgba(255,255,255,0.7)"
          />
        </Pressable>
      </View>

      {showAvailable && (
        <View
          className="mt-2 flex-row items-center justify-between border-t pt-2"
          style={{ borderTopColor: "rgba(255,255,255,0.12)" }}
        >
          <Text className="flex-1 text-[11px] leading-4" style={{ color: SOFT }}>
            Available for purchases
          </Text>
          <Text className="text-[13px] font-bold" style={{ color: "#fff" }}>
            {visible ? availableForPurchases : HIDDEN_LABEL}
          </Text>
        </View>
      )}
    </View>
  );
}
