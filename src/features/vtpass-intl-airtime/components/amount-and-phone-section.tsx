import { Keyboard, Pressable, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import { cn } from "@/lib/utils";

interface AmountAndPhoneSectionProps {
  /** Destination number to top up (beneficiary). */
  billersCode: string;
  onBillersCodeChange: (text: string) => void;
  /** Customer phone for notifications. */
  phone: string;
  onPhoneChange: (text: string) => void;
  amountStr: string;
  onAmountChange: (text: string) => void;
  /** Country prefix hint (e.g. "233" for Ghana). */
  countryPrefix?: string;
  amountError?: string;
  billersCodeError?: string;
  phoneError?: string;
  onClearAmountError?: () => void;
  onClearBillersCodeError?: () => void;
  onClearPhoneError?: () => void;
  cashbackToEarn: number;
  onPay: () => void;
  canSubmit: boolean;
}

export function AmountAndPhoneSection({
  billersCode,
  onBillersCodeChange,
  phone,
  onPhoneChange,
  amountStr,
  onAmountChange,
  countryPrefix,
  amountError,
  billersCodeError,
  phoneError,
  onClearAmountError,
  onClearBillersCodeError,
  onClearPhoneError,
  cashbackToEarn,
  onPay,
  canSubmit,
}: AmountAndPhoneSectionProps) {
  const { isDark } = useAppTheme();

  return (
    <Animated.View
      entering={FadeInDown.delay(50).duration(300).springify().damping(15)}
      className="mt-6"
    >
      <Text className="mb-3 text-base font-semibold text-foreground">
        Amount & recipient
      </Text>

      {/* Amount (NGN) - optional for some plans */}
      <View className="mb-4">
        <Text className="mb-1.5 text-sm text-muted-foreground">
          Amount (₦)
        </Text>
        <View
          className={cn(
            "flex-row items-center gap-2 rounded-xl border-b py-2 px-3",
            amountError ? "border-destructive" : "border-border",
          )}
        >
          <Text className="text-base font-medium text-muted-foreground">₦</Text>
          <TextInput
            className="flex-1 text-base font-medium text-foreground min-h-[24px] py-0"
            placeholder="e.g. 2000"
            placeholderTextColor="#9CA3AF"
            value={amountStr}
            onChangeText={onAmountChange}
            keyboardType="number-pad"
            onFocus={onClearAmountError}
          />
        </View>
        {amountError && (
          <Text className="mt-1.5 text-sm text-destructive">{amountError}</Text>
        )}
      </View>

      {/* Destination number (billersCode) */}
      <View className="mb-4">
        <Text className="mb-1.5 text-sm text-muted-foreground">
          Destination number {countryPrefix ? `(+${countryPrefix})` : ""}
        </Text>
        <TextInput
          className={cn(
            "rounded-xl border px-4 py-3 text-base text-foreground",
            billersCodeError ? "border-destructive" : "border-border bg-muted/30",
          )}
          placeholder={countryPrefix ? `e.g. ${countryPrefix}801234567` : "Phone to top up"}
          placeholderTextColor="#9CA3AF"
          value={billersCode}
          onChangeText={onBillersCodeChange}
          keyboardType="phone-pad"
          onFocus={onClearBillersCodeError}
        />
        {billersCodeError && (
          <Text className="mt-1.5 text-sm text-destructive">
            {billersCodeError}
          </Text>
        )}
      </View>

      {/* Your phone (for notifications) */}
      <View className="mb-4">
        <Text className="mb-1.5 text-sm text-muted-foreground">
          Your phone (notifications)
        </Text>
        <TextInput
          className={cn(
            "rounded-xl border px-4 py-3 text-base text-foreground",
            phoneError ? "border-destructive" : "border-border bg-muted/30",
          )}
          placeholder="e.g. 08012345678"
          placeholderTextColor="#9CA3AF"
          value={phone}
          onChangeText={onPhoneChange}
          keyboardType="phone-pad"
          onFocus={onClearPhoneError}
        />
        {phoneError && (
          <Text className="mt-1.5 text-sm text-destructive">{phoneError}</Text>
        )}
      </View>

      {cashbackToEarn > 0 && (
        <View
          className="mb-4 self-start rounded-lg px-3 py-1.5"
          style={{ backgroundColor: isDark ? colors.green[950] : colors.green[100] }}
        >
          <Text
            className="text-sm font-semibold"
            style={{ color: isDark ? colors.green[300] : colors.green[700] }}
          >
            +₦{cashbackToEarn} Cashback
          </Text>
        </View>
      )}

      <Pressable
        onPress={() => {
          Keyboard.dismiss();
          onPay();
        }}
        disabled={!canSubmit}
        className="rounded-xl py-3.5"
        style={{ backgroundColor: colors.green[500] }}
      >
        <Text className="text-center text-base font-semibold text-white">
          Pay
        </Text>
      </Pressable>
    </Animated.View>
  );
}
