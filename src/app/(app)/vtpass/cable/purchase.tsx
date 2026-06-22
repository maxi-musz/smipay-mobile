import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { purchaseCable, queryCableTransaction } from "@/api";
import {
  CableHeader,
  WalletBalanceCard,
  ConfirmCableModal,
  VoucherModal,
} from "@/features/vtpass-cable/components";
import {
  formatNaira,
  parseBalanceToNumber,
  getProviderTraits,
  isEwalletVariation,
  getCableCashbackRate,
  computeCashbackToEarn,
  PHONE_REGEX,
  POLL_FIRST_DELAY_MS,
  POLL_INTERVAL_MS,
  POLL_MAX_ELAPSED_MS,
} from "@/features/vtpass-cable/lib/constants";
import { useCableStore } from "@/features/vtpass-cable/lib/store";
import {
  PaymentAuthorizationModal,
  useAuthorizePurchase,
  useConfirmWalletSnapshot,
} from "@/features/payment-authorization";
import { AlertModal } from "@/components/ui/modals/alert-modal";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useHomepageStore } from "@/store";
import { logPurchaseSuccess } from "@/lib/analytics";
import { handleApiError } from "@/lib/errors";
import { colors } from "@/constants/colors";
import { isDstvGotvContent } from "@/types/vtpass-cable";

const PLACEHOLDER_LIGHT = "rgba(107, 114, 128, 0.38)";
const PLACEHOLDER_DARK = "rgba(255, 255, 255, 0.15)";

