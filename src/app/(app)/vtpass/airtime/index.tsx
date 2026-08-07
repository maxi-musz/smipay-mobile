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

import { purchaseAirtime } from "@/api/services/vtpass-airtime";
import {
  addRecentAirtime,
  AmountSection,
  AirtimeHeader,
  ConfirmBuyAirtimeModal,
  computeCashbackToEarn,
  getAirtimeCashbackRate,
  getRecentAirtime,
  getRecentEntryDisplay,
  normalizeNgMobileDigits,
  parseBalanceToNumber,
  parseMinMax,
  isAirtimePhoneSubmittable,
  ProviderPhoneRow,
  RecentAirtimeList,
  WalletBalanceCard,
} from "@/features/vtpass-airtime";
import {
  PaymentAuthorizationModal,
  useAuthorizePurchase,
  useConfirmWalletSnapshot,
} from "@/features/payment-authorization";
import { FullPageLoader } from "@/components/ui/loaders";
import { AlertModal } from "@/components/ui/modals/alert-modal";
import { useAirtimeStore, useHomepageStore } from "@/store";
import { logPurchaseSuccess } from "@/lib/analytics";
import { classifyError, getFailedTransactionId } from "@/lib/errors";
import type { AirtimeServiceItem } from "@/types/vtpass-airtime";

