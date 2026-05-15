import { Image, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Switch } from "@/components/ui/switch";
import { BottomSheetModal } from "@/components/ui/modals";
import { Spinner } from "@/components/ui/loaders";
import { colors } from "@/constants/colors";
import {
  formatNaira,
  parseBalanceToNumber,
} from "../lib/constants";
import { getCableLogo } from "../lib/cable-logos";

interface ConfirmCableModalProps {
  visible: boolean;
  onClose: () => void;
  providerName: string;
  serviceID: string;
  planName: string;
  billersCode: string;
  amount: number;
  subscriptionTypeLabel?: string;
  customerName?: string;
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

export function ConfirmCableModal({
  visible,
  onClose,
  providerName,
  serviceID,
  planName,
  billersCode,
  amount,
  subscriptionTypeLabel,
  customerName,
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
}: ConfirmCableModalProps) {
  const balancesReady = !balancesLoading && !balancesError;
  const cashbackNum = parseBalanceToNumber(cashbackBalance);
  const hasCashback = balancesReady && cashbackNum > 0;
  const cashbackToApply =
    balancesReady && useCashback && hasCashback
      ? Math.min(cashbackNum, amount)
      : 0;
  const amountToPay = amount - cashbackToApply;
  const walletBalanceNum = parseBalanceToNumber(walletBalance);
  const balanceAfter = Math.max(0, walletBalanceNum - amountToPay);
  const insufficientWallet =
    balancesReady && walletBalanceNum + 1e-9 < amountToPay;
  const payDisabled =
    purchasing || balancesLoading || !!balancesError || insufficientWallet;

  const logo = getCableLogo(serviceID);

  const detailRow = (label: string, value: React.ReactNode, last = false) => (
    <View
      className={`flex-row items-center justify-between py-2.5 ${last ? "" : "border-b border-border"}`}
    >
      <Text className="text-[13px] text-muted-foreground shrink-0">{label}</Text>
      <View className="flex-1 min-w-0 flex-row items-center justify-end gap-2">
        {value}
      </View>
    </View>
  );

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      closeOnBackdrop
      showHandle
    >
      <View className="relative">
        <Pressable
          onPress={onClose}
          className="absolute left-0 top-0 z-10 -m-2 p-2"
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={colors.gray[500]} />
        </Pressable>

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: 4 }}
        >
          <View className="min-h-[88px] items-center justify-center pt-6 pb-3">
            {balancesLoading ? (
              <>
                <Spinner color={colors.gray[500]} size="small" />
                <Text className="mt-2 text-center text-xs text-muted-foreground">
                  Processing...
                </Text>
              </>
            ) : balancesError ? null : (
              <>
                <Text className="text-2xl font-bold text-foreground">
                  {formatNaira(amountToPay)}
                </Text>
                {cashbackToApply > 0 && (
                  <Text
                    className="mt-0.5 text-sm text-muted-foreground"
                    style={{ textDecorationLine: "line-through" }}
                  >
                    {formatNaira(amount)}
                  </Text>
                )}
              </>
            )}
          </View>

          <View className="rounded-2xl bg-gray-50 px-4 dark:bg-gray-800/50">
            {detailRow(
              "Provider",
              <>
                {logo ? (
                  <Image
                    source={logo}
                    style={{ width: 22, height: 22, borderRadius: 4 }}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons name="tv" size={16} color={colors.gray[500]} />
                )}
                <Text className="text-[13px] font-medium text-foreground text-right">
                  {providerName}
                </Text>
              </>,
              false,
            )}
            {detailRow(
              "Plan",
              <Text
                className="text-[13px] font-medium text-foreground text-right"
                numberOfLines={2}
              >
                {planName}
              </Text>,
              false,
            )}
            {subscriptionTypeLabel &&
              detailRow(
                "Type",
                <Text className="text-[13px] font-medium text-foreground capitalize">
                  {subscriptionTypeLabel}
                </Text>,
                false,
              )}
            {customerName &&
              detailRow(
                "Customer",
                <Text className="text-[13px] font-medium text-foreground text-right">
                  {customerName}
                </Text>,
                false,
              )}
            {detailRow(
              "Smartcard / No.",
              <Text className="text-[13px] font-semibold text-foreground">
                {billersCode}
              </Text>,
              false,
            )}
            {detailRow(
              "Amount",
              <Text className="text-[13px] font-medium text-foreground">
                {formatNaira(amount)}
              </Text>,
              !balancesReady || !hasCashback,
            )}
            {balancesReady &&
              hasCashback &&
              detailRow(
                `Cashback (${formatNaira(cashbackNum)})`,
                <Switch
                  value={useCashback}
                  onValueChange={onUseCashbackChange}
                />,
                true,
              )}
          </View>

          {balancesReady && cashbackToEarn > 0 && (
            <View
              className="self-start mt-3 rounded-lg px-3 py-1"
              style={{ backgroundColor: colors.orange[100] }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: colors.orange[700] }}
              >
                +₦{cashbackToEarn} Cashback
              </Text>
            </View>
          )}

          {balancesError ? (
            <View className="mt-3 gap-3">
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
            <View className="mt-3 rounded-xl border border-dashed border-border bg-gray-50/50 px-4 py-3 dark:bg-gray-800/30">
              <Text className="text-center text-[13px] font-semibold text-foreground">
                Payment Method
              </Text>
              <Text className="mt-1 text-center text-xs text-muted-foreground">
                Your wallet balance will appear shortly.
              </Text>
            </View>
          ) : (
            <View className="mt-3 gap-2">
              <Text className="text-[13px] font-semibold text-foreground">
                Payment Method
              </Text>
              <View className="flex-row items-center justify-between rounded-xl border border-border bg-gray-50 px-4 py-2.5 dark:bg-gray-800/50">
                <Text className="text-[13px] text-foreground">
                  Balance ({formatNaira(walletBalanceNum)})
                </Text>
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={colors.orange[500]}
                />
              </View>
              <Text className="text-xs text-muted-foreground">
                After purchase: {formatNaira(balanceAfter)}
              </Text>
            </View>
          )}

          {balancesReady && insufficientWallet ? (
            <Text className="mt-3 text-center text-sm text-destructive">
              Insufficient wallet balance for this purchase. Fund your wallet or
              adjust the amount.
            </Text>
          ) : null}
        </ScrollView>

        {/* Pinned purchase button */}
        <Button
          size="lg"
          className="mt-4 w-full flex-row gap-2 rounded-xl"
          style={{ backgroundColor: colors.orange[500] }}
          onPress={onConfirm}
          disabled={payDisabled}
        >
          {purchasing ? (
            <Spinner color="#fff" size="small" />
          ) : (
            <Text className="text-base font-semibold text-white">Purchase</Text>
          )}
        </Button>
      </View>
    </BottomSheetModal>
  );
}