export default function CablePurchaseScreen() {
  const { isDark } = useAppTheme();
  const homepageData = useHomepageStore.use.data();
  const fetchHomepage = useHomepageStore.use.fetchHomepage();
  const walletBalance =
    homepageData?.wallet_card?.current_balance ?? "₦0.00";
  const cashbackBalance =
    homepageData?.cashback_wallet?.current_balance ?? "₦0.00";

  const selectedProvider = useCableStore.use.selectedProvider();
  const selectedVariation = useCableStore.use.selectedVariation();
  const verifyData = useCableStore.use.verifyData();
  const storedBillersCode = useCableStore.use.billersCode();
  const subscriptionType = useCableStore.use.subscriptionType();
  const resetStore = useCableStore.use.reset();

  const {
    runAuthorizedPurchase,
    isStepUpBusy,
    paymentAuthorizationModalProps,
  } = useAuthorizePurchase({
    biometricPromptMessage: "Authenticate to confirm cable subscription",
  });

  const {
    snapshot: confirmSnapshot,
    loading: confirmWalletLoading,
    error: confirmWalletError,
    refresh: refreshConfirmBalances,
    reset: resetConfirmWallet,
  } = useConfirmWalletSnapshot();

  const [billersCode, setBillersCode] = useState("");
  const [phone, setPhone] = useState("");
  const [customAmountStr, setCustomAmountStr] = useState("");
  const [useCashback, setUseCashback] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    billersCode?: string;
    phone?: string;
    amount?: string;
  }>({});

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
  const [voucherModal, setVoucherModal] = useState<{
    visible: boolean;
    code: string;
  }>({ visible: false, code: "" });

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStartRef = useRef<number>(0);

  const traits = selectedProvider
    ? getProviderTraits(selectedProvider.serviceID)
    : null;

  useEffect(() => {
    if (!selectedProvider || !selectedVariation) {
      router.replace("/(app)/vtpass/cable");
    }
  }, [selectedProvider, selectedVariation]);

  const isRenew = subscriptionType === "renew";
  const isChange = subscriptionType === "change";
  const isEwallet =
    selectedVariation && isEwalletVariation(selectedVariation.variation_code);

  const variationAmount = selectedVariation?.variation_amount
    ? parseFloat(String(selectedVariation.variation_amount))
    : 0;

  const apiRenewalAmount =
    isRenew && verifyData && isDstvGotvContent(verifyData)
      ? parseFloat(verifyData.Renewal_Amount ?? "0")
      : 0;

  const renewalAmount = apiRenewalAmount > 0 ? apiRenewalAmount : variationAmount;

  const customAmount = parseInt(customAmountStr.replace(/\D/g, ""), 10) || 0;

  const amount = isRenew
    ? renewalAmount
    : isEwallet
      ? customAmount
      : variationAmount;

  const customerName =
    verifyData?.Customer_Name ?? undefined;

  const hasCashback =
    !!cashbackBalance &&
    cashbackBalance !== "₦0.00" &&
    cashbackBalance !== "₦0" &&
    cashbackBalance !== "";

  const { percentage, maxPerTransaction } = getCableCashbackRate(
    homepageData?.cashback_rates,
    homepageData?.reward_banners,
  );
  const cashbackToEarn = computeCashbackToEarn(
    amount,
    percentage,
    maxPerTransaction,
  );

  const billersCodeFromSmartcard =
    traits && !traits.billersCodeIsPhone && verifyData
      ? true
      : false;

  const needsBillersCode = traits?.billersCodeIsPhone && !billersCode;

  const billersCodeValid = traits?.billersCodeIsPhone
    ? billersCode.replace(/\D/g, "").length === 11
    : billersCodeFromSmartcard || billersCode.trim().length >= 7;

  const maxPayable =
    parseBalanceToNumber(walletBalance) + parseBalanceToNumber(cashbackBalance);
  const insufficientBalance = amount > 0 && amount > maxPayable;
  const canSubmit =
    !!selectedProvider &&
    !!selectedVariation &&
    amount > 0 &&
    !insufficientBalance &&
    billersCodeValid &&
    !purchasing;

  useLayoutEffect(() => {
    if (!confirmModalVisible) return;
    // Auto-apply cashback only when the wallet alone can't cover the amount
    // but wallet + cashback can. Otherwise leave cashback untouched.
    const walletNum = parseBalanceToNumber(walletBalance);
    const cashbackNum = parseBalanceToNumber(cashbackBalance);
    setUseCashback(
      walletNum + 1e-9 < amount && walletNum + cashbackNum + 1e-9 >= amount,
    );
  }, [confirmModalVisible, amount, walletBalance, cashbackBalance]);

  function closeConfirmModal() {
    setConfirmModalVisible(false);
    setUseCashback(false);
    resetConfirmWallet();
  }

  // ── Polling ──────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    (requestId: string, isFirst: boolean) => {
      queryCableTransaction({ request_id: requestId })
        .then((res) => {
          if (!res.success || !res.data) return;
          const status = res.data.content?.transactions?.status ?? "";
          const code = res.data.code ?? "";
          if (status === "delivered" || code === "000") {
            stopPolling();
            setProcessingModal({ visible: false, requestId: null, message: "" });
            void logPurchaseSuccess("cable", amount, selectedProvider?.name);
            setSuccessModal({
              visible: true,
              message: "Your cable subscription has been activated!",
            });
            return;
          }
          if (
            code === "016" ||
            code === "040" ||
            status === "reversed" ||
            status === "failed"
          ) {
            stopPolling();
            setProcessingModal({ visible: false, requestId: null, message: "" });
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
    [stopPolling],
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

    if (traits?.billersCodeIsPhone && !PHONE_REGEX.test(billersCode)) {
      setFieldErrors((e) => ({
        ...e,
        billersCode: "Enter a valid 11-digit phone number",
      }));
      return;
    }
    if (isEwallet && customAmount <= 0) {
      setFieldErrors((e) => ({ ...e, amount: "Enter a valid amount" }));
      return;
    }

    setFieldErrors({});
    setConfirmModalVisible(true);
    void refreshConfirmBalances();
  }

  async function handleConfirmPurchase() {
    if (!selectedProvider || !selectedVariation) return;

    const finalBillersCode = traits?.billersCodeIsPhone
      ? billersCode.trim()
      : storedBillersCode || billersCode.trim() || (verifyData as { Smartcard_Number?: string })?.Smartcard_Number || "";

    const phoneFormatted = phone.trim() || undefined;

    const payload: Parameters<typeof purchaseCable>[0] = {
      serviceID: selectedProvider.serviceID,
      billersCode: finalBillersCode,
      use_cashback: useCashback,
    };

    if (phoneFormatted) payload.phone = phoneFormatted;

    if (traits?.requiresSubscriptionType && subscriptionType) {
      payload.subscription_type = subscriptionType;
      if (subscriptionType === "renew") {
        payload.amount = renewalAmount;
      } else {
        payload.variation_code = selectedVariation.variation_code;
      }
    } else {
      payload.variation_code = selectedVariation.variation_code;
      if (isEwallet) {
        payload.amount = customAmount;
      }
    }

    await runAuthorizedPurchase(async () => {
      setPurchasing(true);
      try {
        const res = await purchaseCable(payload);

        if (res.success && res.data) {
          closeConfirmModal();

          const voucherCode =
            res.data.voucher_code ??
            res.data.purchased_code ??
            res.data.Voucher?.[0] ??
            res.data.voucher_codes?.[0];

          if (voucherCode) {
            void logPurchaseSuccess("cable", amount, selectedProvider?.name);
            setVoucherModal({ visible: true, code: voucherCode });
            return;
          }

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
            res.data.response_description?.toUpperCase().includes("PROCESSING");

          if (isProcessing && requestId) {
            pollStartRef.current = Date.now();
            setProcessingModal({
              visible: true,
              requestId,
              message:
                "Your subscription is being processed. We'll check the status shortly.",
            });
            pollStatus(requestId, true);
          } else if (status === "delivered" || code === "000") {
            void logPurchaseSuccess("cable", amount, selectedProvider?.name);
            setSuccessModal({
              visible: true,
              message: `Your ${selectedProvider.name.replace(" Subscription", "")} subscription has been activated!`,
            });
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
    });
  }

  function handleSuccessClose() {
    setSuccessModal({ visible: false, message: "" });
    resetStore();
    fetchHomepage();
    router.replace("/(app)/(tabs)");
  }

  function handleVoucherClose() {
    setVoucherModal({ visible: false, code: "" });
    resetStore();
    fetchHomepage();
    router.replace("/(app)/(tabs)");
  }

  if (!selectedProvider || !selectedVariation) return null;

  const providerLabel =
    selectedProvider.name.replace(/\s+Subscription\s*$/i, "").trim() ||
    selectedProvider.name;
  const planName = isRenew
    ? `Renew: ${(verifyData && isDstvGotvContent(verifyData) ? verifyData.Current_Bouquet : "") || selectedVariation.name}`
    : selectedVariation.name;
  const subscriptionTypeLabel = isRenew
    ? "Renewal"
    : isChange
      ? "Bouquet change"
      : undefined;

  const displayBillersCode = traits?.billersCodeIsPhone
    ? billersCode
    : storedBillersCode ||
      billersCode ||
      (verifyData as { Smartcard_Number?: string })?.Smartcard_Number ||
      (verifyData as { Customer_Number?: string })?.Customer_Number ||
      "";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <CableHeader showMainTitle={false} title="Confirm & Pay" />

      <KeyboardAwareScrollView
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

        {/* Plan Summary */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
        >
          <Text className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Order summary
          </Text>
          <View className="rounded-2xl border border-border bg-card px-4 py-3 gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">Provider</Text>
              <Text className="text-sm font-semibold text-foreground">
                {providerLabel}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">Plan</Text>
              <Text
                className="text-sm font-medium text-foreground text-right flex-1 ml-4"
                numberOfLines={2}
              >
                {planName}
              </Text>
            </View>
            {subscriptionTypeLabel && (
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">Type</Text>
                <Text className="text-sm font-medium text-foreground">
                  {subscriptionTypeLabel}
                </Text>
              </View>
            )}
            {customerName && (
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">Customer</Text>
                <Text className="text-sm font-medium text-foreground">
                  {customerName}
                </Text>
              </View>
            )}
            {!isEwallet && amount > 0 && (
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">Amount</Text>
                <Text
                  className="text-base font-bold"
                  style={{ color: colors.orange[600] }}
                >
                  {formatNaira(amount)}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Billers Code for Showmax (phone entry) */}
        {traits?.billersCodeIsPhone && (
          <Animated.View
            entering={FadeInDown.delay(100).duration(300)}
            className="mt-6"
          >
            <Text className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Phone Number (for activation)
            </Text>
            <View className="flex-row items-center rounded-2xl border border-border bg-card overflow-hidden">
              <View className="pl-4 flex-row items-center flex-1 min-w-0 py-1">
                <TextInput
                  className="flex-1 text-[15px] font-normal text-foreground min-h-[48px] py-3"
                  placeholder="08012345678"
                  placeholderTextColor={isDark ? PLACEHOLDER_DARK : PLACEHOLDER_LIGHT}
                  value={billersCode}
                  onChangeText={(t) => {
                    setBillersCode(t.replace(/\D/g, "").slice(0, 11));
                    if (fieldErrors.billersCode)
                      setFieldErrors((e) => ({ ...e, billersCode: undefined }));
                  }}
                  keyboardType="phone-pad"
                  maxLength={11}
                />
              </View>
              {billersCode.length > 0 && (
                <Pressable
                  onPress={() => setBillersCode("")}
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
            {fieldErrors.billersCode && (
              <Text className="mt-1 text-sm text-destructive">
                {fieldErrors.billersCode}
              </Text>
            )}
          </Animated.View>
        )}

        {/* Custom amount for Startimes eWallet */}
        {isEwallet && (
          <Animated.View
            entering={FadeInDown.delay(100).duration(300)}
            className="mt-6"
          >
            <Text className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Amount (₦)
            </Text>
            <View className="flex-row items-center rounded-2xl border border-border bg-card overflow-hidden">
              <View className="pl-4 flex-row items-center flex-1 min-w-0 py-1">
                <Text className="text-[15px] text-muted-foreground mr-1">
                  ₦
                </Text>
                <TextInput
                  className="flex-1 text-[15px] font-normal text-foreground min-h-[48px] py-3"
                  placeholder="Enter amount"
                  placeholderTextColor={isDark ? PLACEHOLDER_DARK : PLACEHOLDER_LIGHT}
                  value={customAmountStr}
                  onChangeText={(t) => {
                    setCustomAmountStr(t.replace(/\D/g, ""));
                    if (fieldErrors.amount)
                      setFieldErrors((e) => ({ ...e, amount: undefined }));
                  }}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            {fieldErrors.amount && (
              <Text className="mt-1 text-sm text-destructive">
                {fieldErrors.amount}
              </Text>
            )}
          </Animated.View>
        )}

        {/* Optional phone for notifications */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(300)}
          className="mt-6"
        >
          <Text className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Phone for notifications (optional)
          </Text>
          <View className="flex-row items-center rounded-2xl border border-border bg-card overflow-hidden">
            <View className="pl-4 flex-row items-center flex-1 min-w-0 py-1">
              <TextInput
                className="flex-1 text-[15px] font-normal text-foreground min-h-[48px] py-3"
                placeholder="08012345678"
                placeholderTextColor={isDark ? PLACEHOLDER_DARK : PLACEHOLDER_LIGHT}
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 11))}
                keyboardType="phone-pad"
                maxLength={11}
              />
            </View>
          </View>
        </Animated.View>

        {cashbackToEarn > 0 && (
          <Text className="mt-5 text-sm text-muted-foreground">
            {`You'll earn ₦${cashbackToEarn} cashback on this purchase`}
          </Text>
        )}

        {insufficientBalance && (
          <Text className="mt-5 text-sm text-destructive">
            Insufficient balance. Fund your wallet or reduce the amount.
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
      </KeyboardAwareScrollView>

      {/* Confirm bottom sheet */}
      <ConfirmCableModal
        visible={
          confirmModalVisible && !paymentAuthorizationModalProps.visible
        }
        onClose={closeConfirmModal}
        providerName={providerLabel}
        serviceID={selectedProvider.serviceID}
        planName={planName}
        billersCode={displayBillersCode}
        amount={amount}
        subscriptionTypeLabel={subscriptionTypeLabel}
        customerName={customerName}
        cashbackBalance={confirmSnapshot?.cashback ?? "₦0.00"}
        cashbackToEarn={cashbackToEarn}
        useCashback={useCashback}
        onUseCashbackChange={setUseCashback}
        onConfirm={handleConfirmPurchase}
        purchasing={purchasing || isStepUpBusy}
        walletBalance={confirmSnapshot?.wallet ?? "₦0.00"}
        balancesLoading={confirmWalletLoading}
        balancesError={confirmWalletError}
        onRetryBalances={refreshConfirmBalances}
      />

      <PaymentAuthorizationModal
        {...paymentAuthorizationModalProps}
        onForgotPinPress={() => {
          paymentAuthorizationModalProps.onClose();
          closeConfirmModal();
          router.push("/(app)/profile/security");
        }}
      />

      {/* Showmax voucher */}
      <VoucherModal
        visible={voucherModal.visible}
        voucherCode={voucherModal.code}
        onClose={handleVoucherClose}
      />

      {/* Success */}
      <AlertModal
        visible={successModal.visible}
        variant="success"
        title="Subscription Activated"
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
          label: "Retry",
          onPress: () => {
            setErrorModal({ visible: false, message: "" });
            void handleConfirmPurchase();
          },
        }}
        secondaryAction={{
          label: "Cancel",
          onPress: () => {
            setErrorModal({ visible: false, message: "" });
            closeConfirmModal();
            router.replace("/(app)/(tabs)");
          },
        }}
        closeable={false}
        onClose={() => {}}
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
              router.replace("/(app)/vtpass/cable");
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
            router.replace("/(app)/vtpass/cable");
          }}
        />
      )}
    </SafeAreaView>
  );
}
