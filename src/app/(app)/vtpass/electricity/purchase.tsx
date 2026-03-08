import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { purchaseElectricity, queryElectricityTransaction } from "@/api";
import {
  ElectricityHeader,
  WalletBalanceCard,
  ConfirmElectricityModal,
  TokenModal,
} from "@/features/vtpass-electricity/components";
import {
  formatNaira,
  getMinPurchaseAmount,
  getDiscoShortName,
  getElectricityCashbackRate,
  computeCashbackToEarn,
  PHONE_REGEX,
  ELECTRICITY_MAX_AMOUNT,
  POLL_FIRST_DELAY_MS,
  POLL_INTERVAL_MS,
  POLL_MAX_ELAPSED_MS,
} from "@/features/vtpass-electricity/lib/constants";
import { useElectricityStore } from "@/features/vtpass-electricity/lib/store";
import { AlertModal } from "@/components/ui/modals/alert-modal";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useHomepageStore } from "@/store";
import { handleApiError } from "@/lib/errors";
import { colors } from "@/constants/colors";

const PLACEHOLDER_LIGHT = "rgba(107, 114, 128, 0.38)";
const PLACEHOLDER_DARK = "rgba(255, 255, 255, 0.15)";

export default function ElectricityPurchaseScreen() {
  const { isDark } = useAppTheme();
  const homepageData = useHomepageStore.use.data();
  const fetchHomepage = useHomepageStore.use.fetchHomepage();
  const walletBalance =
    homepageData?.wallet_card?.current_balance ?? "₦0.00";
  const cashbackBalance =
    homepageData?.cashback_wallet?.current_balance ?? "₦0.00";

  const selectedProvider = useElectricityStore.use.selectedProvider();
  const meterType = useElectricityStore.use.meterType();
  const verifyData = useElectricityStore.use.verifyData();
  const storedBillersCode = useElectricityStore.use.billersCode();
  const resetStore = useElectricityStore.use.reset();

  const [amountStr, setAmountStr] = useState("");
  const [phone, setPhone] = useState("");
  const [useCashback, setUseCashback] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    amount?: string;
    phone?: string;
  }>({});

  const [tokenModal, setTokenModal] = useState<{
    visible: boolean;
    token: string;
    units?: string;
    customerName?: string;
    amount?: number;
  }>({ visible: false, token: "" });

  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    message: string;
  }>({ visible: false, message: "" });

  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    message: string;
  }>({ visible: false, message: "" });

  const [processingModal, setProcessingModal] = useState<{
    visible: boolean;
    requestId: string | null;
    message: string;
  }>({ visible: false, requestId: null, message: "" });

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStartRef = useRef<number>(0);

  useEffect(() => {
    if (!selectedProvider || !verifyData) {
      router.replace("/(app)/vtpass/electricity");
    }
  }, [selectedProvider, verifyData]);

  const minPurchase = getMinPurchaseAmount(verifyData?.Min_Purchase_Amount);
  const amount = parseInt(amountStr.replace(/\D/g, ""), 10) || 0;
  const customerName = verifyData?.Customer_Name ?? "";

  const hasCashback =
    !!cashbackBalance &&
    cashbackBalance !== "₦0.00" &&
    cashbackBalance !== "₦0" &&
    cashbackBalance !== "";

  const { percentage, maxPerTransaction } = getElectricityCashbackRate(
    homepageData?.cashback_rates,
    homepageData?.reward_banners,
  );
  const cashbackToEarn = computeCashbackToEarn(
    amount,
    percentage,
    maxPerTransaction,
  );

  const phoneValid = PHONE_REGEX.test(phone);
  const amountValid = amount >= minPurchase && amount <= ELECTRICITY_MAX_AMOUNT;
  const amountBelowMin = amount > 0 && amount < minPurchase;
  const showAmountError = !!fieldErrors.amount || amountBelowMin;
  const canSubmit =
    !!selectedProvider &&
    !!verifyData &&
    amountValid &&
    phoneValid &&
    !purchasing;

  // ── Polling ──────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    (requestId: string, isFirst: boolean) => {
      queryElectricityTransaction({ request_id: requestId })
        .then((res) => {
          if (!res.success || !res.data) return;
          const status = res.data.content?.transactions?.status ?? "";
          const code = res.data.code ?? "";

          if (status === "delivered" || code === "000") {
            stopPolling();
            setProcessingModal({
              visible: false,
              requestId: null,
              message: "",
            });

            const token = res.data.electricity_token;
            if (token && meterType === "prepaid") {
              setTokenModal({
                visible: true,
                token,
                units: res.data.units,
                amount: res.data.amount,
              });
            } else {
              setSuccessModal({
                visible: true,
                message: "Your electricity bill has been paid!",
              });
            }
            return;
          }

          if (
            code === "016" ||
            code === "040" ||
            status === "reversed" ||
            status === "failed"
          ) {
            stopPolling();
            setProcessingModal({
              visible: false,
              requestId: null,
              message: "",
            });
            setErrorModal({
              visible: true,
              message:
                code === "040"
                  ? "Transaction reversed. Your wallet has been refunded."
                  : "Transaction failed. Your wallet has been refunded.",
            });
            return;
          }

          const elapsed = Date.now() - pollStartRef.current;
          if (elapsed >= POLL_MAX_ELAPSED_MS) {
            stopPolling();
            setProcessingModal({
              visible: true,
              requestId,
              message:
                "Your transaction is still processing. Please check back shortly.",
            });
            return;
          }

          pollTimeoutRef.current = setTimeout(
            () => pollStatus(requestId, false),
            isFirst ? POLL_FIRST_DELAY_MS : POLL_INTERVAL_MS,
          );
        })
        .catch(() => {
          const elapsed = Date.now() - pollStartRef.current;
          if (elapsed >= POLL_MAX_ELAPSED_MS) {
            stopPolling();
            setProcessingModal({
              visible: true,
              requestId,
              message:
                "Your transaction is still processing. Please check back shortly.",
            });
            return;
          }
          pollTimeoutRef.current = setTimeout(
            () => pollStatus(requestId, false),
            POLL_INTERVAL_MS,
          );
        });
    },
    [stopPolling, meterType],
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleRefreshStatus = useCallback(() => {
    const { requestId } = processingModal;
    if (!requestId) return;
    pollStartRef.current = Date.now();
    pollStatus(requestId, true);
  }, [processingModal, pollStatus]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleOpenConfirmModal() {
    if (!canSubmit) return;

    const errors: typeof fieldErrors = {};

    if (!amountValid) {
      if (amount < minPurchase) {
        errors.amount = `Minimum amount is ${formatNaira(minPurchase)}`;
      } else {
        errors.amount = `Maximum amount is ${formatNaira(ELECTRICITY_MAX_AMOUNT)}`;
      }
    }

    if (!phoneValid) {
      errors.phone = "Enter a valid 11-digit phone number";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    if (hasCashback) setUseCashback(true);
    setConfirmModalVisible(true);
  }

  async function handleConfirmPurchase() {
    if (!selectedProvider || !verifyData) return;

    const payload: Parameters<typeof purchaseElectricity>[0] = {
      serviceID: selectedProvider.serviceID,
      billersCode: storedBillersCode,
      variation_code: meterType,
      amount,
      phone: phone.trim(),
      use_cashback: useCashback,
    };

    setPurchasing(true);
    try {
      const res = await purchaseElectricity(payload);

      if (res.success && res.data) {
        setConfirmModalVisible(false);

        const requestId =
          res.data.requestId ??
          (res.data as { request_id?: string }).request_id;
        const status =
          res.data.content?.transactions?.status ?? res.data.status ?? "";
        const code = res.data.code ?? "";
        const isProcessing =
          res.data.status === "processing" ||
          status === "pending" ||
          status === "initiated" ||
          code === "099" ||
          res.data.response_description
            ?.toUpperCase()
            .includes("PROCESSING");

        if (isProcessing && requestId) {
          pollStartRef.current = Date.now();
          setProcessingModal({
            visible: true,
            requestId,
            message:
              "Your payment is being processed. We'll check the status shortly.",
          });
          pollStatus(requestId, true);
        } else if (status === "delivered" || code === "000") {
          const token = res.data.electricity_token;
          if (token && meterType === "prepaid") {
            setTokenModal({
              visible: true,
              token,
              units: res.data.units,
              customerName: res.data.customerName ?? customerName,
              amount: res.data.amount,
            });
          } else {
            setSuccessModal({
              visible: true,
              message: "Your electricity bill has been paid!",
            });
          }
        } else {
          setSuccessModal({
            visible: true,
            message:
              "Your request was received. You'll get a confirmation shortly.",
          });
        }
      } else {
        setErrorModal({
          visible: true,
          message:
            (res as { message?: string }).message ??
            "Purchase failed. Please try again.",
        });
      }
    } catch (e) {
      handleApiError(e);
      setErrorModal({
        visible: true,
        message:
          (e as {
            response?: { data?: { message?: string } };
            message?: string;
          })?.response?.data?.message ??
          (e as Error).message ??
          "Purchase failed.",
      });
    } finally {
      setPurchasing(false);
    }
  }

  function handleTokenClose() {
    setTokenModal({ visible: false, token: "" });
    resetStore();
    fetchHomepage();
    router.replace("/(app)/(tabs)");
  }

  function handleSuccessClose() {
    setSuccessModal({ visible: false, message: "" });
    resetStore();
    fetchHomepage();
    router.replace("/(app)/(tabs)");
  }

  if (!selectedProvider || !verifyData) return null;

  const discoShort = getDiscoShortName(selectedProvider.serviceID);
  const providerLabel =
    selectedProvider.name
      .replace(/\s+Payment\s*$/i, "")
      .replace(/\s*-\s*\w+$/, "")
      .trim() || selectedProvider.name;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ElectricityHeader showMainTitle={false} title="Confirm & Pay" />

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        <WalletBalanceCard
          walletBalance={walletBalance}
          cashbackBalance={cashbackBalance}
          hasCashback={!!hasCashback}
        />

        {/* Order Summary */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(300).springify().damping(15)}
        >
          <Text className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Order summary
          </Text>
          <View className="rounded-2xl border border-border bg-card px-4 py-3 gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">Provider</Text>
              <Text className="text-sm font-semibold text-foreground">
                {discoShort}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">Meter Type</Text>
              <Text className="text-sm font-medium text-foreground capitalize">
                {meterType}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">Meter No.</Text>
              <Text className="text-sm font-semibold text-foreground">
                {storedBillersCode}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">Customer</Text>
              <Text
                className="text-sm font-medium text-foreground text-right flex-1 ml-4"
                numberOfLines={2}
              >
                {customerName}
              </Text>
            </View>
            {verifyData.Address && (
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">Address</Text>
                <Text
                  className="text-sm font-medium text-foreground text-right flex-1 ml-4"
                  numberOfLines={2}
                >
                  {verifyData.Address}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Amount */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(300).springify().damping(15)}
          className="mt-6"
        >
          <Text className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Amount (Min. {formatNaira(minPurchase)})
          </Text>
          <View
            className={`flex-row items-center rounded-2xl border bg-card overflow-hidden ${
              showAmountError ? "border-destructive" : "border-border"
            }`}
          >
            <View className="pl-4 flex-row items-center flex-1 min-w-0 py-1">
              <Text className="text-[15px] text-muted-foreground mr-1">₦</Text>
              <TextInput
                className="flex-1 text-[15px] font-normal text-foreground min-h-[48px] py-3"
                placeholder={`Min ${minPurchase.toLocaleString()}`}
                placeholderTextColor={
                  isDark ? PLACEHOLDER_DARK : PLACEHOLDER_LIGHT
                }
                value={amountStr}
                onChangeText={(t) => {
                  setAmountStr(t.replace(/\D/g, ""));
                  if (fieldErrors.amount)
                    setFieldErrors((e) => ({ ...e, amount: undefined }));
                }}
                onBlur={() => {
                  const parsed = parseInt(amountStr.replace(/\D/g, ""), 10) || 0;
                  if (amountStr.trim() && parsed > 0 && parsed < minPurchase) {
                    setAmountStr(String(minPurchase));
                    setFieldErrors((e) => ({ ...e, amount: undefined }));
                  }
                }}
                keyboardType="number-pad"
              />
            </View>
            {amountStr.length > 0 && (
              <Pressable
                onPress={() => setAmountStr("")}
                hitSlop={8}
                className="p-2 mr-2"
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.gray[400]}
                />
              </Pressable>
            )}
          </View>
          {showAmountError && (
            <Text className="mt-1 text-sm text-destructive">
              {fieldErrors.amount ??
                (amountBelowMin
                  ? `Minimum amount is ${formatNaira(minPurchase)}`
                  : null)}
            </Text>
          )}
        </Animated.View>

        {/* Phone */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(300).springify().damping(15)}
          className="mt-6"
        >
          <Text className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Phone number
          </Text>
          <View className="flex-row items-center rounded-2xl border border-border bg-card overflow-hidden">
            <View className="pl-4 flex-row items-center flex-1 min-w-0 py-1">
              <TextInput
                className="flex-1 text-[15px] font-normal text-foreground min-h-[48px] py-3"
                placeholder="08012345678"
                placeholderTextColor={
                  isDark ? PLACEHOLDER_DARK : PLACEHOLDER_LIGHT
                }
                value={phone}
                onChangeText={(t) => {
                  setPhone(t.replace(/\D/g, "").slice(0, 11));
                  if (fieldErrors.phone)
                    setFieldErrors((e) => ({ ...e, phone: undefined }));
                }}
                keyboardType="phone-pad"
                maxLength={11}
              />
            </View>
            {phone.length > 0 && (
              <Pressable
                onPress={() => setPhone("")}
                hitSlop={8}
                className="p-2 mr-2"
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.gray[400]}
                />
              </Pressable>
            )}
          </View>
          {fieldErrors.phone && (
            <Text className="mt-1 text-sm text-destructive">
              {fieldErrors.phone}
            </Text>
          )}
        </Animated.View>

        {cashbackToEarn > 0 && (
          <Text className="mt-5 text-sm text-muted-foreground">
            {`You'll earn ₦${cashbackToEarn} cashback on this purchase`}
          </Text>
        )}

        <Button
          size="lg"
          className="mt-8 w-full rounded-xl"
          onPress={handleOpenConfirmModal}
          disabled={!canSubmit}
        >
          <Text className="text-base font-semibold text-white">
            {amount > 0 ? `Pay ${formatNaira(amount)}` : "Continue"}
          </Text>
        </Button>
      </ScrollView>

      {/* Confirm bottom sheet */}
      <ConfirmElectricityModal
        visible={confirmModalVisible}
        onClose={() => setConfirmModalVisible(false)}
        providerName={providerLabel}
        serviceID={selectedProvider.serviceID}
        meterType={meterType}
        meterNumber={storedBillersCode}
        customerName={customerName}
        amount={amount}
        cashbackBalance={cashbackBalance}
        cashbackToEarn={cashbackToEarn}
        useCashback={useCashback}
        onUseCashbackChange={setUseCashback}
        onConfirm={handleConfirmPurchase}
        purchasing={purchasing}
        walletBalance={walletBalance}
      />

      {/* Prepaid token display */}
      <TokenModal
        visible={tokenModal.visible}
        token={tokenModal.token}
        units={tokenModal.units}
        customerName={tokenModal.customerName}
        amount={tokenModal.amount}
        onClose={handleTokenClose}
      />

      {/* Postpaid success */}
      <AlertModal
        visible={successModal.visible}
        variant="success"
        title="Payment Successful"
        message={successModal.message}
        primaryAction={{ label: "Done", onPress: handleSuccessClose }}
        onClose={handleSuccessClose}
      />

      {/* Error */}
      <AlertModal
        visible={errorModal.visible}
        variant="error"
        title="Error"
        message={errorModal.message}
        primaryAction={{
          label: "OK",
          onPress: () => setErrorModal({ visible: false, message: "" }),
        }}
        onClose={() => setErrorModal({ visible: false, message: "" })}
      />

      {/* Processing / polling */}
      {processingModal.visible && processingModal.requestId && (
        <AlertModal
          visible
          variant="info"
          title="Processing"
          message={
            processingModal.message +
            " You can tap Refresh to check status again."
          }
          primaryAction={{
            label: "Refresh status",
            onPress: handleRefreshStatus,
          }}
          secondaryAction={{
            label: "Close",
            onPress: () => {
              stopPolling();
              setProcessingModal({
                visible: false,
                requestId: null,
                message: "",
              });
              fetchHomepage();
              router.replace("/(app)/vtpass/electricity");
            },
          }}
          onClose={() => {
            stopPolling();
            setProcessingModal({
              visible: false,
              requestId: null,
              message: "",
            });
            fetchHomepage();
            router.replace("/(app)/vtpass/electricity");
          }}
        />
      )}
    </SafeAreaView>
  );
}
