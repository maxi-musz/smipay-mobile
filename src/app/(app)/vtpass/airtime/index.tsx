import { useEffect, useLayoutEffect, useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

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
  PHONE_REGEX,
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
import { classifyError } from "@/lib/errors";
import type { AirtimeServiceItem } from "@/types/vtpass-airtime";

export default function VtpassAirtimeScreen() {
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
  const [phone, setPhone] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [useCashback, setUseCashback] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
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

  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    message: string;
  }>({ visible: false, message: "" });
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    message: string;
  }>({ visible: false, message: "" });

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
      setPhone(
        normalizeNgMobileDigits(getRecentEntryDisplay(first).replace(/\D/g, "")),
      );
      setHasPreFilled(true);
    }
  }, [recentList, providers, hasPreFilled]);

  const { min: amountMin, max: amountMax } = selectedProvider
    ? parseMinMax(selectedProvider)
    : { min: 50, max: 100000 };
  const amount = parseInt(amountStr.replace(/\D/g, ""), 10) || 0;
  const amountValid = amount >= amountMin && amount <= amountMax;
  const phoneNormForValidation = normalizeNgMobileDigits(phone);
  const phoneValid = PHONE_REGEX.test(phoneNormForValidation);
  const maxPayable =
    parseBalanceToNumber(walletBalance) + parseBalanceToNumber(cashbackBalance);
  /** Dashboard balance hint (quick amounts); the confirm modal reads the same live dashboard balance */
  const insufficientBalance = amount > 0 && amount > maxPayable;
  const canSubmit =
    selectedProvider &&
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

  function handlePhoneChange(text: string) {
    setPhone(normalizeNgMobileDigits(text));
    if (fieldErrors.phone) setFieldErrors((e) => ({ ...e, phone: undefined }));
  }

  function handleAmountChange(text: string) {
    const digits = text.replace(/\D/g, "");
    setAmountStr(digits);
    if (fieldErrors.amount) setFieldErrors((e) => ({ ...e, amount: undefined }));
  }

  function handleOpenConfirmModal() {
    if (!selectedProvider || !canSubmit) return;

    const phoneNorm = normalizeNgMobileDigits(phone);
    if (!PHONE_REGEX.test(phoneNorm)) {
      setFieldErrors((e) => ({
        ...e,
        phone: "Enter a valid 11-digit phone number",
      }));
      return;
    }
    if (amount < amountMin || amount > amountMax) {
      setFieldErrors((e) => ({
        ...e,
        amount: `Amount must be between ₦${amountMin} and ₦${amountMax.toLocaleString()}`,
      }));
      return;
    }

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

          if (isProcessing) {
            setSuccessModal({
              visible: true,
              message:
                "Your airtime purchase is being processed. You'll receive a confirmation shortly.",
            });
          } else {
            void logPurchaseSuccess("airtime", amount, selectedProvider.name);
            setSuccessModal({
              visible: true,
              message: `${selectedProvider.name} airtime of ₦${amount.toLocaleString()} has been sent to ${phoneNorm}.`,
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
        const classified = classifyError(e);
        setErrorModal({
          visible: true,
          message:
            classified.message ||
            "We couldn't complete this purchase. Please try again.",
        });
      } finally {
        setPurchasing(false);
      }
    });
  }

  function handleSuccessClose() {
    setSuccessModal({ visible: false, message: "" });
    setAmountStr("");
    fetchHomepage();
    router.replace("/(app)/(tabs)");
  }

  function handleSelectRecent(entry: { phone: string; serviceID: string }) {
    const provider = providers.find((p) => p.serviceID === entry.serviceID);
    if (provider) setSelectedProvider(provider);
    setPhone(
      normalizeNgMobileDigits(getRecentEntryDisplay(entry).replace(/\D/g, "")),
    );
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
            phone={phone}
            onPhoneChange={(digits) => {
              setShowContactMatchDisclaimer(false);
              handlePhoneChange(digits);
            }}
            onClearPhone={() => handlePhoneChange("")}
            onProviderAutoSelectedFromContact={() => setShowContactMatchDisclaimer(true)}
            showContactMatchDisclaimer={showContactMatchDisclaimer}
            phoneError={fieldErrors.phone}
            providerError={providerError}
            onRetryProviders={() => fetchAirtimeProviders(true)}
          />
        </Animated.View>

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
        />

        <RecentAirtimeList
          entries={recentList}
          providers={providers}
          onSelect={handleSelectRecent}
        />
      </KeyboardAwareScrollView>

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
        visible={successModal.visible}
        variant="success"
        title="Airtime Sent"
        message={successModal.message}
        primaryAction={{ label: "Done", onPress: handleSuccessClose }}
        onClose={handleSuccessClose}
      />

      <AlertModal
        visible={errorModal.visible}
        variant="error"
        title="Purchase Failed"
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
