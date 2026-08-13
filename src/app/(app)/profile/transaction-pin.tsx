import { useEffect, useRef, useState, type ReactNode } from "react";
import { Keyboard, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  requestTransactionPinSetupOtp,
  requestTransactionPinUpdateOtp,
  verifyTransactionPinSetupOtp,
  verifyTransactionPinUpdateOtp,
  type TransactionPinOtpErrorData,
} from "@/api";
import {
  CodeSlots,
  Keypad,
  KeypadDock,
  useNumericInput,
} from "@/components/keypad";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast/toast-store";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useCompactScreen } from "@/hooks/use-compact-screen";
import { ApiClientError } from "@/lib/api";
import { formatCountdown } from "@/lib/format-countdown";
import { cn } from "@/lib/utils";
import { useHomepageStore, useProfileStore } from "@/store";

/**
 * Dedicated Transaction PIN screen (Profile → Security → Transaction PIN).
 *
 * Single place to create or change the 4-digit PIN. Two-step, OTP-gated:
 *   1. Enter the preferred 4-digit PIN → "Verify" requests an email OTP.
 *   2. Enter the 6-digit OTP → the PIN is persisted server-side.
 *
 * Input is driven entirely by the in-app numeric keypad (never the system
 * keyboard), so it is digits-only by construction and behaves identically on
 * every Android OEM. `mode` ("set" | "update") comes from the route params.
 */

const PIN_LENGTH = 4;
const OTP_LENGTH = 6;
/** Fallback used only when the server response is missing the `cooldown_ms` hint. */
const RESEND_COOLDOWN_FALLBACK_MS = 60 * 1000;

type Step = "pin" | "otp";

function readPinOtpErrorData(
  err: unknown,
): TransactionPinOtpErrorData | null {
  if (err instanceof ApiClientError && err.data && typeof err.data === "object") {
    return err.data as TransactionPinOtpErrorData;
  }
  return null;
}

