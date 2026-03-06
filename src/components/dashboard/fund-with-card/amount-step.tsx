import { useState } from "react";
import { Keyboard, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 50_000_000;

const QUICK_AMOUNTS = [500, 1_000, 2_000, 5_000, 10_000, 20_000];

interface AmountStepProps {
  onContinue: (amount: number) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function AmountStep({
  onContinue,
  onBack,
  isLoading = false,
}: AmountStepProps) {
  const [amountStr, setAmountStr] = useState("");
  const [error, setError] = useState<string | null>(null);

  const amount = parseInt(amountStr.replace(/\D/g, ""), 10) || 0;
  const isValid = amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;
  const canSubmit = isValid && !isLoading;

  function handleContinue() {
    Keyboard.dismiss();
    if (amount < MIN_AMOUNT) {
      setError("Enter at least ₦1");
      return;
    }
    if (amount > MAX_AMOUNT) {
      setError("Amount is too large");
      return;
    }
    setError(null);
    onContinue(amount);
  }

  function handleAmountChange(text: string) {
    const digits = text.replace(/\D/g, "");
    setAmountStr(digits);
    if (error) setError(null);
  }

  function selectQuickAmount(value: number) {
    Keyboard.dismiss();
    setAmountStr(String(value));
    if (error) setError(null);
  }

  function formatQuickLabel(value: number) {
    if (value >= 1000) return `₦${value / 1000}k`;
    return `₦${value}`;
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerClassName="gap-4 pb-2"
    >
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-medium text-foreground">
            Enter amount (₦)
          </Text>
          <Pressable onPress={onBack} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#6B7280" />
          </Pressable>
        </View>

        <Input
          label="Amount"
          placeholder="0"
          value={amountStr}
          onChangeText={handleAmountChange}
          error={error ?? undefined}
          keyboardType="number-pad"
          containerClassName="mb-1"
        />

        <View>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quick select
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {QUICK_AMOUNTS.map((value) => {
              const isSelected = amount === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => selectQuickAmount(value)}
                  className={cn(
                    "rounded-xl border px-4 py-2.5",
                    isSelected
                      ? "border-primary bg-primary/15"
                      : "border-border bg-muted/50 active:bg-muted",
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-semibold",
                      isSelected ? "text-primary" : "text-foreground",
                    )}
                  >
                    {formatQuickLabel(value)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          className="h-12 rounded-2xl"
          onPress={handleContinue}
          disabled={!canSubmit}
        >
          {isLoading ? (
            <Spinner color="#fff" />
          ) : (
            <Text className="text-sm font-semibold text-white">Continue</Text>
          )}
        </Button>
    </ScrollView>
  );
}
