import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import { purchaseData, queryDataTransaction } from "@/api";
import {
  DataHeader,
  WalletBalanceCard,
  ConfirmDataModal,
  DataPhoneRow,
  PlanSummaryCard,
  RecentDataList,
} from "@/features/vtpass-data/components";
import {
  formatNaira,
  parseBalanceToNumber,
  getDataCashbackRate,
  computeCashbackToEarn,
  DATA_PHONE_REGEX,
  POLL_FIRST_DELAY_MS,
  POLL_INTERVAL_MS,
  POLL_MAX_ELAPSED_MS,
} from "@/features/vtpass-data/lib/constants";
import { normalizeNgMobileDigits } from "@/features/vtpass-airtime/constants";
import {
  getRecentData,
  addRecentData,
  getRecentDataEntryDisplay,
  type DataRecentEntry,
} from "@/features/vtpass-data/lib/data-recent-storage";
import { useDataStore } from "@/features/vtpass-data/lib/store";
import {
  PaymentAuthorizationModal,
  useAuthorizePurchase,
  useConfirmWalletSnapshot,
} from "@/features/payment-authorization";
import { AlertModal } from "@/components/ui/modals/alert-modal";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useHomepageStore } from "@/store";
import { handleApiError } from "@/lib/errors";

export default function DataAmountScreen() {
  const homepageData = useHomepageStore.use.data();
  const fetchHomepage = useHomepageStore.use.fetchHomepage();
  const walletBalance =
    homepageData?.wallet_card?.current_balance ?? "₦0.00";
  const cashbackBalance =
    homepageData?.cashback_wallet?.current_balance ?? "₦0.00";

  const selectedProvider = useDataStore.use.selectedProvider();
  const selectedVariation = useDataStore.use.selectedVariation();
  const resetStore = useDataStore.use.reset();

  const {
    runAuthorizedPurchase,
    isStepUpBusy,
    paymentAuthorizationModalProps,
  } = useAuthorizePurchase({
    biometricPromptMessage: "Authenticate to confirm data purchase",
  });

  const {
    snapshot: confirmSnapshot,
    loading: confirmWalletLoading,
    error: confirmWalletError,
    refresh: refreshConfirmBalances,
    reset: resetConfirmWallet,
  } = useConfirmWalletSnapshot();

  const [phone, setPhone] = useState("");
  const [useCashback, setUseCashback] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [showContactMatchDisclaimer, setShowContactMatchDisclaimer] = useState(false);
  const [recentList, setRecentList] = useState<DataRecentEntry[]>([]);
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
  const successPayloadRef = useRef<{ phone: string; serviceID: string } | null>(null);

  const amount = selectedVariation?.variation_amount
    ? parseFloat(String(selectedVariation.variation_amount))
    : 0;

  useEffect(() => {
    if (!selectedProvider || !selectedVariation) {
      router.replace("/(app)/vtpass/data");
    }
  }, [selectedProvider, selectedVariation]);

  useEffect(() => {
    let cancelled = false;
    getRecentData().then((list) => {
      if (!cancelled) setRecentList(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    (requestId: string, isFirst: boolean) => {
      queryDataTransaction({ request_id: requestId })
        .then((res) => {
          if (!res.success || !res.data) return;
          const status = res.data.content?.transactions?.status ?? "";
          const code = res.data.code ?? "";
          if (status === "delivered" || code === "000") {
            stopPolling();
            const payload = successPayloadRef.current;
            if (payload) {
              addRecentData(payload.phone, payload.serviceID).then(() => {
                getRecentData().then(setRecentList);
              });
              successPayloadRef.current = null;
            }
            setProcessingModal({ visible: false, requestId: null, message: "" });
            setSuccessModal({
              visible: true,
              message: "Your data purchase was successful.",
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

  const phoneNorm = normalizeNgMobileDigits(phone);
  const phoneValid = DATA_PHONE_REGEX.test(phoneNorm);
  const hasCashback =
    !!cashbackBalance &&
    cashbackBalance !== "₦0.00" &&
    cashbackBalance !== "₦0" &&
    cashbackBalance !== "";

  const { percentage, maxPerTransaction } = getDataCashbackRate(
    homepageData?.cashback_rates,
    homepageData?.reward_banners,
  );
  const cashbackToEarn = computeCashbackToEarn(
    amount,
    percentage,
    maxPerTransaction,
  );

  const maxPayable =
    parseBalanceToNumber(walletBalance) + parseBalanceToNumber(cashbackBalance);
  const insufficientBalance = amount > 0 && amount > maxPayable;
  const canSubmit =
    !!selectedProvider &&
    !!selectedVariation &&
    amount > 0 &&
    !insufficientBalance &&
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

  function handleOpenConfirmModal() {
    if (!canSubmit) return;
    if (!phoneValid) {
      setPhoneError("Enter a valid 11-digit phone number (e.g. 08012345678)");
      return;
    }
    setPhoneError(null);
    setConfirmModalVisible(true);
    void refreshConfirmBalances();
  }

  async function handleConfirmPurchase() {
    if (!selectedProvider || !selectedVariation) return;

    const billersCode = phoneNorm.length === 11 ? phoneNorm : `0${phoneNorm.replace(/\D/g, "").slice(-10)}`;
    if (!DATA_PHONE_REGEX.test(billersCode)) {
      setPhoneError("Enter a valid 11-digit phone number");
      return;
    }

    await runAuthorizedPurchase(async () => {
      setPurchasing(true);
      try {
        const res = await purchaseData({
          serviceID: selectedProvider.serviceID,
          billersCode,
          variation_code: selectedVariation.variation_code,
          amount: Math.round(amount * 100) / 100,
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
            successPayloadRef.current = {
              phone: phoneNorm,
              serviceID: selectedProvider.serviceID,
            };
            pollStartRef.current = Date.now();
            setProcessingModal({
              visible: true,
              requestId,
              message:
                "Your purchase is being processed. We'll check the status shortly.",
            });
            pollStatus(requestId, true);
          } else if (status === "delivered" || code === "000") {
            addRecentData(phoneNorm, selectedProvider.serviceID).then(() => {
              getRecentData().then(setRecentList);
            });
            setSuccessModal({
              visible: true,
              message: `Data plan ${formatNaira(amount)} has been purchased successfully.`,
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
    setPhone("");
    resetStore();
    fetchHomepage();
    router.replace("/(app)/(tabs)");
  }

  function handleSelectRecent(entry: DataRecentEntry) {
    setPhone(
      normalizeNgMobileDigits(getRecentDataEntryDisplay(entry).replace(/\D/g, "")),
    );
    setPhoneError(null);
    setShowContactMatchDisclaimer(false);
  }

  if (!selectedProvider || !selectedVariation) return null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <DataHeader showBuyDataTitle={false} title="Amount & pay" />

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

        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          className="mt-8"
        >
          <Text className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Selected plan
          </Text>
          <PlanSummaryCard
            provider={selectedProvider}
            variation={selectedVariation}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(100).duration(300)}
          className="mt-8"
        >
          <Text className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Recipient number
          </Text>
          <DataPhoneRow
            provider={selectedProvider}
            phone={phone}
            onPhoneChange={(t) => {
              setPhone(t);
              if (phoneError) setPhoneError(null);
            }}
            onClearPhone={() => {
              setPhone("");
              setPhoneError(null);
              setShowContactMatchDisclaimer(false);
            }}
            showContactMatchDisclaimer={showContactMatchDisclaimer}
            onContactPicked={() => setShowContactMatchDisclaimer(true)}
            phoneError={phoneError ?? undefined}
          />
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
          <Text className="text-base font-semibold text-white">Continue</Text>
        </Button>

        <RecentDataList
          entries={recentList}
          currentServiceID={selectedProvider.serviceID}
          onSelect={handleSelectRecent}
          getProviderName={(sid) => {
            if (sid === selectedProvider.serviceID)
              return selectedProvider.name?.replace(/\s*data\s*/i, "").trim() ?? sid;
            return sid.replace(/\s*data\s*/i, "").trim() || "Data";
          }}
        />
      </KeyboardAwareScrollView>

      <ConfirmDataModal
        visible={
          confirmModalVisible &&
          !paymentAuthorizationModalProps.visible
        }
        onClose={closeConfirmModal}
        provider={selectedProvider}
        variation={selectedVariation}
        phone={phoneNorm}
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
              router.replace("/(app)/vtpass/data");
            },
          }}
          onClose={() => {
            setProcessingModal({
              visible: false,
              requestId: null,
              message: "",
            });
            fetchHomepage();
            router.replace("/(app)/vtpass/data");
          }}
        />
      )}
    </SafeAreaView>
  );
}