export default function VtpassAirtimeScreen() {
  const compact = useCompactScreen();
  const scrollRef = useRef<ScrollView>(null);
  const phoneFieldRef = useRef<View>(null);
  const amountFieldRef = useRef<View>(null);

  const homepageData = useHomepageStore.use.data();
  const walletBalance =
    homepageData?.wallet_card?.current_balance ?? "₦0.00";
  const cashbackBalance =
    homepageData?.cashback_wallet?.current_balance ?? "₦0.00";
  const fetchHomepage = useHomepageStore.use.fetchHomepage();

  const providers = useAirtimeStore.use.providers();
  const loadingProviders = useAirtimeStore.use.isLoading();
  const providerError = useAirtimeStore.use.error();
  const fetchAirtimeProviders = useAirtimeStore.use.fetchAirtimeProviders();

  const {
    runAuthorizedPurchase,
    isStepUpBusy,
    paymentAuthorizationModalProps,
  } = useAuthorizePurchase({
    biometricPromptMessage: "Authenticate to confirm airtime purchase",
  });

  const {
    snapshot: confirmSnapshot,
    loading: confirmWalletLoading,
    error: confirmWalletError,
    refresh: refreshConfirmBalances,
    reset: resetConfirmWallet,
  } = useConfirmWalletSnapshot();

  const [selectedProvider, setSelectedProvider] =
    useState<AirtimeServiceItem | null>(null);
  const [useCashback, setUseCashback] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [activeField, setActiveField] = useState<"phone" | "amount" | null>(null);
  const [recentList, setRecentList] = useState<
    { phone: string; serviceID: string }[]
  >([]);
  const [fieldErrors, setFieldErrors] = useState<{
    phone?: string;
    amount?: string;
  }>({});
  const [purchasing, setPurchasing] = useState(false);
  const [hasPreFilled, setHasPreFilled] = useState(false);
  const [showContactMatchDisclaimer, setShowContactMatchDisclaimer] = useState(false);

  const phoneInput = useNumericInput({
    maxLength: 11,
    onChange: () => {
      if (fieldErrors.phone) setFieldErrors((e) => ({ ...e, phone: undefined }));
    },
  });

  const amountInput = useNumericInput({
    maxLength: 6,
    onChange: () => {
      if (fieldErrors.amount) setFieldErrors((e) => ({ ...e, amount: undefined }));
    },
  });

  const phone = normalizeNgMobileDigits(phoneInput.value);
  const amountStr = amountInput.value;

  const showKeypad =
    activeField != null &&
    !confirmModalVisible &&
    !paymentAuthorizationModalProps.visible;

  const reserveScrollRoom = activeField === "amount";

  const { metricsOptions, scrollPaddingBottom, blockHeight } =
    useSecureKeypadOverlay(showKeypad, reserveScrollRoom);

  const activeFieldRef =
    activeField === "phone" ? phoneFieldRef : amountFieldRef;

  const { onScroll: onKeypadScroll } = useScrollFieldAboveKeypad({
    active: showKeypad,
    scrollRef,
    fieldRef: activeFieldRef,
    keypadBlockHeight: blockHeight,
    layoutRevision: scrollPaddingBottom,
  });

  const activeController = activeField === "phone" ? phoneInput : amountInput;

  function dismissKeypad() {
    setActiveField(null);
  }

  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: "", message: "" });

  useEffect(() => {
    fetchAirtimeProviders();
  }, [fetchAirtimeProviders]);

  useEffect(() => {
    if (providers.length > 0 && !selectedProvider) {
      setSelectedProvider(providers[0]);
    }
    const validSelection =
      selectedProvider && providers.some((p) => p.serviceID === selectedProvider.serviceID);
    if (selectedProvider && !validSelection && providers[0]) {
      setSelectedProvider(providers[0]);
    }
  }, [providers, selectedProvider]);

  useEffect(() => {
    let cancelled = false;
    getRecentAirtime().then((list) => {
      if (!cancelled) setRecentList(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hasPreFilled || recentList.length === 0 || providers.length === 0) return;
    const first = recentList[0];
    const provider = providers.find((p) => p.serviceID === first.serviceID);
    if (provider) {
      setSelectedProvider(provider);
      phoneInput.setValue(
        normalizeNgMobileDigits(getRecentEntryDisplay(first).replace(/\D/g, "")),
      );
      setHasPreFilled(true);
    }
  }, [recentList, providers, hasPreFilled, phoneInput]);

  const { min: amountMin, max: amountMax } = selectedProvider
    ? parseMinMax(selectedProvider)
    : { min: 50, max: 100000 };
  const amount = parseInt(amountStr.replace(/\D/g, ""), 10) || 0;
  const amountValid = amount >= amountMin && amount <= amountMax;
  const phoneNormForValidation = normalizeNgMobileDigits(phone);
  const phoneValid = isAirtimePhoneSubmittable(phoneNormForValidation);
  const maxPayable =
    parseBalanceToNumber(walletBalance) + parseBalanceToNumber(cashbackBalance);
  /** Dashboard balance hint (quick amounts); the confirm modal reads the same live dashboard balance */
  const insufficientBalance = amount > 0 && amount > maxPayable;
  // Network / NCC-prefix checks are advisory only — never gate Pay.
  const canSubmit =
    !!selectedProvider &&
    phoneValid &&
    amountValid &&
    !insufficientBalance &&
    !purchasing &&
    !loadingProviders;

  const hasCashback =
    cashbackBalance &&
    cashbackBalance !== "₦0.00" &&
    cashbackBalance !== "₦0" &&
    cashbackBalance !== "";

  const { percentage, maxPerTransaction } = getAirtimeCashbackRate(
    homepageData?.cashback_rates,
    homepageData?.reward_banners,
  );
  const cashbackToEarn = computeCashbackToEarn(
    amount,
    percentage,
    maxPerTransaction,
  );

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

  function handleAmountChange(text: string) {
    amountInput.setValue(text.replace(/\D/g, ""));
  }

  function handleOpenConfirmModal() {
    if (!selectedProvider || !canSubmit) return;

    const phoneNorm = normalizeNgMobileDigits(phone);
    if (!isAirtimePhoneSubmittable(phoneNorm)) {
      setFieldErrors((e) => ({
        ...e,
        phone: "Enter a 10 or 11-digit phone number",
      }));
      setActiveField("phone");
      return;
    }
    if (amount < amountMin || amount > amountMax) {
      setFieldErrors((e) => ({
        ...e,
        amount: `Amount must be between ₦${amountMin} and ₦${amountMax.toLocaleString()}`,
      }));
      setActiveField("amount");
      return;
    }

    dismissKeypad();
    setFieldErrors({});
    setConfirmModalVisible(true);
    void refreshConfirmBalances();
  }

  function closeConfirmModal() {
    setConfirmModalVisible(false);
    setUseCashback(false);
    resetConfirmWallet();
  }

  async function handleConfirmPurchase() {
    if (!selectedProvider) return;

    await runAuthorizedPurchase(async () => {
      const phoneNorm = normalizeNgMobileDigits(phone);
      setPurchasing(true);
      try {
        const res = await purchaseAirtime({
          serviceID: selectedProvider.serviceID,
          amount,
          phone: phoneNorm,
          use_cashback: useCashback,
        });

        if (res.success && res.data) {
          closeConfirmModal();
          await addRecentAirtime(phoneNorm, selectedProvider.serviceID);
          const updated = await getRecentAirtime();
          setRecentList(updated);

          const status =
            res.data.content?.transactions?.status ?? res.data.status;
          const isProcessing =
            status === "pending" ||
            status === "initiated" ||
            res.data.response_description?.toUpperCase().includes("PROCESSING");

          if (!isProcessing) {
            void logPurchaseSuccess("airtime", amount, selectedProvider.name);
          }

          amountInput.clear();
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
            title: "Purchase Failed",
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
          // Close the checkout sheet first: iOS cannot reliably stack two RN
          // Modals, so the error alert renders behind it and is never seen.
          closeConfirmModal();
          const classified = classifyError(e);
          setErrorModal({
            visible: true,
            title: classified.title,
            message:
              classified.message ||
              "We couldn't complete this purchase. Please try again.",
          });
        }
      } finally {
        setPurchasing(false);
      }
    });
  }

  function handleSelectRecent(entry: { phone: string; serviceID: string }) {
    const provider = providers.find((p) => p.serviceID === entry.serviceID);
    if (provider) setSelectedProvider(provider);
    phoneInput.setValue(
      normalizeNgMobileDigits(getRecentEntryDisplay(entry).replace(/\D/g, "")),
    );
    dismissKeypad();
    if (fieldErrors.phone) setFieldErrors((e) => ({ ...e, phone: undefined }));
  }

  if (loadingProviders && providers.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <AirtimeHeader />
        <View className="flex-1">
          <FullPageLoader message="Loading networks…" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <AirtimeHeader />

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
          entering={FadeInDown.delay(50).duration(220)}
          className="mt-6"
        >
          <ProviderPhoneRow
            providers={providers}
            selectedProvider={selectedProvider}
            onSelectProvider={(p) => {
              setShowContactMatchDisclaimer(false);
              setSelectedProvider(p);
            }}
            phone={phoneInput.value}
            onPhoneChange={(digits) => {
              setShowContactMatchDisclaimer(false);
              phoneInput.setValue(normalizeNgMobileDigits(digits));
            }}
            onClearPhone={() => phoneInput.clear()}
            onProviderAutoSelectedFromContact={() => setShowContactMatchDisclaimer(true)}
            showContactMatchDisclaimer={showContactMatchDisclaimer}
            phoneError={fieldErrors.phone}
            providerError={providerError}
            onRetryProviders={() => fetchAirtimeProviders(true)}
            phoneFocused={activeField === "phone"}
            onPhoneFocus={() => setActiveField("phone")}
            onPickerOpen={dismissKeypad}
            phoneInputAnchorRef={phoneFieldRef}
          />
        </Animated.View>

        <View>
          <AmountSection
            amountStr={amountStr}
            amountMin={amountMin}
            amountMax={amountMax}
            maxAffordable={maxPayable}
            error={
              fieldErrors.amount ??
              (insufficientBalance
                ? "Insufficient balance. Fund your wallet or reduce the amount."
                : undefined)
            }
            onAmountChange={handleAmountChange}
            onClearAmountError={() =>
              setFieldErrors((e) => ({ ...e, amount: undefined }))
            }
            cashbackRates={homepageData?.cashback_rates}
            rewardBanners={homepageData?.reward_banners}
            onPay={handleOpenConfirmModal}
            canSubmit={!!canSubmit}
            amountFocused={activeField === "amount"}
            onAmountFocus={() => setActiveField("amount")}
            amountInputAnchorRef={amountFieldRef}
          />
        </View>

        {activeField !== "amount" ? (
          <RecentAirtimeList
            entries={recentList}
            providers={providers}
            onSelect={handleSelectRecent}
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
                controller={activeController}
                backspaceBehavior="repeat"
                metrics={metricsOptions}
              />
            </KeypadDock>
          </View>
        ) : null}
      </View>

      <ConfirmBuyAirtimeModal
        visible={
          confirmModalVisible && !paymentAuthorizationModalProps.visible
        }
        onClose={closeConfirmModal}
        productName={selectedProvider?.name ?? "Airtime"}
        selectedProvider={selectedProvider}
        recipientPhone={phone.startsWith("0") ? phone : `0${phone}`}
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

      {/* Hide checkout bottom sheet while PIN/auth Modal is open — iOS cannot reliably stack two RN Modals. */}
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
        title={errorModal.title || "Purchase Failed"}
        message={errorModal.message}
        primaryAction={{
          label: "Retry",
          onPress: () => {
            setErrorModal({ visible: false, title: "", message: "" });
            void handleConfirmPurchase();
          },
        }}
        secondaryAction={{
          label: "Cancel",
          onPress: () => {
            setErrorModal({ visible: false, title: "", message: "" });
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
