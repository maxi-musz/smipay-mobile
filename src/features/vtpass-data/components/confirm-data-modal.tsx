import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Switch } from "@/components/ui/switch";
import { BottomSheetModal } from "@/components/ui/modals";
import { Spinner } from "@/components/ui/loaders";
import { colors } from "@/constants/colors";
import { getNetworkProviderLogo } from "@/lib/network-provider-logo";
import { formatNaira, parseBalanceToNumber } from "../lib/constants";
import type { DataServiceItem, DataVariation } from "@/types/vtpass-data";

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

interface ConfirmDataModalProps {
  visible: boolean;
  onClose: () => void;
  provider: DataServiceItem | null;
  variation: DataVariation | null;
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

export function ConfirmDataModal({
  visible,
  onClose,
  provider,
  variation,
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
}: ConfirmDataModalProps) {
  const balancesReady = !balancesLoading && !balancesError;
  const cashbackNum = parseBalanceToNumber(cashbackBalance);
  const hasCashback = balancesReady && cashbackNum > 0;
  const cashbackToApply =
    balancesReady && useCashback && hasCashback
      ? Math.min(cashbackNum, amount)
      : 0;
  const amountToPay = amount - cashbackToApply;

  const networkLabel =
    provider?.name?.replace(/\s*data\s*/i, "").trim() || provider?.serviceID || "";
  const productNameLabel = networkLabel ? `${networkLabel} Data` : "Data";
  const planName = variation?.name || "Data plan";
  const walletBalanceNum = parseBalanceToNumber(walletBalance);
  const balanceAfter = Math.max(0, walletBalanceNum - amountToPay);
  const insufficientWallet =
    balancesReady && walletBalanceNum + 1e-9 < amountToPay;
  const payDisabled =
    purchasing || balancesLoading || !!balancesError || insufficientWallet;

  const detailRow = (
    label: string,
    value: React.ReactNode,
    last = false,
  ) => (
    <View
      className={`flex-row items-center justify-between py-3 ${last ? "" : "border-b border-border"}`}
    >
      <Text className="text-sm text-muted-foreground shrink-0">{label}</Text>
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

        {/* Transaction details - two-column rows with dividers */}
        <View className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 px-4">
          {detailRow(
            "Product Name",
            <>
              {provider && (
                <NetworkLogo serviceID={provider.serviceID} size={24} />
              )}
              <Text className="text-sm font-medium text-foreground text-right">
                {productNameLabel}
              </Text>
            </>,
            false,
          )}
          {detailRow(
            "Data Plan",
            <Text
              className="text-sm font-medium text-foreground text-right"
              numberOfLines={2}
            >
              {planName}
            </Text>,
            false,
          )}
          {detailRow(
            "Recipient Mobile",
            <Text className="text-sm font-semibold text-foreground">
              {phone}
            </Text>,
            false,
          )}
          {detailRow(
            "Amount",
            <Text className="text-sm font-medium text-foreground">
              {formatNaira(amount)}
            </Text>,
            !balancesReady || !hasCashback,
          )}
          {balancesReady &&
            hasCashback &&
            detailRow(
              `Use Cashback (${formatNaira(cashbackNum)})`,
              <>
                <Text
                  className="text-sm font-medium text-foreground"
                  style={{ textDecorationLine: "line-through" }}
                >
                  {formatNaira(cashbackNum)}
                </Text>
                <Switch
                  value={useCashback}
                  onValueChange={onUseCashbackChange}
                />
              </>,
              true,
            )}
        </View>

        {balancesReady && cashbackToEarn > 0 && (
          <View
            className="self-start rounded-lg px-3 py-1.5"
            style={{ backgroundColor: colors.orange[100] }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: colors.orange[700] }}
            >
              +₦{cashbackToEarn} Cashback
            </Text>
          </View>
        )}

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
            <Text className="text-center text-sm font-semibold text-foreground">
              Payment Method
            </Text>
            <Text className="mt-2 text-center text-xs text-muted-foreground">
              Your wallet balance will appear shortly.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">
              Payment Method
            </Text>
            <View className="flex-row items-center justify-between rounded-xl border border-border bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
              <Text className="text-sm text-foreground">
                Available Balance ({formatNaira(walletBalanceNum)})
              </Text>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={colors.orange[500]}
              />
            </View>
            <Text className="text-xs text-muted-foreground">
              After purchase: {formatNaira(balanceAfter)}
            </Text>
          </View>
        )}

        {balancesReady && insufficientWallet ? (
          <Text className="text-center text-sm text-destructive">
            Insufficient wallet balance for this purchase. Fund your wallet or
            adjust the amount.
          </Text>
        ) : null}

        {/* Purchase button - orange primary */}
        <Button
          size="lg"
          className="w-full flex-row gap-2 rounded-xl"
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
