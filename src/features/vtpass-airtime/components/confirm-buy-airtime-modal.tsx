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
        className="items-center justify-center bg-muted"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
        }}
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
    <View
      className="bg-muted"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
      }}
    >
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
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
  /** Latest balances are loading from GET /banking/user-wallet */
  balancesLoading: boolean;
  balancesError: string | null;
  onRetryBalances?: () => void;
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
  balancesLoading,
  balancesError,
  onRetryBalances,
}: ConfirmBuyAirtimeModalProps) {
  const balancesReady = !balancesLoading && !balancesError;

  const cashbackNum = parseBalanceToNumber(cashbackBalance);
  const hasCashback = balancesReady && cashbackNum > 0;
  const cashbackToApply =
    balancesReady && useCashback && hasCashback
      ? Math.min(cashbackNum, amount)
      : 0;
  const amountToPay = amount - cashbackToApply;
  const walletNum = parseBalanceToNumber(walletBalance);

  const insufficientWallet =
    balancesReady && walletNum + 1e-9 < amountToPay;

  const payDisabled =
    purchasing ||
    balancesLoading ||
    !!balancesError ||
    insufficientWallet;

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

        {/* Provider logo + amount — only after balances are fresh */}
        <View className="min-h-[120px] items-center justify-center px-8 pt-8">
          {balancesLoading ? (
            <>
              <Spinner color={colors.gray[500]} size="small" />
              <Text className="mt-3 text-center text-sm text-muted-foreground">
                Processing...
              </Text>
            </>
          ) : balancesError ? null : (
            <>
              {selectedProvider ? (
                <View className="mb-3">
                  <NetworkLogo serviceID={selectedProvider.serviceID} size={52} />
                </View>
              ) : null}
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

        {/* Purchase summary - key-value pairs like OPay */}
        <View className="gap-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4">
          {/* Product Name — logo is shown above the amount */}
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted-foreground">Product Name</Text>
            <Text
              className="flex-1 text-right text-sm font-medium text-foreground"
              numberOfLines={2}
            >
              {productName}
            </Text>
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

          {/* Use cashback — compact; smaller switch */}
          {balancesReady && hasCashback && (
            <View className="flex-row items-center justify-between gap-3 border-t border-border pt-2.5">
              <View className="min-w-0 flex-1">
                <Text className="text-sm text-foreground">Use cashback</Text>
                <Text className="text-xs text-muted-foreground">
                  {formatNaira(cashbackNum)} available
                  {useCashback && cashbackToApply > 0
                    ? ` · −${formatNaira(cashbackToApply)}`
                    : ""}
                </Text>
              </View>
              <View
                style={{
                  transform: [{ scaleX: 0.78 }, { scaleY: 0.78 }],
                }}
              >
                <Switch
                  value={useCashback}
                  onValueChange={onUseCashbackChange}
                />
              </View>
            </View>
          )}

          {balancesReady && cashbackToEarn > 0 ? (
            <Text className="text-xs text-muted-foreground">
              You&apos;ll earn ~₦{cashbackToEarn} cashback on this purchase.
            </Text>
          ) : null}
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
        ) : null}

        {/* Balance after purchase */}
        {balancesReady ? (
          <View className="flex-row items-center justify-between rounded-xl border border-border bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
            <Text className="text-sm text-muted-foreground">
              Balance after purchase
            </Text>
            <Text className="text-sm font-semibold text-foreground">
              {formatNaira(Math.max(0, walletNum - amountToPay))}
            </Text>
          </View>
        ) : balancesLoading ? (
          <View className="rounded-xl border border-dashed border-border bg-gray-50/50 dark:bg-gray-800/30 px-4 py-6">
            <Text className="text-center text-sm text-muted-foreground">
              Balance after purchase will appear here.
            </Text>
          </View>
        ) : null}

        {balancesReady && insufficientWallet ? (
          <Text className="text-center text-sm text-destructive">
            Insufficient wallet balance for this purchase. Fund your wallet or
            adjust the amount.
          </Text>
        ) : null}

        {/* Pay button - full width green */}
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
