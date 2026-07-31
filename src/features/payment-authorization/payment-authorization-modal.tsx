import { useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, View } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  CodeSlots,
  Keypad,
  KeypadDock,
  useNumericInput,
  type KeypadColorOverrides,
} from "@/components/keypad";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Spinner } from "@/components/ui/loaders";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useCompactScreen } from "@/hooks/use-compact-screen";
import {
  getBiometricLabel,
  getBiometricsAvailability,
} from "@/lib/biometrics";

import { purchaseAuthPinErrorMessage } from "./use-authorize-purchase";

const PIN_LENGTH = 4;

export interface PaymentAuthorizationModalProps {
  visible: boolean;
  onClose: () => void;
  showRetryBiometrics: boolean;
  isBusy: boolean;
  /** Server-side PIN check only; must throw on failure. */
  onVerifyPin: (pin: string) => Promise<void>;
  /** After PIN verified: close UI and run the pending purchase (usually swallows its own errors). */
  onCompletePayment: () => Promise<void>;
  onRetryBiometrics: () => Promise<void>;
  /** Forgot PIN — e.g. close sheets and open Profile → Security */
  onForgotPinPress?: () => void;
}

export function PaymentAuthorizationModal({
  visible,
  onClose,
  showRetryBiometrics,
  isBusy,
  onVerifyPin,
  onCompletePayment,
  onRetryBiometrics,
  onForgotPinPress,
}: PaymentAuthorizationModalProps) {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const compact = useCompactScreen();

  const [pinError, setPinError] = useState<string | null>(null);
  const [errorShakeKey, setErrorShakeKey] = useState(0);
  const [biometricLabel, setBiometricLabel] = useState("Biometrics");
  const [pinFlowBusy, setPinFlowBusy] = useState(false);

  const keypadColors = useMemo<KeypadColorOverrides>(
    () => ({
      accent: colors.green[500],
      filled: isDark ? "#F8FAFC" : "#0F172A",
    }),
    [isDark],
  );

  const pinInput = useNumericInput({
    length: PIN_LENGTH,
    onChange: () => {
      if (pinError) setPinError(null);
    },
  });

  const panelBg = isDark ? "#1C1C1E" : "#FFFFFF";

  useEffect(() => {
    let cancelled = false;
    if (visible && showRetryBiometrics) {
      void getBiometricsAvailability().then((a) => {
        if (!cancelled) setBiometricLabel(getBiometricLabel(a));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [visible, showRetryBiometrics]);

  useEffect(() => {
    if (!visible) {
      pinInput.clear();
      setPinError(null);
      setPinFlowBusy(false);
      setErrorShakeKey(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when sheet closes
  }, [visible]);

  async function submitPinEntry() {
    const pin = pinInput.value;
    if (pin.length !== PIN_LENGTH) {
      setPinError("Enter your 4-digit transaction PIN.");
      setErrorShakeKey((k) => k + 1);
      return;
    }
    setPinError(null);
    setPinFlowBusy(true);
    try {
      try {
        await onVerifyPin(pin);
        pinInput.clear();
      } catch (e) {
        pinInput.clear();
        setPinError(purchaseAuthPinErrorMessage(e));
        setErrorShakeKey((k) => k + 1);
        return;
      }
      await onCompletePayment();
    } finally {
      setPinFlowBusy(false);
    }
  }

  const canDismiss = useMemo(() => !isBusy && !pinFlowBusy, [isBusy, pinFlowBusy]);
  const keypadLocked = isBusy || pinFlowBusy;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => canDismiss && onClose()}
      statusBarTranslucent
      navigationBarTranslucent={Platform.OS === "android"}
    >
      {/*
       * In-app keypad instead of the system keyboard — budget Android OEMs often
       * fail to resize RN Modals when the soft keyboard opens, which hid the PIN
       * slots and "Verify and pay" behind the keyboard. Same approach as
       * Profile → Transaction PIN and the lock screen.
       */}
      <SafeAreaProvider>
        <View className="flex-1 justify-end">
          <Pressable
            className="absolute inset-0 bg-black/55"
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            disabled={!canDismiss}
            onPress={() => canDismiss && onClose()}
          />

          <View
            style={{
              backgroundColor: panelBg,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: compact ? "96%" : "92%",
            }}
          >
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingTop: compact ? 12 : 16,
                paddingBottom: compact ? 8 : 12,
              }}
            >
              <View className="flex-row items-center px-4 pb-2">
                <Pressable
                  disabled={!canDismiss}
                  onPress={onClose}
                  hitSlop={14}
                  className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                    opacity: canDismiss ? 1 : 0.35,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={22} color={isDark ? "#E5E7EB" : "#374151"} />
                </Pressable>
                <Text className="flex-1 text-center text-lg font-semibold text-foreground pr-11">
                  Enter payment PIN
                </Text>
              </View>

              <Text className="px-5 pb-3 text-center text-sm text-muted-foreground">
                Use your 4-digit SmiPay transaction PIN to authorize this payment.
              </Text>

              {showRetryBiometrics ? (
                <>
                  <View className="px-4">
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl"
                      disabled={keypadLocked}
                      onPress={() => void onRetryBiometrics()}
                    >
                      {isBusy ? (
                        <Spinner color={colors.green[500]} size="small" />
                      ) : (
                        <View className="flex-row items-center gap-2">
                          <Ionicons
                            name="finger-print-outline"
                            size={20}
                            color={colors.green[500]}
                          />
                          <Text className="text-sm font-semibold text-foreground">
                            Retry {biometricLabel}
                          </Text>
                        </View>
                      )}
                    </Button>
                  </View>
                  <View className="my-3 flex-row items-center gap-2 px-6">
                    <View className="h-px flex-1 bg-border" />
                    <Text className="text-xs uppercase text-muted-foreground">or enter PIN</Text>
                    <View className="h-px flex-1 bg-border" />
                  </View>
                </>
              ) : null}

              <CodeSlots
                value={pinInput.value}
                length={PIN_LENGTH}
                variant="box"
                secure
                focused={!keypadLocked}
                error={Boolean(pinError)}
                shakeKey={errorShakeKey}
                slotHeight={compact ? 46 : 52}
                maxSlotWidth={compact ? 52 : 56}
                colors={keypadColors}
                scheme={isDark ? "dark" : "light"}
                accessibilityLabel="Transaction PIN, 4 digits"
                style={{ paddingHorizontal: 24, marginBottom: compact ? 8 : 12 }}
              />

              {onForgotPinPress ? (
                <Pressable
                  onPress={onForgotPinPress}
                  disabled={keypadLocked}
                  className="items-center py-1 active:opacity-70"
                  accessibilityRole="link"
                  accessibilityLabel="Forgot transaction PIN"
                >
                  <Text style={{ color: colors.green[600] }} className="text-sm font-medium">
                    Forgot transaction PIN?
                  </Text>
                </Pressable>
              ) : (
                <View className="h-1" />
              )}

              {pinError ? (
                <Text className="mt-2 px-6 text-center text-sm text-destructive">{pinError}</Text>
              ) : null}

              <View className="mt-3 px-4">
                <Button
                  className="h-12 w-full rounded-xl"
                  style={{ backgroundColor: colors.green[500] }}
                  disabled={keypadLocked || pinInput.value.length !== PIN_LENGTH}
                  onPress={() => void submitPinEntry()}
                >
                  {pinFlowBusy ? (
                    <Spinner color="#fff" size="small" />
                  ) : (
                    <Text className="text-base font-semibold text-white">Verify and pay</Text>
                  )}
                </Button>
              </View>
            </ScrollView>

            <KeypadDock
              secure
              title="SmiPay Secure Keypad"
              colors={keypadColors}
              scheme={isDark ? "dark" : "light"}
              animated={false}
              bottomPadding={compact ? 4 : 8}
              style={{
                backgroundColor: panelBg,
                paddingBottom: Math.max(insets.bottom, compact ? 6 : 10),
              }}
            >
              <Keypad
                controller={pinInput}
                disabled={keypadLocked}
                colors={keypadColors}
                scheme={isDark ? "dark" : "light"}
                backspaceBehavior="clear"
              />
            </KeypadDock>
          </View>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}
