import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import {
  purchaseIntlAirtime,
  queryIntlAirtime,
} from "@/api";
import {
  IntlAirtimeHeader,
  WalletBalanceCard,
  AmountAndPhoneSection,
  ConfirmIntlAirtimeModal,
} from "@/features/vtpass-intl-airtime/components";
import {
  formatNaira,
  parseBalanceToNumber,
  getIntlAirtimeCashbackRate,
  computeCashbackToEarn,
  POLL_FIRST_DELAY_MS,
  POLL_INTERVAL_MS,
  POLL_MAX_ELAPSED_MS,
} from "@/features/vtpass-intl-airtime/lib/constants";
import { useIntlAirtimeStore } from "@/features/vtpass-intl-airtime/lib/store";
import {
  PaymentAuthorizationModal,
  useAuthorizePurchase,
  useConfirmWalletSnapshot,
} from "@/features/payment-authorization";
import { FullPageLoader } from "@/components/ui/loaders";
import { AlertModal } from "@/components/ui/modals/alert-modal";
import { useHomepageStore } from "@/store";
import { handleApiError } from "@/lib/errors";

export default function IntlAirtimeAmountScreen() {
  const homepageData = useHomepageStore.use.data();
  const fetchHomepage = useHomepageStore.use.fetchHomepage();
  const walletBalance =
    homepageData?.wallet_card?.current_balance ?? "₦0.00";
  const cashbackBalance =
    homepageData?.cashback_wallet?.current_balance ?? "₦0.00";

  const selectedCountry = useIntlAirtimeStore.use.selectedCountry();
  const selectedProductType = useIntlAirtimeStore.use.selectedProductType();
  const selectedOperator = useIntlAirtimeStore.use.selectedOperator();
  const selectedVariation = useIntlAirtimeStore.use.selectedVariation();
  const resetStore = useIntlAirtimeStore.use.reset();

  const {
    runAuthorizedPurchase,
    isStepUpBusy,
    paymentAuthorizationModalProps,
  } = useAuthorizePurchase({
    biometricPromptMessage: "Authenticate to confirm international airtime purchase",
  });

  const {
    snapshot: confirmSnapshot,
    loading: confirmWalletLoading,
    error: confirmWalletError,
    refresh: refreshConfirmBalances,
    reset: resetConfirmWallet,
  } = useConfirmWalletSnapshot();

  const [amountStr, setAmountStr] = useState("");
  const [billersCode, setBillersCode] = useState("");
  const [phone, setPhone] = useState("");
  const [useCashback, setUseCashback] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    amount?: string;
    billersCode?: string;
    phone?: string;
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

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStartRef = useRef<number>(0);

  useEffect(() => {
    if (!selectedCountry || !selectedProductType || !selectedOperator || !selectedVariation) {
      router.replace("/(app)/vtpass/intl-airtime");
    }
  }, [selectedCountry, selectedProductType, selectedOperator, selectedVariation]);

  const stopPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    (requestId: string, isFirst: boolean) => {
      queryIntlAirtime({ request_id: requestId })
        .then((res) => {
          if (!res.success || !res.data) return;
          const status = res.data.content?.transactions?.status ?? "";
          const code = res.data.code ?? "";
          if (status === "delivered" || code === "000") {
            stopPolling();
            setProcessingModal({ visible: false, requestId: null, message: "" });
            setSuccessModal({
              visible: true,
              message: "Your international airtime purchase was successful.",
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
                  ? "Transaction reversed."
                  : "Transaction failed. You have been refunded.",
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
  }, [processingModal.requestId, pollStatus]);

  const amount = parseInt(amountStr.replace(/\D/g, ""), 10) || 0;
  const billersCodeTrimmed = billersCode.replace(/\s/g, "").replace(/\D/g, "");
  const billersCodeValid = billersCodeTrimmed.length >= 10;
  const phoneTrimmed = phone.replace(/\s/g, "").replace(/\D/g, "");
  const phoneValid =
    phoneTrimmed.length >= 10 &&
    (phoneTrimmed.startsWith("0") ||
      phoneTrimmed.startsWith("234") ||
      phoneTrimmed.length >= 11);
  const amountValid = amount > 0;
  const maxPayable =
    parseBalanceToNumber(walletBalance) + parseBalanceToNumber(cashbackBalance);
  const insufficientBalance = amount > 0 && amount > maxPayable;
  const canSubmit =
    !!selectedCountry &&
    !!selectedProductType &&
    !!selectedOperator &&
    !!selectedVariation &&
    amountValid &&
    !insufficientBalance &&
    billersCodeValid &&
    phoneValid &&
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

  const hasCashback =
    cashbackBalance &&
    cashbackBalance !== "₦0.00" &&
    cashbackBalance !== "₦0" &&
    cashbackBalance !== "";

  const { percentage, maxPerTransaction } = getIntlAirtimeCashbackRate(
    homepageData?.cashback_rates,
    homepageData?.reward_banners,
  );
  const cashbackToEarn = computeCashbackToEarn(
    amount,
    percentage,
    maxPerTransaction,
  );

  function handleOpenConfirmModal() {
    if (!canSubmit) return;
    if (amount <= 0) {
      setFieldErrors((e) => ({ ...e, amount: "Enter a valid amount (₦)" }));
      return;
    }
    if (!billersCodeValid) {
      setFieldErrors((e) => ({
        ...e,
        billersCode: "Enter a valid destination number",
      }));
      return;
    }
    if (!phoneValid) {
      setFieldErrors((e) => ({
        ...e,
        phone: "Enter a valid phone number for notifications",
      }));
      return;
    }
    setFieldErrors({});
    setConfirmModalVisible(true);
    void refreshConfirmBalances();
  }

  async function handleConfirmPurchase() {
    if (
      !selectedCountry ||
      !selectedProductType ||
      !selectedOperator ||
      !selectedVariation
    )
      return;

    const phoneFormatted = phoneTrimmed.startsWith("234")
      ? "0" + phoneTrimmed.slice(3).slice(-10)
      : phoneTrimmed.startsWith("0") && phoneTrimmed.length === 11
        ? phoneTrimmed
        : phoneTrimmed.length === 10 && /^[789]/.test(phoneTrimmed)
          ? "0" + phoneTrimmed
          : phoneTrimmed.length >= 10
            ? "0" + phoneTrimmed.slice(-10)
            : phoneTrimmed;

    const billersCodeFormatted = billersCodeTrimmed.startsWith(
      selectedCountry.prefix,
    )
      ? billersCodeTrimmed
      : selectedCountry.prefix + billersCodeTrimmed.replace(/^0+/, "");

    await runAuthorizedPurchase(async () => {
      setPurchasing(true);
      try {
        const res = await purchaseIntlAirtime({
          billersCode: billersCodeFormatted,
          variation_code: selectedVariation.variation_code,
          amount,
          phone: phoneFormatted,
          operator_id: selectedOperator.operator_id,
          country_code: selectedCountry.code,
          product_type_id: String(selectedProductType.product_type_id),
          use_cashback: useCashback,
        });

        if (res.success && res.data) {
          closeConfirmModal();
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
                "Your purchase is being processed. We'll check the status shortly.",
            });
            pollStatus(requestId, true);
          } else if (status === "delivered" || code === "000") {
            setSuccessModal({
              visible: true,
              message: `International airtime of ${formatNaira(amount)} has been sent successfully.`,
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
    setAmountStr("");
    setBillersCode("");
    setPhone("");
    resetStore();
    fetchHomepage();
    router.replace("/(app)/(tabs)");
  }

  if (
    !selectedCountry ||
    !selectedProductType ||
    !selectedOperator ||
    !selectedVariation
  ) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <IntlAirtimeHeader title="Amount & pay" />

      <KeyboardAwareScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-10"
      >
        <WalletBalanceCard
          walletBalance={walletBalance}
          cashbackBalance={cashbackBalance}
          hasCashback={!!hasCashback}
        />

        <AmountAndPhoneSection
          billersCode={billersCode}
          onBillersCodeChange={(t) => {
            setBillersCode(t);
            setFieldErrors((e) => ({ ...e, billersCode: undefined }));
          }}
          phone={phone}
          onPhoneChange={(t) => {
            setPhone(t);
            setFieldErrors((e) => ({ ...e, phone: undefined }));
          }}
          amountStr={amountStr}
          onAmountChange={(t) => {
            setAmountStr(t.replace(/\D/g, ""));
            setFieldErrors((e) => ({ ...e, amount: undefined }));
          }}
          countryPrefix={selectedCountry.prefix}
          amountError={
            fieldErrors.amount ??
            (insufficientBalance
              ? "Insufficient balance. Fund your wallet or reduce the amount."
              : undefined)
          }
          billersCodeError={fieldErrors.billersCode}
          phoneError={fieldErrors.phone}
          onClearAmountError={() =>
            setFieldErrors((e) => ({ ...e, amount: undefined }))
          }
          onClearBillersCodeError={() =>
            setFieldErrors((e) => ({ ...e, billersCode: undefined }))
          }
          onClearPhoneError={() =>
            setFieldErrors((e) => ({ ...e, phone: undefined }))
          }
          cashbackToEarn={cashbackToEarn}
          onPay={handleOpenConfirmModal}
          canSubmit={!!canSubmit}
        />
      </KeyboardAwareScrollView>

      <ConfirmIntlAirtimeModal
        visible={
          confirmModalVisible && !paymentAuthorizationModalProps.visible
        }
        onClose={closeConfirmModal}
        country={selectedCountry}
        operator={selectedOperator}
        variation={selectedVariation}
        billersCode={billersCode}
        phone={
          phone.startsWith("0") ? phone : phoneTrimmed ? `0${phoneTrimmed}` : phone
        }
        amount={amount}
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

      <AlertModal
        visible={successModal.visible}
        variant="success"
        title="Done"
        message={successModal.message}
        primaryAction={{ label: "Done", onPress: handleSuccessClose }}
        onClose={handleSuccessClose}
      />

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
              setProcessingModal({
                visible: false,
                requestId: null,
                message: "",
              });
              fetchHomepage();
              router.replace("/(app)/vtpass/intl-airtime");
            },
          }}
          onClose={() => {
            setProcessingModal({
              visible: false,
              requestId: null,
              message: "",
            });
            fetchHomepage();
            router.replace("/(app)/vtpass/intl-airtime");
          }}
        />
      )}
    </SafeAreaView>
  );
}
