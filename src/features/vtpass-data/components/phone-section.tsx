import { TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DataServiceItem, DataVariation } from "@/types/vtpass-data";
import { formatNaira } from "../lib/constants";

interface PhoneSectionProps {
  /** Phone number (billersCode) — 11 digits with leading 0. */
  phone: string;
  onPhoneChange: (text: string) => void;
  phoneError?: string;
  onClearPhoneError?: () => void;
  provider: DataServiceItem | null;
  variation: DataVariation | null;
  cashbackToEarn: number;
  onPay: () => void;
  canSubmit: boolean;
}

export function PhoneSection({
  phone,
  onPhoneChange,
  phoneError,
  onClearPhoneError,
  provider,
  variation,
  cashbackToEarn,
  onPay,
  canSubmit,
}: PhoneSectionProps) {
  const amount = variation?.variation_amount
    ? parseFloat(String(variation.variation_amount))
    : 0;
  const productLabel = [provider?.name, variation?.name].filter(Boolean).join(" · ") || "Data plan";

  return (
    <Animated.View
      entering={FadeInDown.delay(50).duration(300).springify().damping(15)}
      className="mt-6"
    >
      <Text className="mb-3 text-base font-semibold text-foreground">
        Phone number
      </Text>

      <View className="mb-4 rounded-xl border border-border bg-muted/30 px-3 py-3">
        <Text className="mb-1 text-sm text-muted-foreground">
          Selected plan
        </Text>
        <Text className="text-base font-medium text-foreground" numberOfLines={2}>
          {productLabel}
        </Text>
        {amount > 0 && (
          <Text className="mt-1 text-sm font-semibold text-foreground">
            {formatNaira(amount)}
          </Text>
        )}
      </View>

      <View className="mb-4">
        <Text className="mb-1.5 text-sm text-muted-foreground">
          Phone number (recipient)
        </Text>
        <View
          className={cn(
            "flex-row items-center gap-2 rounded-xl border-b py-2 px-3",
            phoneError ? "border-destructive" : "border-border",
          )}
        >
          <Text className="text-base font-medium text-muted-foreground">+234</Text>
          <TextInput
            className="flex-1 text-base font-medium text-foreground min-h-[24px] py-0"
            placeholder="8012345678"
            placeholderTextColor="#9CA3AF"
            value={phone.replace(/^0/, "")}
            onChangeText={(t) => {
              const digits = t.replace(/\D/g, "").slice(0, 10);
              onPhoneChange(digits.length === 10 ? "0" + digits : digits);
            }}
            keyboardType="number-pad"
            onFocus={onClearPhoneError}
          />
        </View>
        {phoneError && (
          <Text className="mt-1 text-sm text-destructive">{phoneError}</Text>
        )}
      </View>

      {cashbackToEarn > 0 && (
        <Text className="mb-3 text-sm text-muted-foreground">
          {`You'll earn ₦${cashbackToEarn} cashback on this purchase`}
        </Text>
      )}

      <Button
        size="lg"
        className="w-full rounded-xl"
        onPress={onPay}
        disabled={!canSubmit}
      >
        <Text className="text-base font-semibold text-white">Continue</Text>
      </Button>
    </Animated.View>
  );
}
