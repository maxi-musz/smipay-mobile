import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  requestTransactionPinSetupOtp,
  requestTransactionPinUpdateOtp,
  verifyTransactionPinSetupOtp,
  verifyTransactionPinUpdateOtp,
  type TransactionPinOtpErrorData,
} from "@/api";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast/toast-store";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import { ApiClientError } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Modal that powers the OTP-gated 4-digit transaction PIN flow.
 *
 * Supports two modes:
 *   - `"set"`     → first-time setup. Used compulsorily on the dashboard
 *                   when `is_four_digit_pin_set === false`.
 *   - `"update"`  → change an existing PIN. Triggered from Profile → Security.
 *
 * Each mode hits its own backend endpoints but shares the entire UI, error
 * handling, and cooldown logic. `dismissable` controls whether the user can
 * close the modal (compulsory dashboard usage stays non-dismissable).
 */
interface SetTransactionPinModalProps {
  visible: boolean;
  /** Defaults to `"set"` to preserve the legacy dashboard behaviour. */
  mode?: "set" | "update";
  /**
   * When `true`, the user can dismiss via close button / backdrop / hardware
   * back. Defaults to `false` for the mandatory dashboard flow.
   */
  dismissable?: boolean;
  /** Called when the user dismisses the modal (only when `dismissable`). */
  onClose?: () => void;
  /** Called once the PIN has been verified and persisted server-side. */
  onSuccess?: () => void | Promise<void>;
}

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

