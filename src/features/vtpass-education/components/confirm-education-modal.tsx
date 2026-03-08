import { Image, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Switch } from "@/components/ui/switch";
import { BottomSheetModal } from "@/components/ui/modals";
import { Spinner } from "@/components/ui/loaders";
import { colors } from "@/constants/colors";
import { formatNaira, parseBalanceToNumber } from "../lib/constants";
import { getEducationLogo } from "../lib/education-logos";
import { useAppTheme } from "@/hooks/use-app-theme";

interface ConfirmEducationModalProps {
  visible: boolean;
  onClose: () => void;
  productLabel: string;
  serviceID: string;
  planName: string;
  phone: string;
  amount: number;
  quantity: number;
  customerName?: string;
  profileId?: string;
  cashbackBalance: string;
  cashbackToEarn: number;
  useCashback: boolean;
  onUseCashbackChange: (value: boolean) => void;
  onConfirm: () => void;
  purchasing: boolean;
  walletBalance: string;
}

export function ConfirmEducationModal({
  visible,
  onClose,
  productLabel,
  serviceID,
  planName,
  phone,
  amount,
  quantity,
  customerName,
  profileId,
  cashbackBalance,
  cashbackToEarn,
  useCashback,
  onUseCashbackChange,
  onConfirm,
  purchasing,
  walletBalance,
}: ConfirmEducationModalProps) {
  const { isDark } = useAppTheme();
  const cashbackNum = parseBalanceToNumber(cashbackBalance);
  const hasCashback = cashbackNum > 0;
  const cashbackToApply =
    useCashback && hasCashback ? Math.min(cashbackNum, amount) : 0;
  const amountToPay = amount - cashbackToApply;
  const walletBalanceNum = parseBalanceToNumber(walletBalance);
  const balanceAfter = Math.max(0, walletBalanceNum - amountToPay);
  const logo = getEducationLogo(serviceID);

  const detailRow = (label: string, value: React.ReactNode, last = false) => (
    <View
      className={`flex-row items-center justify-between py-2.5 ${last ? "" : "border-b border-border"}`}
    >
      <Text className="text-[13px] text-muted-foreground shrink-0">
        {label}
      </Text>
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
          <View className="items-center pt-6 pb-3">
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
          </View>

          <View className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 px-4">
            {detailRow(
              "Product",
              <>
                {logo ? (
                  <Image
                    source={logo}
                    style={{ width: 22, height: 22, borderRadius: 4 }}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons name="school" size={16} color={colors.gray[500]} />
                )}
                <Text className="text-[13px] font-medium text-foreground text-right">
                  {productLabel}
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
            {quantity > 1 &&
              detailRow(
                "Quantity",
                <Text className="text-[13px] font-medium text-foreground">
                  {quantity}
                </Text>,
                false,
              )}
            {customerName &&
              detailRow(
                "Student",
                <Text className="text-[13px] font-medium text-foreground text-right">
                  {customerName}
                </Text>,
                false,
              )}
            {profileId &&
              detailRow(
                "Profile ID",
                <Text className="text-[13px] font-semibold text-foreground">
                  {profileId}
                </Text>,
                false,
              )}
            {detailRow(
              "Phone",
              <Text className="text-[13px] font-medium text-foreground">
                {phone}
              </Text>,
              false,
            )}
            {detailRow(
              "Amount",
              <Text className="text-[13px] font-medium text-foreground">
                {formatNaira(amount)}
              </Text>,
              !hasCashback,
            )}
            {hasCashback &&
              detailRow(
                `Cashback (${formatNaira(cashbackNum)})`,
                <Switch
                  value={useCashback}
                  onValueChange={onUseCashbackChange}
                />,
                true,
              )}
          </View>

          {cashbackToEarn > 0 && (
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

          <View className="mt-3 gap-2">
            <Text className="text-[13px] font-semibold text-foreground">
              Payment Method
            </Text>
            <View className="flex-row items-center justify-between rounded-xl border border-border bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5">
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
        </ScrollView>

        <Button
          size="lg"
          className="mt-4 w-full flex-row gap-2 rounded-xl"
          style={{ backgroundColor: colors.orange[500] }}
          onPress={onConfirm}
          disabled={purchasing}
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
