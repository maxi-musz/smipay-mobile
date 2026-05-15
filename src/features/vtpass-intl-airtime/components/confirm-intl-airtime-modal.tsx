import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Switch } from "@/components/ui/switch";
import { BottomSheetModal } from "@/components/ui/modals";
import { Spinner } from "@/components/ui/loaders";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import { formatNaira, parseBalanceToNumber } from "../lib/constants";
import type {
  IntlCountry,
  IntlOperator,
  IntlVariation,
} from "@/types/vtpass-intl-airtime";

interface ConfirmIntlAirtimeModalProps {
  visible: boolean;
  onClose: () => void;
  country: IntlCountry | null;
  operator: IntlOperator | null;
  variation: IntlVariation | null;
  billersCode: string;
  phone: string;
  amount: number;
  cashbackBalance: string;
  cashbackToEarn: number;
  useCashback: boolean;
  onUseCashbackChange: (value: boolean) => void;
  onConfirm: () => void;
  purchasing: boolean;
  walletBalance: string;
  balancesLoading: boolean;
  balancesError: string | null;
  onRetryBalances?: () => void;
}

export function ConfirmIntlAirtimeModal({
  visible,
  onClose,
  country,
  operator,
  variation,
  billersCode,
  phone,
  amount,
  cashbackBalance,
  cashbackToEarn,
  useCashback,
  onUseCashbackChange,
  onConfirm,
  purchasing,
  walletBalance,
  balancesLoading,
  balancesError,
  onRetryBalances,
}: ConfirmIntlAirtimeModalProps) {
  const { isDark } = useAppTheme();
  const balancesReady = !balancesLoading && !balancesError;
  const cashbackNum = parseBalanceToNumber(cashbackBalance);
  const hasCashback = balancesReady && cashbackNum > 0;
  const cashbackToApply =
    balancesReady && useCashback && hasCashback
      ? Math.min(cashbackNum, amount)
      : 0;
  const amountToPay = amount - cashbackToApply;
  const walletNum = parseBalanceToNumber(walletBalance);
  const balanceAfter = Math.max(0, walletNum - amountToPay);
  const insufficientWallet = balancesReady && walletNum + 1e-9 < amountToPay;
  const payDisabled =
    purchasing || balancesLoading || !!balancesError || insufficientWallet;

  const productLabel = [country?.name, operator?.name, variation?.name]
    .filter(Boolean)
    .join(" · ") || "International Airtime";

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      closeOnBackdrop
      showHandle
    >
      <View className="relative gap-5 pb-2">
        <Pressable
          onPress={onClose}
          className="absolute left-0 top-0 z-10 -m-2 p-2"
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={colors.gray[500]} />
        </Pressable>

        <View className="min-h-[100px] items-center justify-center px-8 pt-8">
          {balancesLoading ? (
            <>
              <Spinner color={colors.gray[500]} size="small" />
              <Text className="mt-3 text-center text-sm text-muted-foreground">
                Processing...
              </Text>
            </>
          ) : balancesError ? null : (
            <>
              <Text className="text-3xl font-bold text-foreground">
                {formatNaira(amountToPay)}
              </Text>
              {cashbackToApply > 0 && (
                <Text
                  className="mt-1 text-sm text-muted-foreground"
                  style={{ textDecorationLine: "line-through" }}
                >
                  {formatNaira(amount)}
                </Text>
              )}
            </>
          )}
        </View>

        <View className="gap-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted-foreground">Product</Text>
            <View className="flex-1 flex-row items-center justify-end gap-2">
              {operator?.operator_image && (
                <View className="overflow-hidden rounded-lg">
                  <Image
                    source={{ uri: operator.operator_image }}
                    style={{ width: 24, height: 24 }}
                    resizeMode="contain"
                  />
                </View>
              )}
              <Text className="text-sm font-medium text-foreground" numberOfLines={2}>
                {productLabel}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted-foreground">Destination</Text>
            <Text className="text-sm font-medium text-foreground">
              {billersCode}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted-foreground">Your phone</Text>
            <Text className="text-sm font-medium text-foreground">{phone}</Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted-foreground">Amount</Text>
            <Text className="text-sm font-medium text-foreground">
              {formatNaira(amount)}
            </Text>
          </View>

          {balancesReady && hasCashback && (
            <View className="flex-row items-center justify-between border-t border-border pt-3">
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">
                  Use Cashback ({formatNaira(cashbackNum)})
                </Text>
                {useCashback && cashbackToApply > 0 && (
                  <Text className="mt-0.5 text-sm font-medium text-foreground">
                    -{formatNaira(cashbackToApply)}
                  </Text>
                )}
              </View>
              <Switch
                value={useCashback}
                onValueChange={onUseCashbackChange}
              />
            </View>
          )}

          {balancesReady && cashbackToEarn > 0 && (
            <View
              className="self-start rounded-lg px-3 py-1.5"
              style={{
                backgroundColor: isDark ? colors.green[950] : colors.green[100],
              }}
            >
              <Text
                className="text-sm font-semibold"
                style={{
                  color: isDark ? colors.green[300] : colors.green[700],
                }}
              >
                +₦{cashbackToEarn} Cashback
              </Text>
            </View>
          )}
        </View>

        {balancesError ? (
          <View className="gap-3">
            <Text className="text-center text-sm text-destructive">
              {balancesError}
            </Text>
            {onRetryBalances ? (
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onPress={onRetryBalances}
                disabled={balancesLoading}
              >
                <Text className="font-semibold">Try again</Text>
              </Button>
            ) : null}
          </View>
        ) : balancesLoading ? (
          <View className="rounded-xl border border-dashed border-border bg-gray-50/50 px-4 py-4 dark:bg-gray-800/30">
            <Text className="text-center text-sm text-muted-foreground">
              Balance after purchase will appear here.
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center justify-between rounded-xl border border-border bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
            <Text className="text-sm text-muted-foreground">
              Balance after purchase
            </Text>
            <Text className="text-sm font-semibold text-foreground">
              {formatNaira(balanceAfter)}
            </Text>
          </View>
        )}

        {balancesReady && insufficientWallet ? (
          <Text className="text-center text-sm text-destructive">
            Insufficient wallet balance for this purchase. Fund your wallet or
            adjust the amount.
          </Text>
        ) : null}

        <Button
          size="lg"
          className="w-full rounded-xl"
          style={{ backgroundColor: colors.green[500] }}
          onPress={onConfirm}
          disabled={payDisabled}
        >
          {purchasing ? (
            <Spinner color="#fff" size="small" />
          ) : (
            <Text className="text-base font-semibold text-white">Pay</Text>
          )}
        </Button>
      </View>
    </BottomSheetModal>
  );
}
