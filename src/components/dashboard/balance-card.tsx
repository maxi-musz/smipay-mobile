import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { useResponsiveScale } from "@/hooks/use-responsive-scale";

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
  /** Called when the user taps "Add Money". */
  onAddMoneyPress?: () => void;
  /** When true, balance is hidden and a refresh icon is shown; tap to retry. */
  loadFailed?: boolean;
  /** Called when the user taps the refresh area after load failed. */
  onRetry?: () => void;
  /** When true, render shimmering placeholders instead of balance numbers (cold start, no cached data). */
  isLoading?: boolean;
}

export function BalanceCard({
  walletBalance,
  cashbackBalance,
  onAddMoneyPress,
  loadFailed = false,
  onRetry,
  isLoading = false,
}: BalanceCardProps) {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const { s } = useResponsiveScale();

  const hasCashback = cashbackBalance !== "₦0.00" && cashbackBalance !== "";
  const parsed = parseBalance(walletBalance);
  const cashbackParsed = parseBalance(cashbackBalance);

  const glow = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const previousBalanceRef = useRef(walletBalance);

  useEffect(() => {
    const previous = previousBalanceRef.current;
    if (previous && previous !== walletBalance && walletBalance !== "₦0.00") {
      glow.value = withSequence(
        withTiming(0.18, { duration: 220, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.in(Easing.quad) }),
      );
    }
    previousBalanceRef.current = walletBalance;
  }, [walletBalance, glow]);

  useEffect(() => {
    if (isLoading) {
      shimmer.value = withRepeat(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      shimmer.value = 0;
    }
  }, [isLoading, shimmer]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + shimmer.value * 0.45,
  }));

  return (
    <View
      className="overflow-hidden rounded-2xl"
      style={{
        backgroundColor: "#1A2332",
        marginHorizontal: s(12),
        paddingHorizontal: s(16),
        paddingVertical: s(14),
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: colors.green[500],
          },
          glowStyle,
        ]}
      />
      <Text
        className="font-medium uppercase tracking-wide text-white/50"
        style={{ fontSize: s(10) }}
      >
        Available Balance
      </Text>

      <View
        className="flex-row items-baseline"
        style={{ marginTop: s(6), gap: s(8) }}
      >
        {isLoading ? (
          <Animated.View
            style={[
              {
                width: s(160),
                height: s(28),
                borderRadius: s(8),
                backgroundColor: "rgba(255,255,255,0.12)",
              },
              shimmerStyle,
            ]}
          />
        ) : loadFailed ? (
          <Pressable
            onPress={onRetry}
            className="flex-row items-center gap-2"
            hitSlop={12}
          >
            <Ionicons
              name="refresh"
              size={s(22)}
              color="rgba(255,255,255,0.8)"
            />
            <Text
              className="text-white/80"
              style={{ fontSize: s(14) }}
            >
              Tap to refresh
            </Text>
          </Pressable>
        ) : balanceVisible ? (
          <Animated.View
            key={`bal-${walletBalance}`}
            entering={FadeIn.duration(260)}
            exiting={FadeOut.duration(180)}
            className="flex-row items-baseline"
          >
            <Text
              className="font-semibold"
              style={{ color: NAIRA_GREEN, fontSize: s(24) }}
            >
              {parsed.symbol}
            </Text>
            <Text
              className="font-semibold text-white"
              style={{ fontSize: s(24) }}
            >
              {parsed.integer}
            </Text>
            <Text
              className="font-semibold"
              style={{ color: KOBO_ORANGE, fontSize: s(24) }}
            >
              {parsed.decimal}
            </Text>
          </Animated.View>
        ) : (
          <Text
            className="font-semibold text-white"
            style={{ fontSize: s(24) }}
          >
            {NAIRA_SYMBOL} • • • • •
          </Text>
        )}
        {!loadFailed && !isLoading && (
          <Pressable
            onPress={() => setBalanceVisible((v) => !v)}
            hitSlop={12}
          >
            <Ionicons
              name={balanceVisible ? "eye-outline" : "eye-off-outline"}
              size={s(18)}
              color="rgba(255,255,255,0.5)"
            />
          </Pressable>
        )}
      </View>

      {isLoading && (
        <Animated.View
          style={[
            {
              marginTop: s(8),
              width: s(110),
              height: s(12),
              borderRadius: s(6),
              backgroundColor: "rgba(255,255,255,0.10)",
            },
            shimmerStyle,
          ]}
        />
      )}

      {hasCashback && !loadFailed && !isLoading && (
        <View
          className="flex-row flex-wrap items-baseline"
          style={{ marginTop: s(2) }}
        >
          <Text
            className="font-medium"
            style={{ color: colors.green[400], fontSize: s(12) }}
          >
            Cashback:{" "}
          </Text>
          <Text
            className="font-medium text-white"
            style={{ fontSize: s(12) }}
          >
            {balanceVisible
              ? `${cashbackParsed.symbol}${cashbackParsed.integer}${cashbackParsed.decimal}`
              : "• • • • •"}
          </Text>
        </View>
      )}

      <View
        className="flex-row items-center justify-between"
        style={{ marginTop: s(12) }}
      >
        <Pressable
          className="flex-row items-center gap-1"
          onPress={() => router.push("/(app)/(tabs)/history")}
        >
          <Text
            className="text-white/70"
            style={{ fontSize: s(12) }}
          >
            Transaction History
          </Text>
          <Ionicons
            name="arrow-forward"
            size={s(12)}
            color="rgba(255,255,255,0.7)"
          />
        </Pressable>

        {onAddMoneyPress ? (
          <Pressable
            className="flex-row items-center gap-1 rounded-lg"
            style={{
              backgroundColor: KOBO_ORANGE,
              paddingHorizontal: s(16),
              paddingVertical: s(8),
            }}
            onPress={onAddMoneyPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Add money, show bank transfer details"
          >
            <Ionicons name="add" size={s(14)} color={colors.white} />
            <Text
              className="font-semibold"
              style={{ fontSize: s(12), color: colors.white }}
            >
              Add Money
            </Text>
          </Pressable>
        ) : (
          <Pressable
            className="flex-row items-center gap-1 rounded-lg"
            style={{
              backgroundColor: colors.gray[600],
              paddingHorizontal: s(16),
              paddingVertical: s(8),
              opacity: 0.5,
            }}
            disabled
            accessibilityRole="button"
            accessibilityLabel="Add money unavailable"
          >
            <Ionicons name="add" size={s(14)} color="rgba(255,255,255,0.5)" />
            <Text
              className="font-semibold"
              style={{ fontSize: s(12), color: "rgba(255,255,255,0.5)" }}
            >
              Add Money
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
