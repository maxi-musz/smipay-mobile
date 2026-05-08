import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Switch } from "@/components/ui/switch";
import { BottomSheetModal } from "@/components/ui/modals";
import { Spinner } from "@/components/ui/loaders";
import { colors } from "@/constants/colors";
import { getNetworkProviderLogo } from "@/lib/network-provider-logo";
import { parseBalanceToNumber } from "@/features/vtpass-airtime/constants";
import type { AirtimeServiceItem } from "@/types/vtpass-airtime";

function NetworkLogo({
  serviceID,
  size,
}: {
  serviceID: string;
  size: number;
}) {
  const source = getNetworkProviderLogo(serviceID);

  if (!source) {
    return (
      <View
        className="items-center justify-center rounded-lg bg-muted"
        style={{ width: size, height: size }}
      >
        <Ionicons
          name="cellular"
          size={size * 0.55}
          color={colors.gray[500]}
        />
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={{ width: size, height: size, borderRadius: 8 }}
      resizeMode="contain"
    />
  );
}

function formatNaira(value: number): string {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

interface ConfirmBuyAirtimeModalProps {
  visible: boolean;
  onClose: () => void;
  productName: string;
  selectedProvider: AirtimeServiceItem | null;
  recipientPhone: string;
  amount: number;
  cashbackBalance: string;
  cashbackToEarn: number;
  useCashback: boolean;
  onUseCashbackChange: (value: boolean) => void;
  onConfirm: () => void;
  purchasing: boolean;
  walletBalance?: string;
}

export function ConfirmBuyAirtimeModal({
  visible,
  onClose,
  productName,
  selectedProvider,
  recipientPhone,
  amount,
  cashbackBalance,
  cashbackToEarn,
  useCashback,
  onUseCashbackChange,
  onConfirm,
  purchasing,
  walletBalance = "₦0.00",
}: ConfirmBuyAirtimeModalProps) {
  const cashbackNum = parseBalanceToNumber(cashbackBalance);
  const hasCashback = cashbackNum > 0;
  const cashbackToApply =
    useCashback && hasCashback ? Math.min(cashbackNum, amount) : 0;
  const amountToPay = amount - cashbackToApply;
  const walletNum = parseBalanceToNumber(walletBalance);

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      closeOnBackdrop
      showHandle
    >
      <View className="relative gap-5 pb-2">
        {/* Close button - top left */}
        <Pressable
          onPress={onClose}
          className="absolute left-0 top-0 z-10 -m-2 p-2"
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={colors.gray[500]} />
        </Pressable>

        {/* Amount display - large final, struck-through original */}
        <View className="items-center pt-8">
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
        </View>

        {/* Purchase summary - key-value pairs like OPay */}
        <View className="gap-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4">
          {/* Product Name */}
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted-foreground">Product Name</Text>
            <View className="flex-row items-center gap-2">
              {selectedProvider && (
                <NetworkLogo serviceID={selectedProvider.serviceID} size={24} />
              )}
              <Text className="text-sm font-medium text-foreground">
                {productName}
              </Text>
            </View>
          </View>

          {/* Recipient Mobile */}
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted-foreground">
              Recipient Mobile
            </Text>
            <Text className="text-sm font-medium text-foreground">
              {recipientPhone}
            </Text>
          </View>

          {/* Amount */}
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted-foreground">Amount</Text>
            <Text className="text-sm font-medium text-foreground">
              {formatNaira(amount)}
            </Text>
          </View>

          {/* Use Cashback - label, -₦ saved, toggle */}
          {hasCashback && (
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

          {/* Bonus to Earn - green badge */}
          {cashbackToEarn > 0 && (
            <View
              className="self-start rounded-lg px-3 py-1.5"
              style={{ backgroundColor: colors.green[100] }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: colors.green[700] }}
              >
                +₦{cashbackToEarn} Cashback
              </Text>
            </View>
          )}
        </View>

        {/* Balance after purchase */}
        <View className="flex-row items-center justify-between rounded-xl border border-border bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
          <Text className="text-sm text-muted-foreground">
            Balance after purchase
          </Text>
          <Text className="text-sm font-semibold text-foreground">
            {formatNaira(Math.max(0, walletNum - amountToPay))}
          </Text>
        </View>

        {/* Pay button - full width green */}
        <Button
          size="lg"
          className="w-full rounded-xl"
          style={{ backgroundColor: colors.green[500] }}
          onPress={onConfirm}
          disabled={purchasing || walletNum + 1e-9 < amountToPay}
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
