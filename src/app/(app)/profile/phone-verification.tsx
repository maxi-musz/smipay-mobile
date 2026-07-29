import { useEffect, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { requestPhoneVerificationOtp, updatePhoneVerificationNumber, verifyPhoneVerificationOtp } from "@/api";
import {
  CodeSlots,
  Keypad,
  KeypadDock,
  useNumericInput,
  type KeypadKey,
} from "@/components/keypad";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import { ApiClientError } from "@/lib/api";
import {
  isValidPhoneIdentifier,
  sanitizeAuthIdentifier,
} from "@/lib/auth-identifier";
import { formatCountdown } from "@/lib/format-countdown";
import {
  isUserSafePhoneOtpRequestMessage,
  toUserFacingPhoneOtpRequestError,
} from "@/lib/phone-otp-user-error";
import { cn } from "@/lib/utils";
import type { PhoneOtpErrorData, PhoneOtpPolicy } from "@/types/kyc-verification";
import {
  useAuthStore,
  useHomepageStore,
  useKycVerificationStore,
  useProfileStore,
} from "@/store";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_FALLBACK_MS = 5 * 60 * 1000;

function applyRetryCooldown(
  retryAfterSeconds: number,
  setResendAvailableAt: (value: number | null) => void,
  setResendOnCooldown: (value: boolean) => void,
) {
  if (retryAfterSeconds > 0) {
    setResendAvailableAt(Date.now() + retryAfterSeconds * 1000);
    setResendOnCooldown(true);
  }
}

function readPhoneOtpErrorData(err: unknown): PhoneOtpErrorData | null {
  if (err instanceof ApiClientError && err.data && typeof err.data === "object") {
    return err.data as PhoneOtpErrorData;
  }
  return null;
}

export default function PhoneVerificationScreen() {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.show);

  const kycStatus = useKycVerificationStore.use.data();
  const fetchKycStatus = useKycVerificationStore.use.fetchStatus();
  const refreshHomepageSilently = useHomepageStore.use.refreshHomepageSilently();
  const fetchProfile = useProfileStore.use.fetchProfile();
  const profileData = useProfileStore.use.data();
  const authUser = useAuthStore.use.user();
  const updateAuthUser = useAuthStore.use.updateUser();

  const [otpSent, setOtpSent] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [updatingPhone, setUpdatingPhone] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [resendOnCooldown, setResendOnCooldown] = useState(false);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Bumped on every rejected code so the slots re-shake even for the same error. */
  const [errorShakeKey, setErrorShakeKey] = useState(0);
  const [clipboardHasText, setClipboardHasText] = useState(false);

  /**
   * The code is driven by the in-app keypad, not the system keyboard: OEM
   * keyboards on Android are the main source of OTP entry bugs (IMEs that
   * ignore `number-pad`, autocorrect, layouts without a visible delete key).
   */
  const code = useNumericInput({
    length: OTP_LENGTH,
    onComplete: (value) => {
      void handleVerifyOtp(value);
    },
    onChange: () => {
      if (error) setError(null);
    },
  });

  const maskedPhone = kycStatus?.phone_verification?.masked_phone ?? "";
  const otpPolicy: PhoneOtpPolicy | null | undefined =
    kycStatus?.phone_verification?.otp_policy;
  const dailyRemaining = otpPolicy?.daily_remaining;
  const canRequestOtp = otpPolicy?.can_request ?? true;
  const registeredPhone =
    profileData?.user?.phone_number ?? authUser?.phone_number ?? "";

  useEffect(() => {
    void fetchKycStatus();
  }, [fetchKycStatus]);

  useEffect(() => {
    if (otpPolicy?.retry_after_seconds && otpPolicy.retry_after_seconds > 0) {
      applyRetryCooldown(
        otpPolicy.retry_after_seconds,
        setResendAvailableAt,
        setResendOnCooldown,
      );
    }
  }, [otpPolicy?.retry_after_seconds]);

  useEffect(() => {
    if (!resendAvailableAt) {
      setResendSecondsLeft(0);
      setResendOnCooldown(false);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000));
      setResendSecondsLeft(remaining);
      setResendOnCooldown(remaining > 0);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [resendAvailableAt]);

  // A custom keypad means no SMS autofill, so offer an explicit paste key
  // instead. `hasStringAsync` never triggers the iOS paste prompt — only the
  // read on tap does, and that one is user-initiated.
  useEffect(() => {
    if (!otpSent) return;
    let active = true;

    const check = () => {
      Clipboard.hasStringAsync()
        .then((has) => {
          if (active) setClipboardHasText(has);
        })
        .catch(() => {});
    };

    check();
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") check();
    });

    return () => {
      active = false;
      sub.remove();
    };
  }, [otpSent]);

  function applyOtpRequestError(err: unknown): string {
    const data = readPhoneOtpErrorData(err);
    if (data?.retry_after_seconds && data.retry_after_seconds > 0) {
      applyRetryCooldown(
        data.retry_after_seconds,
        setResendAvailableAt,
        setResendOnCooldown,
      );
      return `Please wait ${formatCountdown(data.retry_after_seconds)} before requesting a new code.`;
    }
    if (data?.message && isUserSafePhoneOtpRequestMessage(data.message)) {
      return data.message;
    }
    return toUserFacingPhoneOtpRequestError(err);
  }

  function resetOtpFlow() {
    setOtpSent(false);
    code.clear();
    setOtpExpiresAt(null);
    setResendAvailableAt(null);
    setResendOnCooldown(false);
    setError(null);
  }

  async function handlePasteCode() {
    try {
      const text = await Clipboard.getStringAsync();
      const match = text?.match(new RegExp(`\\d{${OTP_LENGTH}}`));
      if (!match) {
        setError(`No ${OTP_LENGTH}-digit code found on your clipboard.`);
        setErrorShakeKey((k) => k + 1);
        return;
      }
      code.setValue(match[0]);
    } catch {
      setError("We couldn't read your clipboard.");
    }
  }

  function openPhoneEditor() {
    setEditingPhone(true);
    setNewPhone(registeredPhone);
    setError(null);
    resetOtpFlow();
  }

  function closePhoneEditor() {
    setEditingPhone(false);
    setNewPhone("");
    setError(null);
  }

  async function handleUpdatePhone() {
    const trimmed = newPhone.trim();
    if (!isValidPhoneIdentifier(trimmed)) {
      setError("Enter a valid phone number (e.g. 08012345678 or +2348012345678).");
      return;
    }

    Keyboard.dismiss();
    setUpdatingPhone(true);
    setError(null);
    try {
      const res = await updatePhoneVerificationNumber(trimmed);
      showToast({
        variant: "success",
        title: "Phone number updated",
        message: res.message ?? "You can now request a verification code.",
      });
      setEditingPhone(false);
      setNewPhone("");
      resetOtpFlow();
      await Promise.all([
        fetchKycStatus(),
        fetchProfile(),
        refreshHomepageSilently(),
      ]);
      if (res.data?.phone_verification?.masked_phone) {
        const normalized =
          trimmed.startsWith("+234") ? `0${trimmed.slice(4)}` : trimmed;
        updateAuthUser({ phone_number: normalized });
      }
    } catch (err) {
      const apiMessage =
        err instanceof ApiClientError ? err.message : undefined;
      setError(apiMessage ?? "We couldn't update your phone number. Please try again.");
    } finally {
      setUpdatingPhone(false);
    }
  }

  async function handleRequestOtp() {
    if ((resendOnCooldown && otpSent) || !canRequestOtp) return;
    Keyboard.dismiss();
    setRequesting(true);
    setError(null);
    try {
      const res = await requestPhoneVerificationOtp();
      const expires = res.data?.expires_at
        ? new Date(res.data.expires_at).getTime()
        : Date.now() + (res.data?.ttl_ms ?? 10 * 60 * 1000);
      const cooldownMs =
        res.data?.cooldown_ms ??
        (res.data?.cooldown_seconds ?? 300) * 1000 ??
        RESEND_COOLDOWN_FALLBACK_MS;
      setOtpExpiresAt(expires);
      setResendAvailableAt(Date.now() + cooldownMs);
      setResendOnCooldown(cooldownMs > 0);
      setOtpSent(true);
      code.clear();
      void fetchKycStatus();
      showToast({
        variant: "success",
        title: "Verification code sent",
        message: res.message ?? "Check your phone for the 6-digit code.",
      });
    } catch (err) {
      setError(applyOtpRequestError(err));
    } finally {
      setRequesting(false);
    }
  }

  async function handleVerifyOtp(value: string = code.value) {
    if (value.length !== OTP_LENGTH || verifying) return;
    if (otpExpiresAt != null && otpExpiresAt <= Date.now()) {
      setError("That code has expired. Tap resend to get a new one.");
      setErrorShakeKey((k) => k + 1);
      return;
    }
    Keyboard.dismiss();
    setVerifying(true);
    setError(null);
    try {
      await verifyPhoneVerificationOtp(value);
      showToast({
        variant: "success",
        title: "Phone verified",
        message: "Your phone number has been verified successfully.",
      });
      await Promise.all([
        fetchKycStatus(),
        refreshHomepageSilently(),
        fetchProfile(),
      ]);
      router.back();
    } catch (err) {
      const data = readPhoneOtpErrorData(err);
      const apiMessage =
        data?.message ??
        (err instanceof ApiClientError ? err.message : undefined);
      // Clear first — clearing runs `onChange`, which resets `error`. Then show
      // the failure so the next keypress starts a fresh attempt rather than
      // editing a rejected code.
      code.clear();
      // Verify-step errors (wrong/expired code) are intentional user feedback.
      setError(apiMessage ?? "We couldn't verify that code. Please try again.");
      setErrorShakeKey((k) => k + 1);
    } finally {
      setVerifying(false);
    }
  }

  const bg = isDark ? "#0F172A" : "#F8F9FB";
  const cardBg = isDark ? "#1E293B" : "#FFFFFF";
  const slotActive = colors.orange[500];
  const subtleText = isDark ? "#94A3B8" : "#6B7280";

  const canVerifyOtp = code.isComplete && !verifying;
  const canSendCode =
    !requesting && canRequestOtp && (!otpSent || !resendOnCooldown);

  const showKeypad = otpSent && !editingPhone;
  const pasteKey: KeypadKey | undefined = clipboardHasText
    ? {
        type: "action",
        id: "paste",
        label: "Paste",
        ghost: true,
        tint: slotActive,
        accessibilityLabel: "Paste code from clipboard",
        onPress: () => void handlePasteCode(),
      }
    : undefined;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: bg }}>
        <View className="flex-row items-center justify-between px-5 pb-3 pt-14">
          <Pressable
            onPress={() => router.back()}
            disabled={requesting || verifying}
            className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6" }}
          >
            <Ionicons name="chevron-back" size={20} color={isDark ? "#E5E7EB" : "#111827"} />
          </Pressable>
          <Text className="text-base font-semibold text-foreground">
            Phone verification
          </Text>
          <View className="h-9 w-9" />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 20,
              // The dock is a flex sibling below, so it already reserves the
              // bottom inset when it's on screen.
              paddingBottom: showKeypad ? 24 : Math.max(insets.bottom, 24) + 24,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View
              className="mt-4 overflow-hidden rounded-3xl px-5 pb-6 pt-6"
              style={{ backgroundColor: cardBg }}
            >
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Ionicons name="call" size={26} color={colors.orange[500]} />
              </View>

              <Text className="mt-4 text-xl font-semibold text-foreground">
                {otpSent
                  ? "Enter your code"
                  : editingPhone
                    ? "Update phone number"
                    : "Verify your phone number"}
              </Text>
              <Text className="mt-1.5 text-sm leading-5" style={{ color: subtleText }}>
                {otpSent
                  ? maskedPhone
                    ? `We sent a 6-digit code to ${maskedPhone}.`
                    : "We sent a 6-digit code to your phone."
                  : editingPhone
                    ? "Enter the correct number. You can only change it before verification."
                    : maskedPhone
                      ? `We'll text a 6-digit code to ${maskedPhone}.`
                      : "We'll text a 6-digit code to your registered phone number."}
              </Text>
              {otpPolicy && dailyRemaining != null && !editingPhone && !otpSent ? (
                <Text className="mt-2 text-xs" style={{ color: subtleText }}>
                  {dailyRemaining > 0
                    ? `${dailyRemaining} request${dailyRemaining === 1 ? "" : "s"} left today · max ${otpPolicy.daily_max}`
                    : "No requests left today. Try again tomorrow."}
                </Text>
              ) : null}

              {editingPhone ? (
                <>
                  <TextInput
                    value={newPhone}
                    onChangeText={(value) => {
                      setNewPhone(sanitizeAuthIdentifier(value));
                      if (error) setError(null);
                    }}
                    keyboardType="phone-pad"
                    autoFocus
                    className="mt-8 border-b pb-3 text-lg font-medium text-foreground"
                    style={{
                      borderBottomColor: slotActive,
                      borderBottomWidth: 2,
                    }}
                    placeholder="08012345678"
                    placeholderTextColor={subtleText}
                  />

                  {error ? (
                    <Text className="mt-4 text-sm text-red-500">{error}</Text>
                  ) : null}

                  <View className="mt-8">
                    <ProceedButton
                      label="Save number"
                      loading={updatingPhone}
                      disabled={!newPhone.trim() || updatingPhone}
                      onPress={() => void handleUpdatePhone()}
                    />
                  </View>

                  <Pressable
                    onPress={closePhoneEditor}
                    disabled={updatingPhone}
                    hitSlop={8}
                    className="mt-5 self-center active:opacity-70"
                  >
                    <Text className="text-sm font-medium" style={{ color: subtleText }}>
                      Cancel
                    </Text>
                  </Pressable>
                </>
              ) : !otpSent ? (
                <>
                  {error ? (
                    <Text className="mt-4 text-sm text-red-500">{error}</Text>
                  ) : null}

                  <View className="mt-8">
                    <ProceedButton
                      label={
                        resendOnCooldown
                          ? `Send again in ${formatCountdown(resendSecondsLeft)}`
                          : "Send verification code"
                      }
                      loading={requesting}
                      disabled={!canSendCode}
                      onPress={() => void handleRequestOtp()}
                    />
                  </View>

                  <Pressable
                    onPress={openPhoneEditor}
                    disabled={requesting}
                    hitSlop={8}
                    className="mt-5 self-center active:opacity-70"
                  >
                    <Text className="text-sm" style={{ color: subtleText }}>
                      Wrong number?{" "}
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: colors.orange[500] }}
                      >
                        Update phone number
                      </Text>
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Animated.View entering={FadeInDown.duration(220)} className="mt-8">
                  <CodeSlots
                    value={code.value}
                    length={OTP_LENGTH}
                    variant="underline"
                    focused={!verifying}
                    error={Boolean(error)}
                    shakeKey={errorShakeKey}
                    slotHeight={52}
                    accessibilityLabel="Phone verification code"
                  />

                  <View className="mt-5 flex-row items-center justify-between">
                    {otpExpiresAt != null ? (
                      <OtpExpiryCountdown
                        expiresAt={otpExpiresAt}
                        subtleText={subtleText}
                      />
                    ) : (
                      <View />
                    )}

                    <Pressable
                      onPress={() => void handleRequestOtp()}
                      disabled={requesting || resendOnCooldown || !canRequestOtp}
                      hitSlop={8}
                      className="active:opacity-70"
                    >
                      {requesting ? (
                        <View className="flex-row items-center gap-1.5">
                          <Spinner size="small" color={colors.orange[500]} />
                          <Text
                            className="text-xs font-semibold"
                            style={{ color: colors.orange[500] }}
                          >
                            Sending…
                          </Text>
                        </View>
                      ) : (
                        <Text
                          className="text-xs font-semibold"
                          style={{
                            color:
                              resendOnCooldown || !canRequestOtp
                                ? subtleText
                                : colors.orange[500],
                          }}
                        >
                          {resendOnCooldown
                            ? `Resend in ${formatCountdown(resendSecondsLeft)}`
                            : "Resend code"}
                        </Text>
                      )}
                    </Pressable>
                  </View>

                  {error ? (
                    <Text className="mt-4 text-sm font-medium text-red-500">{error}</Text>
                  ) : null}

                  <View className="mt-7">
                    <ProceedButton
                      label="Verify phone number"
                      loading={verifying}
                      disabled={!canVerifyOtp}
                      onPress={() => void handleVerifyOtp()}
                    />
                  </View>

                  <Pressable
                    onPress={openPhoneEditor}
                    disabled={requesting || verifying}
                    hitSlop={8}
                    className="mt-5 self-center active:opacity-70"
                  >
                    <Text className="text-sm" style={{ color: subtleText }}>
                      Wrong number?{" "}
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: colors.orange[500] }}
                      >
                        Update phone number
                      </Text>
                    </Text>
                  </Pressable>
                </Animated.View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {showKeypad ? (
          <KeypadDock secure title="SmiPay Secure Keypad">
            <Keypad
              controller={code}
              disabled={verifying}
              leftKey={pasteKey}
              backspaceBehavior="clear"
            />
          </KeypadDock>
        ) : null}
      </View>
    </>
  );
}

