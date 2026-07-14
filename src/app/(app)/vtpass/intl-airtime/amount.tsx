import { useEffect, useLayoutEffect, useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { purchaseIntlAirtime } from "@/api";
import {
  IntlAirtimeHeader,
  WalletBalanceCard,
  AmountAndPhoneSection,
  ConfirmIntlAirtimeModal,
} from "@/features/vtpass-intl-airtime/components";
import {
  parseBalanceToNumber,
  getIntlAirtimeCashbackRate,
  computeCashbackToEarn,
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
import { logPurchaseSuccess } from "@/lib/analytics";
import { getFailedTransactionId, handleApiError } from "@/lib/errors";

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
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    message: string;
  }>({ visible: false, message: "" });

  useEffect(() => {
    if (!selectedCountry || !selectedProductType || !selectedOperator || !selectedVariation) {
      router.replace("/(app)/vtpass/intl-airtime");
    }
  }, [selectedCountry, selectedProductType, selectedOperator, selectedVariation]);

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

          const status =
            res.data.content?.transactions?.status ?? res.data.status ?? "";
          const code = res.data.code ?? "";
          const isProcessing =
            res.data.status === "processing" ||
            status === "pending" ||
            status === "initiated" ||
            code === "099" ||
            res.data.response_description?.toUpperCase().includes("PROCESSING");

          if (!isProcessing && (status === "delivered" || code === "000")) {
            void logPurchaseSuccess("intl_airtime", amount);
          }

          setAmountStr("");
          setBillersCode("");
          setPhone("");
          resetStore();
          fetchHomepage();

          const txId = res.data.id;
          if (txId) {
            router.replace(`/(app)/history/${txId}`);
          } else {
            router.replace("/(app)/(tabs)");
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
        const failedTxId = getFailedTransactionId(e);
        if (failedTxId) {
          // Downstream failure: the backend recorded a failed transaction and
          // refunded. Open its receipt instead of a dead-end error modal.
          closeConfirmModal();
          fetchHomepage();
          router.replace(`/(app)/history/${failedTxId}`);
        } else {
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
        }
      } finally {
        setPurchasing(false);
      }
    });
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
    </SafeAreaView>
  );
}