export default function TransactionPinScreen() {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const compact = useCompactScreen();
  const showToast = useToastStore((s) => s.show);
  const params = useLocalSearchParams<{ mode?: string }>();
  const refreshHomepageSilently = useHomepageStore.use.refreshHomepageSilently();
  const fetchProfile = useProfileStore.use.fetchProfile();

  const isUpdate = params.mode === "update";

  // Pick the matching backend endpoints once per render. Both pairs share
  // the exact same response/error shapes so no other branching is needed.
  const requestOtpFn = isUpdate
    ? requestTransactionPinUpdateOtp
    : requestTransactionPinSetupOtp;
  const verifyOtpFn = isUpdate
    ? verifyTransactionPinUpdateOtp
    : verifyTransactionPinSetupOtp;

  const [step, setStep] = useState<Step>("pin");
  const [pinHidden, setPinHidden] = useState(true);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [otpExpired, setOtpExpired] = useState(false);
  const [resendOnCooldown, setResendOnCooldown] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorShakeKey, setErrorShakeKey] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const pinInput = useNumericInput({
    length: PIN_LENGTH,
    onChange: () => {
      if (error) setError(null);
    },
  });
  const otpInput = useNumericInput({
    length: OTP_LENGTH,
    onComplete: () => void handleConfirmOtp(),
    onChange: () => {
      if (error) setError(null);
    },
  });

  const pin = pinInput.value;
  const otp = otpInput.value;

  const canSubmitPin = pin.length === PIN_LENGTH && !requesting;
  const canSubmitOtp =
    otp.length === OTP_LENGTH && !verifying && !otpExpired && !submitted;

  function failError(message: string) {
    setError(message);
    setErrorShakeKey((k) => k + 1);
  }

  function applyOtpRequestError(err: unknown): string {
    const data = readPinOtpErrorData(err);
    if (data?.retry_after_seconds && data.retry_after_seconds > 0) {
      setResendAvailableAt(Date.now() + data.retry_after_seconds * 1000);
      setResendOnCooldown(true);
    }
    if (data?.message) return data.message;
    if (err instanceof ApiClientError) return err.message;
    return "Something went wrong. Please try again.";
  }

  async function handleVerifyPin() {
    if (!canSubmitPin) return;
    Keyboard.dismiss();
    setRequesting(true);
    setError(null);
    setAttemptsRemaining(null);
    try {
      const res = await requestOtpFn();
      const expires = res.data?.expires_at
        ? new Date(res.data.expires_at).getTime()
        : Date.now() + (res.data?.ttl_ms ?? 5 * 60 * 1000);
      const cooldownMs = res.data?.cooldown_ms ?? RESEND_COOLDOWN_FALLBACK_MS;
      setOtpExpiresAt(expires);
      setResendAvailableAt(Date.now() + cooldownMs);
      setOtpExpired(false);
      setResendOnCooldown(cooldownMs > 0);
      otpInput.clear();
      setStep("otp");
      showToast({
        variant: "success",
        title: "Verification code sent",
        message: res.message ?? "Check your email for the 6-digit code.",
      });
    } catch (err) {
      failError(applyOtpRequestError(err));
    } finally {
      setRequesting(false);
    }
  }

  async function handleConfirmOtp() {
    if (otp.length !== OTP_LENGTH || verifying || submitted) return;
    if (otpExpired) {
      failError("That code has expired. Tap resend to get a new one.");
      return;
    }
    if (otpExpiresAt != null && otpExpiresAt <= Date.now()) {
      setOtpExpired(true);
      failError("That code has expired. Tap resend to get a new one.");
      return;
    }
    Keyboard.dismiss();
    setVerifying(true);
    setError(null);
    try {
      await verifyOtpFn({ pin, otp });
      setSubmitted(true);
      showToast({
        variant: "success",
        title: isUpdate ? "Transaction PIN updated" : "Transaction PIN set",
        message: isUpdate
          ? "Your new 4-digit PIN is now active."
          : "Your account is now protected by your 4-digit PIN.",
      });
      setAttemptsRemaining(null);
      // Refresh the stores the dashboard / security screens read from so the
      // "PIN required" gate flips off the moment we navigate back.
      await Promise.all([refreshHomepageSilently(), fetchProfile()]);
      router.back();
    } catch (err) {
      const data = readPinOtpErrorData(err);
      const message =
        data?.message ??
        (err instanceof ApiClientError
          ? err.message
          : "We couldn't verify that code. Please try again.");

      if (typeof data?.attempts_remaining === "number") {
        setAttemptsRemaining(data.attempts_remaining);
      }

      if (data?.otp_invalidated || data?.attempts_remaining === 0) {
        otpInput.clear();
        pinInput.clear();
        setOtpExpiresAt(null);
        setOtpExpired(false);
        setStep("pin");
      } else {
        // Wrong code but still valid — wipe so the next try starts clean.
        otpInput.clear();
      }

      failError(message);
    } finally {
      setVerifying(false);
    }
  }

  /**
   * Escape hatch for users who realise they typed the wrong PIN before
   * confirming the OTP. Bounces back to step 1 with a clean PIN slate; the
   * resend cooldown is preserved so the rate limit still applies.
   */
  function handleChangePin() {
    setStep("pin");
    pinInput.clear();
    otpInput.clear();
    setOtpExpiresAt(null);
    setOtpExpired(false);
    setAttemptsRemaining(null);
    setError(null);
  }

  async function handleResendOtp() {
    if (resendOnCooldown) return;
    setRequesting(true);
    setError(null);
    setAttemptsRemaining(null);
    try {
      const res = await requestOtpFn();
      const expires = res.data?.expires_at
        ? new Date(res.data.expires_at).getTime()
        : Date.now() + (res.data?.ttl_ms ?? 5 * 60 * 1000);
      const cooldownMs = res.data?.cooldown_ms ?? RESEND_COOLDOWN_FALLBACK_MS;
      setOtpExpiresAt(expires);
      setResendAvailableAt(Date.now() + cooldownMs);
      otpInput.clear();
      setOtpExpired(false);
      setResendOnCooldown(cooldownMs > 0);
      showToast({
        variant: "success",
        title: "Code resent",
        message: res.message ?? "A new 6-digit code has been emailed to you.",
      });
    } catch (err) {
      failError(applyOtpRequestError(err));
    } finally {
      setRequesting(false);
    }
  }

  const bg = isDark ? "#0F172A" : "#F8F9FB";
  const cardBg = isDark ? "#1E293B" : "#FFFFFF";
  const subtleText = isDark ? "#94A3B8" : "#6B7280";
  const disabledBtnBg = isDark ? "#334155" : "#E5E7EB";
  const disabledBtnText = isDark ? "#94A3B8" : "#9CA3AF";
  const busy = requesting || verifying || submitted;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: bg }}>
        <View
          className="flex-row items-center justify-between px-5 pb-3"
          style={{ paddingTop: Math.max(insets.top, compact ? 8 : 16) + (compact ? 6 : 20) }}
        >
          <Pressable
            onPress={() => router.back()}
            disabled={requesting || verifying}
            className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6" }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={20} color={isDark ? "#E5E7EB" : "#111827"} />
          </Pressable>
          <Text className="text-base font-semibold text-foreground">
            Transaction PIN
          </Text>
          <View className="h-9 w-9" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            className={
              compact
                ? "mt-2 overflow-hidden rounded-3xl px-5 pb-5 pt-5"
                : "mt-4 overflow-hidden rounded-3xl px-5 pb-6 pt-6"
            }
            style={{ backgroundColor: cardBg }}
          >
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Ionicons name="shield-checkmark" size={26} color={colors.orange[500]} />
            </View>

            <Text className={compact ? "mt-3 text-lg font-semibold text-foreground" : "mt-4 text-xl font-semibold text-foreground"}>
              {step === "pin"
                ? isUpdate
                  ? "Update your transaction PIN"
                  : "Set your transaction PIN"
                : "Verify it's you"}
            </Text>
            <Text className="mt-1.5 text-sm leading-5" style={{ color: subtleText }}>
              {step === "pin"
                ? isUpdate
                  ? "Choose a new 4-digit transaction PIN. Your current PIN stays active until you finish verification."
                  : "Choose a 4-digit PIN you'll use to approve payments and protect your account from unauthorised transactions."
                : "We emailed you a 6-digit code. Enter it to confirm your PIN."}
            </Text>

            {/* Step 1 — PIN entry */}
            {step === "pin" ? (
              <View className={compact ? "mt-5" : "mt-6"}>
                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: subtleText }}
                  >
                    4-digit PIN
                  </Text>
                  <Pressable
                    onPress={() => setPinHidden((v) => !v)}
                    hitSlop={8}
                    className="flex-row items-center gap-1.5 active:opacity-70"
                    accessibilityRole="button"
                    accessibilityLabel={pinHidden ? "Show PIN" : "Hide PIN"}
                  >
                    <Ionicons
                      name={pinHidden ? "eye-off-outline" : "eye-outline"}
                      size={16}
                      color={subtleText}
                    />
                    <Text className="text-xs font-medium" style={{ color: subtleText }}>
                      {pinHidden ? "Show" : "Hide"}
                    </Text>
                  </Pressable>
                </View>

                <CodeSlots
                  value={pin}
                  length={PIN_LENGTH}
                  secure={pinHidden}
                  focused={!requesting}
                  error={Boolean(error)}
                  shakeKey={errorShakeKey}
                  slotHeight={compact ? 50 : 56}
                  maxSlotWidth={64}
                  style={{ marginTop: 14 }}
                  accessibilityLabel="Transaction PIN"
                />
              </View>
            ) : null}

            {/* Step 2 — OTP entry */}
            {step === "otp" ? (
              <View className={compact ? "mt-5" : "mt-6"}>
                <CodeSlots
                  value={otp}
                  length={OTP_LENGTH}
                  focused={!verifying}
                  error={Boolean(error)}
                  shakeKey={errorShakeKey}
                  slotHeight={compact ? 46 : 52}
                  accessibilityLabel="Email verification code"
                />

                <View className="mt-4 flex-row items-center justify-between">
                  {otpExpiresAt != null ? (
                    <Countdown
                      until={otpExpiresAt}
                      onComplete={() => setOtpExpired(true)}
                    >
                      {(secondsLeft) => (
                        <Text
                          className="text-xs font-medium"
                          style={{ color: secondsLeft <= 0 ? "#DC2626" : subtleText }}
                        >
                          {secondsLeft <= 0
                            ? "Code expired"
                            : `Expires in ${formatCountdown(secondsLeft)}`}
                        </Text>
                      )}
                    </Countdown>
                  ) : (
                    <View />
                  )}

                  <Pressable
                    onPress={handleResendOtp}
                    disabled={requesting || verifying || resendOnCooldown}
                    hitSlop={8}
                    className="active:opacity-70"
                    accessibilityRole="button"
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{
                        color:
                          requesting || verifying || resendOnCooldown
                            ? subtleText
                            : colors.orange[500],
                      }}
                    >
                      {requesting ? (
                        "Sending…"
                      ) : resendAvailableAt != null && resendOnCooldown ? (
                        <Countdown
                          until={resendAvailableAt}
                          onComplete={() => setResendOnCooldown(false)}
                        >
                          {(secondsLeft) =>
                            secondsLeft > 0
                              ? `Resend in ${formatCountdown(secondsLeft)}`
                              : "Resend code"
                          }
                        </Countdown>
                      ) : (
                        "Resend code"
                      )}
                    </Text>
                  </Pressable>
                </View>

                {attemptsRemaining != null && attemptsRemaining > 0 ? (
                  <Text className="mt-2 text-xs font-medium" style={{ color: "#F59E0B" }}>
                    {attemptsRemaining}{" "}
                    {attemptsRemaining === 1 ? "attempt" : "attempts"} left before
                    this code is invalidated.
                  </Text>
                ) : null}
              </View>
            ) : null}

            {error ? (
              <Text className="mt-4 text-sm font-medium text-destructive">
                {error}
              </Text>
            ) : null}

            {/* Action row */}
            <View className={compact ? "mt-6" : "mt-7"}>
              {step === "pin" ? (
                <Pressable
                  onPress={handleVerifyPin}
                  disabled={!canSubmitPin}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canSubmitPin }}
                  className={cn(
                    "h-12 w-full flex-row items-center justify-center rounded-2xl",
                    canSubmitPin && "active:opacity-90",
                  )}
                  style={{
                    backgroundColor: canSubmitPin ? colors.orange[500] : disabledBtnBg,
                  }}
                >
                  {requesting ? (
                    <Spinner color="#FFFFFF" />
                  ) : (
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: canSubmitPin ? "#FFFFFF" : disabledBtnText }}
                    >
                      Verify
                    </Text>
                  )}
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={handleConfirmOtp}
                    disabled={!canSubmitOtp}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canSubmitOtp }}
                    className={cn(
                      "h-12 w-full flex-row items-center justify-center rounded-2xl",
                      canSubmitOtp && "active:opacity-90",
                    )}
                    style={{
                      backgroundColor: canSubmitOtp ? colors.orange[500] : disabledBtnBg,
                    }}
                  >
                    {verifying ? (
                      <Spinner color="#FFFFFF" />
                    ) : (
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: canSubmitOtp ? "#FFFFFF" : disabledBtnText }}
                      >
                        Confirm PIN
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={handleChangePin}
                    disabled={requesting || verifying}
                    hitSlop={8}
                    className="mt-4 self-center active:opacity-70"
                    accessibilityRole="button"
                    accessibilityLabel="Change 4-digit PIN"
                  >
                    <Text className="text-xs font-medium" style={{ color: subtleText }}>
                      Wrong PIN?{" "}
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: colors.orange[500] }}
                      >
                        Change 4-digit PIN
                      </Text>
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Docked numeric keypad — drives whichever step is active. */}
        <KeypadDock secure title="SmiPay Secure Keypad">
          <Keypad
            controller={step === "pin" ? pinInput : otpInput}
            disabled={busy}
            backspaceBehavior="clear"
          />
        </KeypadDock>
      </View>
    </>
  );
}

interface CountdownProps {
  /** Absolute epoch ms the countdown targets. */
  until: number;
  /** Fired exactly once when the countdown first reaches zero. */
  onComplete?: () => void;
  /** Render the remaining whole seconds. */
  children: (secondsLeft: number) => ReactNode;
}

/**
 * Self-contained 1-Hz countdown. Owning its own `setInterval` keeps the
 * per-second re-render isolated to this tiny node instead of the whole screen.
 */
function Countdown({ until, onComplete, children }: CountdownProps) {
  const compute = () => Math.max(0, Math.ceil((until - Date.now()) / 1000));
  const [secondsLeft, setSecondsLeft] = useState(compute);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let completed = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0 && !completed) {
        completed = true;
        onCompleteRef.current?.();
        return true;
      }
      return false;
    };
    if (tick()) return;
    const id = setInterval(() => {
      if (tick()) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  return <>{children(secondsLeft)}</>;
}