interface ProceedButtonProps {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function ProceedButton({ label, loading, disabled, onPress }: ProceedButtonProps) {
  const { isDark } = useAppTheme();
  const enabled = !disabled && !loading;
  const nudge = useSharedValue(0);

  useEffect(() => {
    if (enabled) {
      nudge.value = withRepeat(
        withSequence(
          withTiming(4, { duration: 650 }),
          withTiming(0, { duration: 650 }),
        ),
        -1,
        true,
      );
    } else {
      nudge.value = withTiming(0, { duration: 120 });
    }
  }, [enabled, nudge]);

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value }],
  }));

  const disabledBg = isDark ? "#334155" : "#E5E7EB";
  const disabledText = isDark ? "#94A3B8" : "#9CA3AF";

  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      className={cn("h-14 flex-row items-center rounded-2xl pl-5 pr-2", enabled && "active:opacity-90")}
      style={{ backgroundColor: enabled ? colors.orange[500] : disabledBg }}
    >
      <View className="flex-1">
        {loading ? (
          <Spinner size="small" color="#FFFFFF" />
        ) : (
          <Text
            className="text-base font-semibold"
            style={{ color: enabled ? "#FFFFFF" : disabledText }}
          >
            {label}
          </Text>
        )}
      </View>
      <Animated.View
        style={[
          arrowStyle,
          {
            height: 40,
            width: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: enabled ? "rgba(255,255,255,0.22)" : "transparent",
          },
        ]}
      >
        <Ionicons
          name="arrow-forward"
          size={20}
          color={enabled ? "#FFFFFF" : disabledText}
        />
      </Animated.View>
    </Pressable>
  );
}

function OtpExpiryCountdown({
  expiresAt,
  subtleText,
}: {
  expiresAt: number;
  subtleText: string;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)),
  );

  useEffect(() => {
    const tick = () => {
      setSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <Text
      className="text-xs font-medium"
      style={{ color: secondsLeft <= 0 ? "#DC2626" : subtleText }}
    >
      {secondsLeft <= 0 ? "Code expired" : `Expires in ${formatCountdown(secondsLeft)}`}
    </Text>
  );
}
