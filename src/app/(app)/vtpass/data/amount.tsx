import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import {
  Keypad,
  KeypadDock,
  useNumericInput,
  useScrollFieldAboveKeypad,
  useSecureKeypadOverlay,
} from "@/components/keypad";
import { useCompactScreen } from "@/hooks/use-compact-screen";

import { purchaseData } from "@/api";
import {
  DataHeader,
  WalletBalanceCard,
  ConfirmDataModal,
  DataPhoneRow,
  PlanSummaryCard,
  RecentDataList,
} from "@/features/vtpass-data/components";
import {
  parseBalanceToNumber,
  getDataCashbackRate,
  computeCashbackToEarn,
  DATA_PHONE_REGEX,
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
import { logPurchaseSuccess } from "@/lib/analytics";
import { getFailedTransactionId, handleApiError } from "@/lib/errors";

export default function DataAmountScreen() {
  const compact = useCompactScreen();
  const scrollRef = useRef<ScrollView>(null);
  const phoneFieldRef = useRef<View>(null);

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

  const [useCashback, setUseCashback] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [phoneKeypadOpen, setPhoneKeypadOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [showContactMatchDisclaimer, setShowContactMatchDisclaimer] = useState(false);
  const [recentList, setRecentList] = useState<DataRecentEntry[]>([]);
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    message: string;
  }>({ visible: false, message: "" });

  const phoneInput = useNumericInput({
    maxLength: 11,
    onChange: () => {
      if (phoneError) setPhoneError(null);
    },
  });

  const phone = normalizeNgMobileDigits(phoneInput.value);

  const showKeypad =
    phoneKeypadOpen &&
    !confirmModalVisible &&
    !paymentAuthorizationModalProps.visible;

  const { metricsOptions, scrollPaddingBottom, blockHeight } =
    useSecureKeypadOverlay(showKeypad);

  const { onScroll: onKeypadScroll } = useScrollFieldAboveKeypad({
    active: showKeypad,
    scrollRef,
    fieldRef: phoneFieldRef,
    keypadBlockHeight: blockHeight,
    layoutRevision: scrollPaddingBottom,
  });

  function dismissKeypad() {
    setPhoneKeypadOpen(false);
  }

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
      setPhoneKeypadOpen(true);
      return;
    }
    dismissKeypad();
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

          const status =
            res.data.content?.transactions?.status ?? res.data.status ?? "";
          const code = res.data.code ?? "";
          const isProcessing =
            res.data.status === "processing" ||
            status === "pending" ||
            status === "initiated" ||
            code === "099" ||
            res.data.response_description?.toUpperCase().includes("PROCESSING");

          addRecentData(phoneNorm, selectedProvider.serviceID).then(() => {
            getRecentData().then(setRecentList);
          });

          if (!isProcessing && (status === "delivered" || code === "000")) {
            void logPurchaseSuccess("data", amount, selectedProvider?.name);
          }

          phoneInput.clear();
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

  function handleSelectRecent(entry: DataRecentEntry) {
    const normalized = normalizeNgMobileDigits(
      getRecentDataEntryDisplay(entry).replace(/\D/g, ""),
    );
    phoneInput.setValue(normalized);
    setPhoneError(null);
    setShowContactMatchDisclaimer(false);
    dismissKeypad();
  }

  if (!selectedProvider || !selectedVariation) return null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <DataHeader showBuyDataTitle={false} title="Amount & pay" />

      <View className="flex-1">
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onKeypadScroll}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: scrollPaddingBottom,
          }}
          onScrollBeginDrag={dismissKeypad}
        >
        <Pressable onPress={dismissKeypad}>
          <WalletBalanceCard
            walletBalance={walletBalance}
            cashbackBalance={cashbackBalance}
            hasCashback={!!hasCashback}
          />
        </Pressable>

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
            phone={phoneInput.value}
            onPhoneChange={(t) => {
              phoneInput.setValue(normalizeNgMobileDigits(t));
            }}
            onClearPhone={() => {
              phoneInput.clear();
              setPhoneError(null);
              setShowContactMatchDisclaimer(false);
            }}
            showContactMatchDisclaimer={showContactMatchDisclaimer}
            onContactPicked={() => setShowContactMatchDisclaimer(true)}
            phoneError={phoneError ?? undefined}
            phoneFocused={phoneKeypadOpen}
            onPhoneFocus={() => setPhoneKeypadOpen(true)}
            phoneInputAnchorRef={phoneFieldRef}
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

        {!showKeypad ? (
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
        ) : null}
        </ScrollView>

        {showKeypad ? (
          <View
            pointerEvents="box-none"
            style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
          >
            <KeypadDock
              secure
              title="SmiPay Secure Keypad"
              animated
              onDone={dismissKeypad}
              doneLabel="Done"
              bottomPadding={compact ? 4 : 8}
            >
              <Keypad
                controller={phoneInput}
                backspaceBehavior="repeat"
                metrics={metricsOptions}
              />
            </KeypadDock>
          </View>
        ) : null}
      </View>

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
