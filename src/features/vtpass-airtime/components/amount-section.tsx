import { useState } from "react";
import { Keyboard, Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { NumericKeypad } from "@/components/ui/numeric-keypad";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  getAirtimeCashbackRate,
  computeCashbackToEarn,
} from "@/features/vtpass-airtime/constants";
import { cn } from "@/lib/utils";
import type { CashbackRate, RewardBanner } from "@/types/homepage";

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

/** Reserves one line of space for every tile so amounts align with cashback rows */
const CASHBACK_STRIP_MIN_HEIGHT = 28;

interface AmountSectionProps {
  amountStr: string;
  amountMin: number;
  amountMax: number;
  /** Caps quick amounts and placeholder hint to wallet + cashback (optional). */
  maxAffordable?: number;
  error?: string;
  onAmountChange: (text: string) => void;
  onClearAmountError: () => void;
  cashbackRates?: CashbackRate[];
  rewardBanners?: RewardBanner[];
  onPay?: () => void;
  canSubmit?: boolean;
}

export function AmountSection({
  amountStr,
  amountMin,
  amountMax,
  maxAffordable,
  error,
  onAmountChange,
  onClearAmountError,
  cashbackRates,
  rewardBanners,
  onPay,
  canSubmit = false,
}: AmountSectionProps) {
  const { isDark } = useAppTheme();
  const [amountKeypadExpanded, setAmountKeypadExpanded] = useState(true);
  const amount = parseInt(amountStr.replace(/\D/g, ""), 10) || 0;
  const { percentage, maxPerTransaction } = getAirtimeCashbackRate(
    cashbackRates,
    rewardBanners,
  );

  const effectiveMax =
    maxAffordable != null && maxAffordable >= 0
      ? Math.min(amountMax, maxAffordable)
      : amountMax;

  /** Local keypad digits only — parent stores digits-only `amountStr` */
  function appendKeypadDigit(digit: string) {
    const current = amountStr.replace(/\D/g, "");
    const raw = `${current}${digit}`;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    const capWhole = Math.floor(effectiveMax);
    if (n > capWhole) return;
    onAmountChange(String(n));
    onClearAmountError();
  }

  function keyPadBackspace() {
    const d = amountStr.replace(/\D/g, "").slice(0, -1);
    onAmountChange(d);
    if (error) onClearAmountError();
  }

  function selectQuickAmount(value: number) {
    Keyboard.dismiss();
    onAmountChange(String(value));
    onClearAmountError();
  }

  const validQuickAmounts = QUICK_AMOUNTS.filter(
    (v) => v >= amountMin && v <= effectiveMax,
  );

  const row1 = validQuickAmounts.slice(0, 3);
  const row2 = validQuickAmounts.slice(3, 6);

  function renderQuickAmountButton(value: number) {
    const isSelected = amount === value;
    const cashbackToEarn = computeCashbackToEarn(
      value,
      percentage,
      maxPerTransaction,
    );
    const showCashback = cashbackToEarn > 0;
    const hasCashbackProgram = percentage > 0;

    const stripBg = hasCashbackProgram
      ? isDark
        ? colors.green[950]
        : colors.green[100]
      : isDark
        ? colors.gray[800]
        : colors.gray[200];
    const cashbackColor = isDark ? colors.green[300] : colors.green[700];
    const noEarnTint = isDark
      ? "rgba(134, 239, 172, 0.43)"
      : "rgba(22, 101, 52, 0.45)";

    return (
      <Pressable
        key={value}
        onPress={() => selectQuickAmount(value)}
        className={cn(
          "flex-1 flex-col min-w-0 rounded-xl border overflow-hidden",
          isSelected
            ? "border-primary bg-primary/15"
            : "border-border bg-muted/50 active:bg-muted",
        )}
      >
        <View
          className="justify-center px-2"
          style={{
            minHeight: CASHBACK_STRIP_MIN_HEIGHT,
            backgroundColor: stripBg,
          }}
        >
          {hasCashbackProgram ? (
            <Text
              className="text-center text-xs font-semibold"
              style={{
                color: showCashback ? cashbackColor : noEarnTint,
              }}
            >
              {showCashback ? `₦${cashbackToEarn} Cashback` : "—"}
            </Text>
          ) : null}
        </View>
        <View className="items-center px-3 py-2">
          <Text
            className={cn(
              "text-sm font-semibold",
              isSelected ? "text-primary" : "text-foreground",
            )}
          >
            ₦{value >= 1000 ? `${value / 1000}k` : value}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(50).duration(220)}
      className="mt-6"
    >
      <Text className="mb-3 text-base font-semibold text-foreground">
        Top up
      </Text>
      <View className="gap-2 mb-3">
        {row1.length > 0 && (
          <View className="flex-row gap-2">
            {row1.map(renderQuickAmountButton)}
          </View>
        )}
        {row2.length > 0 && (
          <View className="flex-row gap-2">
            {row2.map(renderQuickAmountButton)}
          </View>
        )}
      </View>

      {/* Amount display + Pay (digits via NumericKeypad below) */}
      <View
        className={cn(
          "flex-row items-center gap-2 border-b py-3",
          error ? "border-destructive" : "border-border",
        )}
      >
        <Text className="text-base font-medium text-muted-foreground">₦</Text>
        <View className="min-h-[28px] flex-1 justify-center py-1">
          {amountStr.replace(/\D/g, "").length > 0 ? (
            <Text className="text-lg font-semibold tabular-nums text-foreground">
              {amount.toLocaleString("en-NG")}
            </Text>
          ) : (
            <Text className="text-base text-muted-foreground">
              {amountMin.toLocaleString("en-NG")} —{" "}
              {effectiveMax.toLocaleString("en-NG")}
            </Text>
          )}
        </View>
        {onPay && (
          <Pressable
            onPress={onPay}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            className={cn(
              "rounded-lg px-4 py-2",
              canSubmit && "active:opacity-80",
            )}
            style={{
              backgroundColor: canSubmit
                ? colors.green[500]
                : isDark
                  ? "#4b5563"
                  : "#9ca3af",
            }}
          >
            <Text
              className={cn(
                "text-sm font-semibold",
                canSubmit ? "text-white" : "text-gray-200",
              )}
            >
              Pay
            </Text>
          </Pressable>
        )}
      </View>
      {error && (
        <Text className="mt-1.5 text-sm text-destructive">{error}</Text>
      )}

      {amountKeypadExpanded ? (
        <>
          <Pressable
            onPress={() => setAmountKeypadExpanded(false)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Hide amount keypad"
            className="mt-4 flex-row items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 py-3 active:opacity-80"
          >
            <Text className="text-sm font-medium text-muted-foreground">
              Hide keypad
            </Text>
            <Ionicons
              name="chevron-down"
              size={18}
              color={isDark ? "#94A3B8" : "#64748B"}
            />
          </Pressable>
          <NumericKeypad
            disabled={false}
            className="mt-2"
            keyHeight={52}
            onDigitPress={appendKeypadDigit}
            onBackspacePress={keyPadBackspace}
          />
        </>
      ) : (
        <Pressable
          onPress={() => setAmountKeypadExpanded(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Show amount keypad"
          className="mt-4 flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3.5 active:opacity-80"
        >
          <Ionicons name="calculator-outline" size={18} color={colors.green[500]} />
          <Text className="text-sm font-semibold" style={{ color: colors.green[600] }}>
            Show keypad · custom amount
          </Text>
          <Ionicons
            name="chevron-up"
            size={18}
            color={colors.green[600]}
          />
        </Pressable>
      )}
    </Animated.View>
  );
}
