import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { purchaseEducation, queryEducationTransaction } from "@/api";
import {
  EducationHeader,
  WalletBalanceCard,
  ConfirmEducationModal,
  CredentialModal,
} from "@/features/vtpass-education/components";
import {
  formatNaira,
  getProductTraits,
  getEducationCashbackRate,
  computeCashbackToEarn,
  PHONE_REGEX,
  POLL_FIRST_DELAY_MS,
  POLL_INTERVAL_MS,
  POLL_MAX_ELAPSED_MS,
} from "@/features/vtpass-education/lib/constants";
import { useEducationStore } from "@/features/vtpass-education/lib/store";
import { AlertModal } from "@/components/ui/modals/alert-modal";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useHomepageStore } from "@/store";
import { handleApiError } from "@/lib/errors";
import { colors } from "@/constants/colors";
import type { EducationCredentials } from "@/types/vtpass-education";

const PLACEHOLDER_LIGHT = "rgba(107, 114, 128, 0.38)";
const PLACEHOLDER_DARK = "rgba(255, 255, 255, 0.15)";

export default function EducationPurchaseScreen() {
  const { isDark } = useAppTheme();
  const homepageData = useHomepageStore.use.data();
  const fetchHomepage = useHomepageStore.use.fetchHomepage();
  const walletBalance =
    homepageData?.wallet_card?.current_balance ?? "₦0.00";
  const cashbackBalance =
    homepageData?.cashback_wallet?.current_balance ?? "₦0.00";

  const selectedProduct = useEducationStore.use.selectedProduct();
  const selectedVariation = useEducationStore.use.selectedVariation();
  const verifyData = useEducationStore.use.verifyData();
  const storedBillersCode = useEducationStore.use.billersCode();
  const quantity = useEducationStore.use.quantity();
  const setQuantity = useEducationStore.use.setQuantity();
  const resetStore = useEducationStore.use.reset();

  const [phone, setPhone] = useState("");
  const [useCashback, setUseCashback] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [phoneError, setPhoneError] = useState<string | undefined>();

  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    credentials: EducationCredentials | null;
  }>({ visible: false, credentials: null });
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

  const traits = selectedProduct ? getProductTraits(selectedProduct) : null;

  useEffect(() => {
    if (!selectedProduct || !selectedVariation) {
      router.replace("/(app)/vtpass/education");
    }
  }, [selectedProduct, selectedVariation]);

  const variationAmount = selectedVariation?.variation_amount
    ? parseFloat(selectedVariation.variation_amount)
    : 0;
  const amount = variationAmount * quantity;

  const customerName = verifyData?.Customer_Name ?? undefined;

  const hasCashback =
    !!cashbackBalance &&
    cashbackBalance !== "₦0.00" &&
    cashbackBalance !== "₦0" &&
    cashbackBalance !== "";

  const { percentage, maxPerTransaction } = getEducationCashbackRate(
    homepageData?.cashback_rates,
    homepageData?.reward_banners,
  );
  const cashbackToEarn = computeCashbackToEarn(
    amount,
    percentage,
    maxPerTransaction,
  );

  const phoneValid = PHONE_REGEX.test(phone);
  const canSubmit =
    !!selectedProduct &&
    !!selectedVariation &&
    amount > 0 &&
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
      queryEducationTransaction({ request_id: requestId })
        .then((res) => {
          if (!res.success || !res.data) return;
          const status = res.data.content?.transactions?.status ?? "";
          const code = res.data.code ?? "";
          if (status === "delivered" || code === "000") {
            stopPolling();
            setProcessingModal({ visible: false, requestId: null, message: "" });
            setSuccessModal({
              visible: true,
              credentials: res.data.credentials ?? null,
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

    if (!PHONE_REGEX.test(phone)) {
      setPhoneError("Enter a valid 11-digit phone number");
      return;
    }

    setPhoneError(undefined);
    if (hasCashback) setUseCashback(true);
    setConfirmModalVisible(true);
  }

  async function handleConfirmPurchase() {
    if (!selectedProduct || !selectedVariation) return;

    const payload: Parameters<typeof purchaseEducation>[0] = {
      serviceID: selectedProduct,
      variation_code: selectedVariation.variation_code,
      phone: phone.trim(),
      use_cashback: useCashback,
    };

    if (traits?.hasQuantity && quantity > 1) {
      payload.quantity = quantity;
    }

    if (traits?.hasVerify && storedBillersCode) {
      payload.billersCode = storedBillersCode;
    }

    setPurchasing(true);
    try {
      const res = await purchaseEducation(payload);

      if (res.success && res.data) {
        setConfirmModalVisible(false);

        const credentials = res.data.credentials ?? null;
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

        if (
          !isProcessing &&
          (status === "delivered" || code === "000") &&
          credentials &&
          (credentials.pin || credentials.cards?.length)
        ) {
          setSuccessModal({ visible: true, credentials });
        } else if (isProcessing && requestId) {
          pollStartRef.current = Date.now();
          setProcessingModal({
            visible: true,
            requestId,
            message:
              "Your purchase is being processed. We'll check the status shortly.",
          });
          pollStatus(requestId, true);
        } else if (status === "delivered" || code === "000") {
          setSuccessModal({ visible: true, credentials });
        } else {
          setSuccessModal({ visible: true, credentials });
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

  function handleSuccessClose() {
    setSuccessModal({ visible: false, credentials: null });
    resetStore();
    fetchHomepage();
    router.replace("/(app)/(tabs)");
  }

  if (!selectedProduct || !selectedVariation || !traits) return null;

  const productLabel = traits.shortLabel;
  const planName = selectedVariation.name;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <EducationHeader showMainTitle={false} title="Confirm & Pay" />

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
              <Text className="text-sm text-muted-foreground">Product</Text>
              <Text className="text-sm font-semibold text-foreground">
                {productLabel}
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
            {customerName && (
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">Student</Text>
                <Text className="text-sm font-medium text-foreground">
                  {customerName}
                </Text>
              </View>
            )}
            {storedBillersCode && (
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">
                  Profile ID
                </Text>
                <Text className="text-sm font-medium text-foreground">
                  {storedBillersCode}
                </Text>
              </View>
            )}
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">Price</Text>
              <Text
                className="text-base font-bold"
                style={{ color: colors.orange[600] }}
              >
                {formatNaira(variationAmount)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Quantity (WAEC only) */}
        {traits.hasQuantity && (
          <Animated.View
            entering={FadeInDown.delay(100).duration(300).springify().damping(15)}
            className="mt-6"
          >
            <Text className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Quantity
            </Text>
            <View className="flex-row items-center gap-4">
              <Pressable
                onPress={() => setQuantity(quantity - 1)}
                disabled={quantity <= 1}
                className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={quantity <= 1 ? colors.gray[300] : colors.gray[600]}
                />
              </Pressable>
              <Text className="text-lg font-bold text-foreground min-w-[32] text-center">
                {quantity}
              </Text>
              <Pressable
                onPress={() => setQuantity(quantity + 1)}
                disabled={quantity >= 10}
                className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={quantity >= 10 ? colors.gray[300] : colors.gray[600]}
                />
              </Pressable>
              {quantity > 1 && (
                <Text className="text-sm text-muted-foreground">
                  Total: {formatNaira(amount)}
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        {/* Phone number */}
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
                  if (phoneError) setPhoneError(undefined);
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
          {phoneError && (
            <Text className="mt-1 text-sm text-destructive">{phoneError}</Text>
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
      <ConfirmEducationModal
        visible={confirmModalVisible}
        onClose={() => setConfirmModalVisible(false)}
        productLabel={productLabel}
        serviceID={selectedProduct}
        planName={planName}
        phone={phone}
        amount={amount}
        quantity={quantity}
        customerName={customerName}
        profileId={storedBillersCode || undefined}
        cashbackBalance={cashbackBalance}
        cashbackToEarn={cashbackToEarn}
        useCashback={useCashback}
        onUseCashbackChange={setUseCashback}
        onConfirm={handleConfirmPurchase}
        purchasing={purchasing}
        walletBalance={walletBalance}
      />

      {/* Credential display */}
      <CredentialModal
        visible={successModal.visible}
        title={traits.successTitle}
        message={traits.successMessage}
        credentials={successModal.credentials}
        credentialType={traits.credentialType}
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
              router.replace("/(app)/vtpass/education");
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
            router.replace("/(app)/vtpass/education");
          }}
        />
      )}
    </SafeAreaView>
  );
}
