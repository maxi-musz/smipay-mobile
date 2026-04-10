import { Keyboard, Pressable, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  getAirtimeCashbackRate,
  computeCashbackToEarn,
} from "@/features/vtpass-airtime/constants";
import { cn } from "@/lib/utils";
import type { CashbackRate, RewardBanner } from "@/types/homepage";

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

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
  const amount = parseInt(amountStr.replace(/\D/g, ""), 10) || 0;
  const { percentage, maxPerTransaction } = getAirtimeCashbackRate(
    cashbackRates,
    rewardBanners,
  );

  const effectiveMax =
    maxAffordable != null && maxAffordable >= 0
      ? Math.min(amountMax, maxAffordable)
      : amountMax;

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

    return (
      <Pressable
        key={value}
        onPress={() => selectQuickAmount(value)}
        className={cn(
          "flex-1 rounded-xl border overflow-hidden min-w-0",
          isSelected
            ? "border-primary bg-primary/15"
            : "border-border bg-muted/50 active:bg-muted",
        )}
      >
        {showCashback && (
          <View
            className="px-3 py-1"
            style={{
              backgroundColor: isDark ? colors.green[950] : colors.green[100],
            }}
          >
            <Text
              className="text-xs font-semibold"
              style={{
                color: isDark ? colors.green[300] : colors.green[700],
              }}
            >
              ₦{cashbackToEarn} Cashback
            </Text>
          </View>
        )}
        <View className={cn("px-3 py-2.5 items-center", showCashback && "pt-2")}>
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
      entering={FadeInDown.delay(50).duration(300).springify().damping(15)}
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

      {/* Amount input row: ₦ + minimal line + small Pay button */}
      <View
        className={cn(
          "flex-row items-center gap-2 border-b py-2",
          error ? "border-destructive" : "border-border",
        )}
      >
        <Text className="text-base font-medium text-muted-foreground">₦</Text>
        <TextInput
          className="flex-1 text-base font-medium text-foreground min-h-[24px] py-0"
          placeholder={`${amountMin} - ${effectiveMax.toLocaleString()}`}
          placeholderTextColor="#9CA3AF"
          value={amountStr}
          onChangeText={onAmountChange}
          keyboardType="number-pad"
          onFocus={onClearAmountError}
        />
        {onPay && (
          <Pressable
            onPress={onPay}
            disabled={!canSubmit}
            className="rounded-lg px-4 py-2 active:opacity-80"
            style={{ backgroundColor: colors.green[500] }}
          >
            <Text className="text-sm font-semibold text-white">Pay</Text>
          </Pressable>
        )}
      </View>
      {error && (
        <Text className="mt-1.5 text-sm text-destructive">{error}</Text>
      )}
    </Animated.View>
  );
}