export function SetTransactionPinModal({
  visible,
  mode = "set",
  dismissable = false,
  onClose,
  onSuccess,
}: SetTransactionPinModalProps) {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.show);

  const isUpdate = mode === "update";

  // Pick the matching backend endpoints once per render. Both pairs share
  // the exact same response/error shapes so no other branching is needed.
  const requestOtpFn = isUpdate
    ? requestTransactionPinUpdateOtp
    : requestTransactionPinSetupOtp;
  const verifyOtpFn = isUpdate
    ? verifyTransactionPinUpdateOtp
    : verifyTransactionPinSetupOtp;

  const [step, setStep] = useState<Step>("pin");
  const [pin, setPin] = useState("");
  const [otp, setOtp] = useState("");
  const [pinHidden, setPinHidden] = useState(true);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  /**
   * Whether the current OTP TTL / resend cooldown have elapsed. These are kept
   * as state (flipped once via the isolated `Countdown` ticker below) so the
   * whole modal doesn't re-render every second while a code is pending.
   */
  const [otpExpired, setOtpExpired] = useState(false);
  const [resendOnCooldown, setResendOnCooldown] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Inline non-error feedback (e.g. "3 attempts left after a wrong code"). */
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  /** Shows the in-card "Change your PIN?" confirmation overlay. */
  const [changePinConfirmOpen, setChangePinConfirmOpen] = useState(false);

  const pinInputRef = useRef<TextInput>(null);
  const otpInputRef = useRef<TextInput>(null);

  // Reset internal state every time the modal closes so the next open is fresh.
  useEffect(() => {
    if (!visible) {
      setStep("pin");
      setPin("");
      setOtp("");
      setPinHidden(true);
      setOtpExpiresAt(null);
      setResendAvailableAt(null);
      setOtpExpired(false);
      setResendOnCooldown(false);
      setAttemptsRemaining(null);
      setError(null);
      setRequesting(false);
      setVerifying(false);
      setChangePinConfirmOpen(false);
    }
  }, [visible]);

  // Auto-focus the active input when the step changes.
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      if (step === "pin") {
        pinInputRef.current?.focus();
      } else {
        otpInputRef.current?.focus();
      }
    }, 220);
    return () => clearTimeout(t);
  }, [visible, step]);

  const canSubmitPin = pin.length === PIN_LENGTH && !requesting;
  const canSubmitOtp = otp.length === OTP_LENGTH && !verifying && !otpExpired;

  function handlePinChange(value: string) {
    if (step !== "pin") return;
    const digitsOnly = value.replace(/\D/g, "").slice(0, PIN_LENGTH);
    setPin(digitsOnly);
    if (error) setError(null);
  }

  function handleOtpChange(value: string) {
    const digitsOnly = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtp(digitsOnly);
    if (error) setError(null);
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
      setStep("otp");
      showToast({
        variant: "success",
        title: "Verification code sent",
        message: res.message ?? "Check your email for the 6-digit code.",
      });
    } catch (err) {
      setError(applyOtpRequestError(err));
    } finally {
      setRequesting(false);
    }
  }

  async function handleConfirmOtp() {
    if (!canSubmitOtp) return;
    // Lazy expiry guard: the isolated Countdown flips `otpExpired` on the tick
    // it reaches zero, but re-check against the wall clock here in case the
    // press lands in the same frame the code lapses.
    if (otpExpiresAt != null && otpExpiresAt <= Date.now()) {
      setOtpExpired(true);
      setError("That code has expired. Tap resend to get a new one.");
      return;
    }
    Keyboard.dismiss();
    setVerifying(true);
    setError(null);
    try {
      await verifyOtpFn({ pin, otp });
      showToast({
        variant: "success",
        title: isUpdate ? "Transaction PIN updated" : "Transaction PIN set",
        message: isUpdate
          ? "Your new 4-digit PIN is now active."
          : "Your purchases are now protected by your 4-digit PIN.",
      });
      setAttemptsRemaining(null);
      await onSuccess?.();
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
        setOtp("");
        setOtpExpiresAt(null);
        setOtpExpired(false);
        setStep("pin");
      }

      setError(message);
    } finally {
      setVerifying(false);
    }
  }

  function openChangePinConfirm() {
    Keyboard.dismiss();
    setError(null);
    setChangePinConfirmOpen(true);
  }

  function cancelChangePinConfirm() {
    setChangePinConfirmOpen(false);
  }

  /**
   * User confirmed they want to enter a different PIN. We bounce them back to
   * step 1 with a clean PIN slate. The pending email OTP is dropped from the
   * UI; the existing resend cooldown is preserved so the rate limit still
   * applies if they immediately tap Verify again.
   */
  function handleConfirmChangePin() {
    setChangePinConfirmOpen(false);
    setStep("pin");
    setPin("");
    setOtp("");
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
      setOtp("");
      setOtpExpired(false);
      setResendOnCooldown(cooldownMs > 0);
      showToast({
        variant: "success",
        title: "Code resent",
        message: res.message ?? "A new 6-digit code has been emailed to you.",
      });
    } catch (err) {
      setError(applyOtpRequestError(err));
    } finally {
      setRequesting(false);
    }
  }

  const cardBg = isDark ? "#0F172A" : "#FFFFFF";
  const slotBorder = isDark ? "#334155" : "#D1D5DB";
  const slotActive = colors.orange[500];
  const subtleText = isDark ? "#94A3B8" : "#6B7280";

  /**
   * Closing is only allowed when explicitly opted-in via `dismissable`. The
   * dashboard usage stays mandatory, while the security-screen usage is
   * cancellable from any of: hardware back, backdrop press, or the close (X)
   * button. While a network call is in flight, dismissal is ignored to keep
   * the request → response cycle consistent.
   */
  function handleDismiss() {
    if (!dismissable) return;
    if (requesting || verifying) return;
    Keyboard.dismiss();
    onClose?.();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={dismissable ? handleDismiss : () => {}}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        className="flex-1 justify-end"
      >
        {dismissable ? (
          <Pressable
            className="absolute inset-0 bg-black/70"
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        ) : (
          <View className="absolute inset-0 bg-black/70" />
        )}

        <View
          style={{
            backgroundColor: cardBg,
            paddingBottom: Math.max(insets.bottom, 16),
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
          }}
          className="px-6 pt-3 shadow-2xl"
        >
          {/* Grab handle — only in dismissable mode; hidden when setup is
              required so it doesn't hint at a swipe-to-close that won't work. */}
          {dismissable ? (
            <View className="mb-2 items-center pb-1">
              <View
                className="h-1 w-10 rounded-full"
                style={{ backgroundColor: isDark ? "#334155" : "#E5E7EB" }}
              />
            </View>
          ) : (
            <View className="pt-1" />
          )}

          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Ionicons
                name="shield-checkmark"
                size={26}
                color={colors.orange[500]}
              />
            </View>
            <View className="flex-1">
              {!dismissable ? (
                <View
                  className="self-start rounded-full px-2 py-0.5"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(245,131,32,0.16)"
                      : "rgba(245,131,32,0.12)",
                  }}
                >
                  <Text
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: colors.orange[500] }}
                  >
                    Required
                  </Text>
                </View>
              ) : null}
            </View>
            {dismissable ? (
              <Pressable
                onPress={handleDismiss}
                disabled={requesting || verifying}
                hitSlop={10}
                className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
                style={{
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(15,23,42,0.06)",
                }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={isDark ? "#E5E7EB" : "#1F2937"}
                />
              </Pressable>
            ) : null}
          </View>

          <Text className="mt-4 text-xl font-semibold text-foreground">
            {changePinConfirmOpen
              ? "Change your PIN?"
              : step === "pin"
                ? isUpdate
                  ? "Update your transaction PIN"
                  : "Add a security layer to your account"
                : "Verify it's you"}
          </Text>
          <Text
            className="mt-1.5 text-sm leading-5"
            style={{ color: subtleText }}
          >
            {changePinConfirmOpen
              ? "We'll send you a new 6-digit code so you can confirm a different PIN. The code we just emailed will no longer be needed."
              : step === "pin"
                ? isUpdate
                  ? "Choose a new 4-digit transaction PIN. Your current PIN stays active until you finish verification."
                  : "Set a 4-digit PIN to authorize purchases. Required to continue."
                : "We emailed you a 6-digit code. Enter it to confirm your new PIN."}
          </Text>

          {/* PIN — full slot UI on step 1, hidden on step 2 / confirm view. */}
          {!changePinConfirmOpen && step === "pin" ? (
            <View className="mt-6">
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
                  <Text
                    className="text-xs font-medium"
                    style={{ color: subtleText }}
                  >
                    {pinHidden ? "Show" : "Hide"}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => pinInputRef.current?.focus()}
                className="mt-3 flex-row items-end justify-between"
              >
                {Array.from({ length: PIN_LENGTH }).map((_, i) => {
                  const digit = pin[i];
                  const isActive = pin.length === i;
                  const filled = !!digit;
                  return (
                    <View
                      key={i}
                      style={{
                        borderBottomColor: isActive ? slotActive : slotBorder,
                        borderBottomWidth: 2,
                        width: 56,
                        height: 56,
                      }}
                      className="items-center justify-center"
                    >
                      <Text
                        className="text-2xl font-semibold"
                        style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}
                      >
                        {filled ? (pinHidden ? "•" : digit) : ""}
                      </Text>
                    </View>
                  );
                })}
              </Pressable>

              {/* Off-screen input that drives the PIN slots. */}
              <TextInput
                ref={pinInputRef}
                value={pin}
                onChangeText={handlePinChange}
                keyboardType="number-pad"
                maxLength={PIN_LENGTH}
                caretHidden
                autoComplete="off"
                importantForAutofill="no"
                textContentType="oneTimeCode"
                style={{
                  position: "absolute",
                  opacity: 0,
                  height: 1,
                  width: 1,
                }}
                accessibilityLabel="Transaction PIN"
              />
            </View>
          ) : null}

          {/* OTP input — appears only on step 2 outside the confirm view. */}
          {!changePinConfirmOpen && step === "otp" ? (
            <View className="mt-6">
              <Pressable
                onPress={() => otpInputRef.current?.focus()}
                className="flex-row items-center justify-between"
              >
                {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                  const digit = otp[i];
                  const isActive = otp.length === i;
                  return (
                    <View
                      key={i}
                      style={{
                        borderBottomColor: isActive ? slotActive : slotBorder,
                        borderBottomWidth: 2,
                        width: 40,
                        height: 52,
                      }}
                      className="items-center justify-center"
                    >
                      <Text
                        className="text-xl font-semibold"
                        style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}
                      >
                        {digit ?? ""}
                      </Text>
                    </View>
                  );
                })}
              </Pressable>

              <TextInput
                ref={otpInputRef}
                value={otp}
                onChangeText={handleOtpChange}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                caretHidden
                autoComplete="off"
                importantForAutofill="no"
                textContentType="none"
                style={{
                  position: "absolute",
                  opacity: 0,
                  height: 1,
                  width: 1,
                }}
                accessibilityLabel="Email verification code"
              />

              {/* Single meta row: TTL on the left, resend control on the right. */}
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
                          secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"
                        }
                      </Countdown>
                    ) : (
                      "Resend code"
                    )}
                  </Text>
                </Pressable>
              </View>

              {attemptsRemaining != null && attemptsRemaining > 0 ? (
                <Text
                  className="mt-2 text-xs font-medium"
                  style={{ color: "#F59E0B" }}
                >
                  {attemptsRemaining}{" "}
                  {attemptsRemaining === 1 ? "attempt" : "attempts"} left before
                  this code is invalidated.
                </Text>
              ) : null}
            </View>
          ) : null}

          {!changePinConfirmOpen && error ? (
            <Text className="mt-4 text-sm font-medium text-destructive">
              {error}
            </Text>
          ) : null}

          {/*
           * Action row. The setup is required, so there is no cancel/secondary
           * button — the only path forward is completing both steps. The only
           * exception is the inline "Change your PIN?" confirmation, which has
           * its own pair of side-by-side actions.
           */}
          <View className="mt-7">
            {changePinConfirmOpen ? (
              <View className="flex-row gap-3">
                <Pressable
                  onPress={cancelChangePinConfirm}
                  accessibilityRole="button"
                  className="h-12 flex-1 flex-row items-center justify-center rounded-2xl border active:opacity-80"
                  style={{
                    borderColor: isDark ? "#334155" : "#E5E7EB",
                  }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}
                  >
                    Keep this PIN
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmChangePin}
                  accessibilityRole="button"
                  className="h-12 flex-1 flex-row items-center justify-center rounded-2xl active:opacity-90"
                  style={{ backgroundColor: colors.orange[500] }}
                >
                  <Text className="text-sm font-semibold text-white">
                    Change PIN
                  </Text>
                </Pressable>
              </View>
            ) : step === "pin" ? (
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
                  backgroundColor: canSubmitPin
                    ? colors.orange[500]
                    : isDark
                      ? "#334155"
                      : "#E5E7EB",
                }}
              >
                {requesting ? (
                  <Spinner color="#FFFFFF" />
                ) : (
                  <Text
                    className="text-sm font-semibold"
                    style={{
                      color: canSubmitPin
                        ? "#FFFFFF"
                        : isDark
                          ? "#94A3B8"
                          : "#9CA3AF",
                    }}
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
                    backgroundColor: canSubmitOtp
                      ? colors.orange[500]
                      : isDark
                        ? "#334155"
                        : "#E5E7EB",
                  }}
                >
                  {verifying ? (
                    <Spinner color="#FFFFFF" />
                  ) : (
                    <Text
                      className="text-sm font-semibold"
                      style={{
                        color: canSubmitOtp
                          ? "#FFFFFF"
                          : isDark
                            ? "#94A3B8"
                            : "#9CA3AF",
                      }}
                    >
                      Confirm PIN
                    </Text>
                  )}
                </Pressable>

                {/*
                 * Subtle escape hatch for users who realise they entered the
                 * wrong PIN before confirming the OTP. Centered and quiet so
                 * it doesn't compete with the primary action.
                 */}
                <Pressable
                  onPress={openChangePinConfirm}
                  disabled={requesting || verifying}
                  hitSlop={8}
                  className="mt-4 self-center active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel="Change 4-digit PIN"
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: subtleText }}
                  >
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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
 * per-second re-render isolated to this tiny node instead of the whole PIN
 * modal, which matters while a code is pending on lower-end Android devices.
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
