import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import { purchaseAirtime } from "@/api/services/vtpass-airtime";
import {
  AirtimeHeader,
  AmountSection,
  ConfirmBuyAirtimeModal,
  ProviderPhoneRow,
  RecentAirtimeList,
  WalletBalanceCard,
  getRecentAirtime,
  addRecentAirtime,
  getRecentEntryDisplay,
  PHONE_REGEX,
  parseMinMax,
  getAirtimeCashbackRate,
  computeCashbackToEarn,
  parseBalanceToNumber,
} from "@/features/vtpass-airtime";
import { FullPageLoader } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { AlertModal } from "@/components/ui/modals/alert-modal";
import { useAirtimeStore, useHomepageStore } from "@/store";
import { handleApiError } from "@/lib/errors";
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
      setPhone(getRecentEntryDisplay(first).replace(/\D/g, "").slice(0, 11));
      setHasPreFilled(true);
    }
  }, [recentList, providers, hasPreFilled]);

  const { min: amountMin, max: amountMax } = selectedProvider
    ? parseMinMax(selectedProvider)
    : { min: 50, max: 100000 };
  const amount = parseInt(amountStr.replace(/\D/g, ""), 10) || 0;
  const amountValid = amount >= amountMin && amount <= amountMax;
  const phoneValid = PHONE_REGEX.test(phone.replace(/\s/g, ""));
  const maxPayable =
    parseBalanceToNumber(walletBalance) + parseBalanceToNumber(cashbackBalance);
  const amountWithinFunds = amount <= maxPayable + 1e-9;
  const canSubmit =
    selectedProvider &&
    phoneValid &&
    amountValid &&
    amountWithinFunds &&
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

  function handlePhoneChange(text: string) {
    const digits = text.replace(/\D/g, "").slice(0, 11);
    setPhone(digits);
    if (fieldErrors.phone) setFieldErrors((e) => ({ ...e, phone: undefined }));
  }

  function handleAmountChange(text: string) {
    const digits = text.replace(/\D/g, "");
    setAmountStr(digits);
    if (fieldErrors.amount) setFieldErrors((e) => ({ ...e, amount: undefined }));
  }

  function handleOpenConfirmModal() {
    if (!selectedProvider || !canSubmit) return;

    const phoneNorm = phone.startsWith("0") ? phone : `0${phone}`;
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
    if (amount > maxPayable + 1e-9) {
      setFieldErrors((e) => ({
        ...e,
        amount:
          maxPayable <= 0
            ? "Insufficient wallet and cashback balance"
            : `Maximum ₦${maxPayable.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (wallet + cashback)`,
      }));
      return;
    }

    setFieldErrors({});
    if (hasCashback) setUseCashback(true);
    setConfirmModalVisible(true);
  }

  async function handleConfirmPurchase() {
    if (!selectedProvider) return;

    const phoneNorm = phone.startsWith("0") ? phone : `0${phone}`;
    setPurchasing(true);
    try {
      const res = await purchaseAirtime({
        serviceID: selectedProvider.serviceID,
        amount,
        phone: phoneNorm,
        use_cashback: useCashback,
      });

      if (res.success && res.data) {
        setConfirmModalVisible(false);
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
      handleApiError(e);
    } finally {
      setPurchasing(false);
    }
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
    setPhone(getRecentEntryDisplay(entry).replace(/\D/g, "").slice(0, 11));
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

      <ScrollView
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
          entering={FadeInDown.delay(50).duration(300).springify().damping(15)}
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
            (amount > 0 &&
            amountValid &&
            !amountWithinFunds
              ? maxPayable <= 0
                ? "Insufficient wallet and cashback balance"
                : `Maximum ₦${maxPayable.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (wallet + cashback)`
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
      </ScrollView>

      <ConfirmBuyAirtimeModal
        visible={confirmModalVisible}
        onClose={() => setConfirmModalVisible(false)}
        productName={selectedProvider?.name ?? "Airtime"}
        selectedProvider={selectedProvider}
        recipientPhone={phone.startsWith("0") ? phone : `0${phone}`}
        amount={amount}
        cashbackBalance={cashbackBalance}
        cashbackToEarn={cashbackToEarn}
        useCashback={useCashback}
        onUseCashbackChange={setUseCashback}
        onConfirm={handleConfirmPurchase}
        purchasing={purchasing}
        walletBalance={walletBalance}
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
          label: "OK",
          onPress: () => setErrorModal({ visible: false, message: "" }),
        }}
        onClose={() => setErrorModal({ visible: false, message: "" })}
      />
    </SafeAreaView>
  );
}
