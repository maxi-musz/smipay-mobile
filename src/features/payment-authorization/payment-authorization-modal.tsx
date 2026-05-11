import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { NumericKeypad } from "@/components/ui/numeric-keypad";
import { Text } from "@/components/ui/text";
import { Spinner } from "@/components/ui/loaders";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
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

  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [biometricLabel, setBiometricLabel] = useState("Biometrics");
  const [pinFlowBusy, setPinFlowBusy] = useState(false);

  const panelBg = isDark ? "#1C1C1E" : "#FFFFFF";
  const slotBorderIdle = isDark ? "#3A3A3C" : "#E5E7EB";
  const slotActive = colors.green[500];

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
      setPin("");
      setPinError(null);
      setPinFlowBusy(false);
    }
  }, [visible]);

  function appendDigit(d: string) {
    if (pin.length >= PIN_LENGTH || isBusy || pinFlowBusy) return;
    const next = `${pin}${d}`.slice(0, PIN_LENGTH);
    setPin(next);
    if (pinError) setPinError(null);
  }

  function deleteDigit() {
    if (isBusy || pinFlowBusy) return;
    setPin((p) => p.slice(0, -1));
    if (pinError) setPinError(null);
  }

  async function submitPinEntry() {
    if (pin.length !== PIN_LENGTH) {
      setPinError("Enter your 4-digit transaction PIN.");
      return;
    }
    setPinError(null);
    setPinFlowBusy(true);
    try {
      try {
        await onVerifyPin(pin);
        setPin("");
      } catch (e) {
        setPinError(purchaseAuthPinErrorMessage(e));
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
    >
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
            paddingBottom: Math.max(insets.bottom, 12),
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        >
          <View className="flex-row items-center px-4 pb-2 pt-4">
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

          <Text className="px-5 pb-4 text-center text-sm text-muted-foreground">
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
              <View className="my-4 flex-row items-center gap-2 px-6">
                <View className="h-px flex-1 bg-border" />
                <Text className="text-xs uppercase text-muted-foreground">or enter PIN</Text>
                <View className="h-px flex-1 bg-border" />
              </View>
            </>
          ) : null}

          {/* OPay-style 4 boxed slots */}
          <View className="flex-row justify-center gap-3 px-6 pb-3">
            {Array.from({ length: PIN_LENGTH }).map((_, i) => {
              const digit = pin[i];
              const isActive = pin.length === i;
              return (
                <View
                  key={i}
                  style={{
                    height: 52,
                    width: 52,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: isActive ? slotActive : slotBorderIdle,
                    backgroundColor: isDark ? "#2C2C2E" : "#F9FAFB",
                  }}
                  className="items-center justify-center"
                >
                  {digit ? (
                    <Text
                      className="text-xl font-semibold tabular-nums"
                      style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}
                    >
                      •
                    </Text>
                  ) : isActive ? (
                    <View
                      className="h-5 w-0.5 rounded-full"
                      style={{ backgroundColor: slotActive }}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>

          {onForgotPinPress ? (
            <Pressable
              onPress={onForgotPinPress}
              disabled={keypadLocked}
              className="items-center py-2 active:opacity-70"
              accessibilityRole="link"
              accessibilityLabel="Forgot transaction PIN"
            >
              <Text style={{ color: colors.green[600] }} className="text-sm font-medium">
                Forgot transaction PIN?
              </Text>
            </Pressable>
          ) : (
            <View className="h-2" />
          )}

          <View
            className="mx-4 mt-2 flex-row items-center justify-center gap-2 rounded-xl py-2"
            style={{
              backgroundColor: isDark ? "rgba(34,197,94,0.12)" : "rgba(22,163,74,0.08)",
            }}
          >
            <Ionicons name="shield-checkmark" size={18} color={colors.green[600]} />
            <Text className="text-xs font-medium text-muted-foreground">
              SmiPay secure numeric keypad
            </Text>
          </View>

          <NumericKeypad
            disabled={keypadLocked}
            className="px-4 pt-4"
            keyHeight={56}
            onDigitPress={appendDigit}
            onBackspacePress={deleteDigit}
          />

          {pinError ? (
            <Text className="mt-3 px-6 text-center text-sm text-destructive">{pinError}</Text>
          ) : null}

          <View className="mt-4 px-4">
            <Button
              className="h-12 w-full rounded-xl"
              style={{ backgroundColor: colors.green[500] }}
              disabled={keypadLocked || pin.length !== PIN_LENGTH}
              onPress={() => void submitPinEntry()}
            >
              {pinFlowBusy ? (
                <Spinner color="#fff" size="small" />
              ) : (
                <Text className="text-base font-semibold text-white">Verify and pay</Text>
              )}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
