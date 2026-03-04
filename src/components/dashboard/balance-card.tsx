import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";

interface BalanceCardProps {
  balance: number;
  cashback?: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function BalanceCard({ balance, cashback = 0 }: BalanceCardProps) {
  const [balanceVisible, setBalanceVisible] = useState(true);

  return (
    <View
      className="mx-5 overflow-hidden rounded-2xl px-5 pb-4 pt-5"
      style={{ backgroundColor: "#1A2332" }}
    >
      <Text className="text-xs font-semibold uppercase tracking-widest text-white/60">
        Available Balance
      </Text>

      <View className="mt-2 flex-row items-center gap-3">
        <Text className="text-3xl font-bold text-white">
          {balanceVisible ? `₦${formatCurrency(balance)}` : "₦ • • • • •"}
        </Text>
        <Pressable
          onPress={() => setBalanceVisible((v) => !v)}
          hitSlop={12}
        >
          <Ionicons
            name={balanceVisible ? "eye-outline" : "eye-off-outline"}
            size={20}
            color="rgba(255,255,255,0.5)"
          />
        </Pressable>
      </View>

      {cashback > 0 && (
        <Text
          className="mt-1 text-sm font-medium"
          style={{ color: colors.green[400] }}
        >
          Cashback: {cashback}
        </Text>
      )}

      <View className="mt-4 flex-row items-center justify-between">
        <Pressable
          className="flex-row items-center gap-1"
          onPress={() => router.push("/(app)/(tabs)/history")}
        >
          <Text className="text-sm text-white/80">Transaction History</Text>
          <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.8)" />
        </Pressable>

        <Pressable
          className="flex-row items-center gap-1 rounded-xl px-5 py-2.5"
          style={{ backgroundColor: colors.green[500] }}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text className="text-sm font-semibold text-white">
            Add Money
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
