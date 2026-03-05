import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";

const NAIRA_SYMBOL = "₦";
const NAIRA_GREEN = colors.green[400];
const KOBO_ORANGE = colors.orange[500];

/** Splits "₦1,434,360.00" into symbol, integer part, and decimal part. */
function parseBalance(raw: string): { symbol: string; integer: string; decimal: string } {
  const trimmed = (raw ?? "").trim().replace(/\s/g, "");
  const hasNaira = trimmed.startsWith(NAIRA_SYMBOL);
  const numPart = hasNaira ? trimmed.slice(NAIRA_SYMBOL.length) : trimmed;
  const dotIdx = numPart.indexOf(".");
  const integer = dotIdx >= 0 ? numPart.slice(0, dotIdx) : numPart;
  const decimal = dotIdx >= 0 ? numPart.slice(dotIdx) : ""; // includes "."
  return { symbol: NAIRA_SYMBOL, integer: integer || "0", decimal: decimal || ".00" };
}

interface BalanceCardProps {
  walletBalance: string;
  cashbackBalance: string;
}

export function BalanceCard({ walletBalance, cashbackBalance }: BalanceCardProps) {
  const [balanceVisible, setBalanceVisible] = useState(true);

  const hasCashback = cashbackBalance !== "₦0.00" && cashbackBalance !== "";
  const parsed = parseBalance(walletBalance);
  const cashbackParsed = parseBalance(cashbackBalance);

  return (
    <View
      className="mx-5 overflow-hidden rounded-2xl px-5 pb-4 pt-5"
      style={{ backgroundColor: "#1A2332" }}
    >
      <Text className="text-xs font-semibold uppercase tracking-widest text-white/60">
        Available Balance
      </Text>

      <View className="mt-2 flex-row items-baseline gap-3">
        {balanceVisible ? (
          <View className="flex-row items-baseline">
            <Text className="text-3xl font-bold" style={{ color: NAIRA_GREEN }}>
              {parsed.symbol}
            </Text>
            <Text className="text-3xl font-bold text-white">
              {parsed.integer}
            </Text>
            <Text className="text-3xl font-bold" style={{ color: KOBO_ORANGE }}>
              {parsed.decimal}
            </Text>
          </View>
        ) : (
          <Text className="text-3xl font-bold text-white">
            {NAIRA_SYMBOL} • • • • •
          </Text>
        )}
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

      {hasCashback && (
        <View className="mt-1 flex-row flex-wrap items-baseline">
          <Text
            className="text-sm font-medium"
            style={{ color: colors.green[400] }}
          >
            Cashback:{" "}
          </Text>
          <Text className="text-sm font-medium text-white">
            {cashbackParsed.symbol}
            {cashbackParsed.integer}
            {cashbackParsed.decimal}
          </Text>
        </View>
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
