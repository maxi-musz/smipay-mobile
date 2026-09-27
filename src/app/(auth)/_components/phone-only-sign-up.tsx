import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Image, Keyboard, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router, useFocusEffect } from "expo-router";

import {
  register,
  registerWithProfilePicture,
  requestEmailVerification,
  requestPhoneVerification,
  verifyEmailForRegistration,
  verifyPhoneForRegistration,
} from "@/api";
import {
  ProfilePhotoPickMode,
  ProfilePhotoPreviewModal,
  ProfilePhotoSourceSheet,
} from "@/components/profile";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  CodeSlots,
  Keypad,
  KeypadDock,
  useNumericInput,
  type KeypadKey,
} from "@/components/keypad";
import { ArrowButton } from "@/components/ui/arrow-button";
import { Input } from "@/components/ui/input";
import { NgPhoneField } from "@/components/auth/ng-phone-field";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  AUTH_OTP_DIGITS,
  AUTH_PASSWORD_DIGITS,
  isAuthPasswordValid,
} from "@/lib/auth-password";
import { logSignUpComplete, setAnalyticsUser } from "@/lib/analytics";
import { handleApiError } from "@/lib/errors";
import { formatCountdown } from "@/lib/format-countdown";
import {
  readIdentityGuardError,
  type IdentityGuardField,
} from "@/lib/identity-guard-error";
import {
  isNgPhoneInputFull,
  isValidNgPhoneInput,
  normaliseNgPhoneInput,
} from "@/lib/ng-phone-input";
import {
  pickFromCamera,
  pickFromFile,
  pickFromLibrary,
  rejectIfProfileImageTooLarge,
  type PickedProfileImage,
} from "@/lib/pick-profile-image";
import { useAuthStore } from "@/store";
import { ApiClientError } from "@/lib/api";
import { useOtpTimings } from "@/features/app-bootstrap";

type Step = "phone" | "otp" | "profile";

const STEPS: Step[] = ["phone", "otp", "profile"];
const STEP_LABELS = ["Phone", "Verify", "Profile"];
const EMAIL_RE = /\S+@\S+\.\S+/;
const TRANSACTION_PIN_DIGITS = 4;
const INVALID_PHONE_MESSAGE =
  "Enter a valid Nigerian mobile number (e.g. 08012345678)";

const GUARD_FIELD_ERROR_KEY: Partial<Record<IdentityGuardField, string>> = {
  phone_number: "phone",
  email: "email",
  first_name: "firstName",
  last_name: "lastName",
};

export function PhoneOnlySignUp() {
  const { isDark } = useAppTheme();
  const login = useAuthStore.use.login();
  const storeCredentials = useAuthStore.use.storeCredentials();
  const { resend_cooldown_seconds: otpResendCooldownSeconds } = useOtpTimings();

  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [emailStage, setEmailStage] = useState<
    "unverified" | "code_sent" | "verified"
  >("unverified");
  const [emailCode, setEmailCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpError, setOtpError] = useState("");
  const [otpShakeKey, setOtpShakeKey] = useState(0);
  const resendEndsAtRef = useRef<number | null>(null);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [transactionPin, setTransactionPin] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [hasReferralCode, setHasReferralCode] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [sourceSheetOpen, setSourceSheetOpen] = useState(false);
  const [photoPreviewDraft, setPhotoPreviewDraft] = useState<PickedProfileImage | null>(null);
  const [registrationPhoto, setRegistrationPhoto] = useState<PickedProfileImage | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  // Retapping a guard-refused request still counts against the per-device rate limit.
  const [guardRejectedEmailRequest, setGuardRejectedEmailRequest] = useState<
    string | null
  >(null);

  const lastNameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const transactionPinRef = useRef<TextInput>(null);

  const otp = useNumericInput({
    length: AUTH_OTP_DIGITS,
    onComplete: (value) => {
      void handleVerifyOtp(value);
    },
    onChange: () => setOtpError(""),
  });

  function clearError(key: string) {
    if (errors[key])
      setErrors((p) => {
        const n = { ...p };
        delete n[key];
        return n;
      });
  }

  function showGuardErrorInline(e: unknown): boolean {
    const guard = readIdentityGuardError(e);
    const key = guard?.field ? GUARD_FIELD_ERROR_KEY[guard.field] : undefined;
    if (!guard || !key) return false;

    if (key === "phone" && step !== "phone") {
      setVerifiedPhone(null);
      setStep("phone");
    }
    if (key === "email" && emailStage === "verified") {
      setEmailStage("unverified");
      setEmailCode("");
    }
    setErrors((p) => ({ ...p, [key]: guard.message }));
    return true;
  }

  const normalizedPhone = normaliseNgPhoneInput(phone) ?? phone.trim();

  const canSubmitPhone = isValidNgPhoneInput(phone) && !errors.phone && !loading;
  const phoneError =
    errors.phone ||
    (isNgPhoneInputFull(phone) && !isValidNgPhoneInput(phone)
      ? INVALID_PHONE_MESSAGE
      : undefined);
  const canSubmitProfile =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    !errors.firstName &&
    !errors.lastName &&
    emailStage === "verified" &&
    isAuthPasswordValid(password) &&
    transactionPin.length === TRANSACTION_PIN_DIGITS &&
    agreedToTerms &&
    !loading;

  const emailRequestKey = [
    email.trim().toLowerCase(),
    firstName.trim(),
    lastName.trim(),
  ].join("\n");
  const emailSendDisabled =
    emailBusy ||
    resendCooldown > 0 ||
    !EMAIL_RE.test(email.trim()) ||
    emailRequestKey === guardRejectedEmailRequest;

  // ── Cooldown ──────────────────────────────────────────────────────

  function clearResendTimer() {
    if (resendTimerRef.current) {
      clearInterval(resendTimerRef.current);
      resendTimerRef.current = null;
    }
  }

  function retryAfterSeconds(e: unknown): number | undefined {
    if (e instanceof ApiClientError) {
      const n = e.data?.retry_after_seconds;
      if (typeof n === "number" && n > 0) return Math.ceil(n);
    }
    const data = (
      e as { response?: { data?: { retry_after_seconds?: number } } }
    )?.response?.data;
    return typeof data?.retry_after_seconds === "number" &&
      data.retry_after_seconds > 0
      ? Math.ceil(data.retry_after_seconds)
      : undefined;
  }

  function startResendCooldown(seconds?: number) {
    const fallback =
      otpResendCooldownSeconds > 0 ? otpResendCooldownSeconds : 60;
    const total = seconds && seconds > 0 ? Math.ceil(seconds) : fallback;
    resendEndsAtRef.current = Date.now() + total * 1000;
    setResendCooldown(total);
    clearResendTimer();
    resendTimerRef.current = setInterval(() => {
      const ends = resendEndsAtRef.current;
      if (!ends) {
        clearResendTimer();
        setResendCooldown(0);
        return;
      }
      const left = Math.max(0, Math.ceil((ends - Date.now()) / 1000));
      if (left <= 0) {
        clearResendTimer();
        resendEndsAtRef.current = null;
        setResendCooldown(0);
        return;
      }
      setResendCooldown(left);
    }, 1000);
  }

  useEffect(() => () => clearResendTimer(), []);

  // ── Handlers ──────────────────────────────────────────────────────

  function cooldownFromResponse(res: unknown): number | undefined {
    const n = (res as { data?: { resend_cooldown_seconds?: number } })?.data
      ?.resend_cooldown_seconds;
    return typeof n === "number" && n > 0 ? Math.ceil(n) : undefined;
  }

  async function handleSendPhoneOtp() {
    const normalized = normaliseNgPhoneInput(phone);
    if (!normalized) {
      setErrors({ phone: INVALID_PHONE_MESSAGE });
      return;
    }

    Keyboard.dismiss();
    setErrors({});

    if (verifiedPhone === normalized) {
      setStep("profile");
      return;
    }

    setLoading(true);
    try {
      const res = await requestPhoneVerification(normalized);
      if (res.data?.already_verified) {
        setVerifiedPhone(normalized);
        setStep("profile");
        return;
      }
      otp.clear();
      setOtpError("");
      setStep("otp");
      startResendCooldown(cooldownFromResponse(res));
    } catch (e) {
      // Guard refusals send no SMS, so no cooldown.
      if (showGuardErrorInline(e)) return;
      // Start the cooldown even when the send fails. It used to start only on
      // success, so a failure left the button enabled — users tapped it once a
      // second and generated the request storms we saw in production.
      startResendCooldown(retryAfterSeconds(e));
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    try {
      const res = await requestPhoneVerification(normalizedPhone);
      if (res.data?.already_verified) {
        setVerifiedPhone(normalizedPhone);
        setStep("profile");
        return;
      }
      otp.clear();
      startResendCooldown(cooldownFromResponse(res));
      useToastStore.getState().show({
        variant: "success",
        title: "Code Sent",
        message: "A new verification code has been sent by SMS.",
      });
    } catch (e) {
      if (showGuardErrorInline(e)) return;
      startResendCooldown(retryAfterSeconds(e));
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(value: string = otp.value) {
    if (value.length !== AUTH_OTP_DIGITS) {
      setOtpError(`Enter the ${AUTH_OTP_DIGITS}-digit code`);
      setOtpShakeKey((k) => k + 1);
      return;
    }
    if (loading) return;

    Keyboard.dismiss();
    setOtpError("");
    setLoading(true);
    try {
      await verifyPhoneForRegistration(normalizedPhone, value);
      setVerifiedPhone(normalizedPhone);
      // The SMS cooldown must not gate the email Verify button on the next step.
      clearResendTimer();
      resendEndsAtRef.current = null;
      setResendCooldown(0);
      setStep("profile");
    } catch (e) {
      // Clear so the next attempt starts fresh rather than editing a rejected code.
      otp.clear();
      if (showGuardErrorInline(e)) return;
      setOtpError(
        e instanceof Error && e.message
          ? e.message
          : "That code didn't work. Please try again.",
      );
      setOtpShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  // ── Inline email verification (profile step) ─────────────────────

  async function handleSendEmailCode() {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setErrors((p) => ({ ...p, email: "Enter a valid email" }));
      return;
    }
    if (resendCooldown > 0 || emailBusy) return;
    clearError("email");
    setEmailBusy(true);
    try {
      await requestEmailVerification(trimmed, {
        first_name: firstName,
        last_name: lastName,
      });
      setEmailCode("");
      setEmailStage("code_sent");
      startResendCooldown();
      useToastStore.getState().show({
        variant: "success",
        title: "Code Sent",
        message: `We emailed a verification code to ${trimmed}.`,
      });
    } catch (e) {
      if (showGuardErrorInline(e)) {
        setGuardRejectedEmailRequest(emailRequestKey);
        return;
      }
      startResendCooldown(retryAfterSeconds(e));
      handleApiError(e);
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleConfirmEmailCode() {
    if (emailCode.length !== AUTH_OTP_DIGITS || emailBusy) return;
    Keyboard.dismiss();
    setEmailBusy(true);
    try {
      await verifyEmailForRegistration(email.trim().toLowerCase(), emailCode);
      setEmailStage("verified");
      clearError("email");
    } catch (e) {
      setEmailCode("");
      handleApiError(e);
    } finally {
      setEmailBusy(false);
    }
  }

  function validateProfile() {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = "Required";
    if (!lastName.trim()) next.lastName = "Required";
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email";
    else if (emailStage !== "verified")
      next.email = "Verify your email to continue";
    if (!isAuthPasswordValid(password))
      next.password = `Use exactly ${AUTH_PASSWORD_DIGITS} digits (0–9)`;
    if (transactionPin.length !== TRANSACTION_PIN_DIGITS)
      next.transactionPin = `Use exactly ${TRANSACTION_PIN_DIGITS} digits (0–9)`;
    if (!agreedToTerms) next.terms = "You must accept the terms";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const handleRegistrationPhotoSource = useCallback((mode: ProfilePhotoPickMode) => {
    void (async () => {
      let picked: PickedProfileImage | null = null;
      if (mode === "camera") picked = await pickFromCamera();
      else if (mode === "library") picked = await pickFromLibrary();
      else picked = await pickFromFile();
      const ok = picked ? rejectIfProfileImageTooLarge(picked) : null;
      if (ok) setPhotoPreviewDraft(ok);
    })();
  }, []);

  async function handleRegister() {
    if (!validateProfile()) return;

    Keyboard.dismiss();
    setLoading(true);
    try {
      const trimmedReferral = hasReferralCode ? referralCode.trim() : "";
      const payload = {
        email: email.trim().toLowerCase(),
        password,
        transaction_pin: transactionPin,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: normalizedPhone,
        agree_to_terms: true,
        country: "Nigeria",
        ...(trimmedReferral.length > 0 ? { referral_code: trimmedReferral } : {}),
      };

      const res = registrationPhoto
        ? await registerWithProfilePicture(
            payload,
            {
              uri: registrationPhoto.uri,
              name: registrationPhoto.fileName,
              type: registrationPhoto.mimeType,
            },
            registrationPhoto.fileSize,
          )
        : await register(payload);

      const trimmedEmail = email.trim().toLowerCase();
      await login(res.data.user, {
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token,
      });
      await storeCredentials(trimmedEmail, password);
      void logSignUpComplete();
      void setAnalyticsUser(res.data.user.id);

      router.replace("/(app)/(tabs)");
    } catch (e) {
      // Toast too: the refused input may be scrolled out of view.
      showGuardErrorInline(e);
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (step === "otp") {
      setStep("phone");
    } else if (step === "profile") {
      // Skip the code screen — the number is already verified.
      setStep("phone");
    } else {
      router.back();
    }
  }

  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        handleBack();
        return true;
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", onHardwareBack);
      return () => sub.remove();
    }, [step]),
  );

  // ── Render helpers ────────────────────────────────────────────────

  const currentIdx = STEPS.indexOf(step);

  const resendKey: KeypadKey = {
    type: "action",
    id: "resend",
    label: resendCooldown > 0 ? formatCountdown(resendCooldown) : "Resend",
    ghost: true,
    disabled: resendCooldown > 0 || loading,
    accessibilityLabel:
      resendCooldown > 0
        ? `Resend available in ${formatCountdown(resendCooldown)}`
        : "Resend verification code",
    onPress: () => void handleResendOtp(),
  };

  const title =
    step === "phone"
      ? "Create your account"
      : step === "otp"
        ? "Verify your number"
        : "Complete your profile";

  const subtitle =
    step === "phone"
      ? "We'll text a verification code to this number."
      : step === "otp"
        ? `We sent a 6-digit code by SMS to ${normalizedPhone}.`
        : "A few more details and you're in.";

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      showVersion={step === "phone"}
      footer={
        step === "profile" ? (
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 pr-4 text-sm text-muted-foreground">
              Create your SmiPay account
            </Text>
            <ArrowButton
              label="Create account"
              onPress={handleRegister}
              disabled={!canSubmitProfile}
              loading={loading}
              accessibilityLabel="Create account"
              testID="sign-up-submit"
            />
          </View>
        ) : undefined
      }
      bottom={
        step === "otp" ? (
          <KeypadDock secure title="SmiPay Secure Keypad">
            <Keypad
              controller={otp}
              disabled={loading}
              leftKey={resendKey}
              backspaceBehavior="clear"
            />
          </KeypadDock>
        ) : undefined
      }
    >
      <StepDots currentIdx={currentIdx} />

      {step === "phone" ? (
        <View className="mt-8">
          <NgPhoneField
            label="Phone number"
            value={phone.replace(/^0/, "")}
            onChangeText={(subscriber) => {
              setPhone(subscriber ? `0${subscriber}` : "");
              clearError("phone");
            }}
            error={phoneError}
            autoFocus
          />
          {!phoneError ? (
            <Text className="mt-1.5 text-xs text-muted-foreground">
              One account per phone number. Standard SMS rates may apply.
            </Text>
          ) : null}

          <View className="mt-7 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1">
              <Text className="text-sm text-muted-foreground">Have an account?</Text>
              <Link href="/(auth)/sign-in" asChild>
                <Text className="text-sm font-semibold text-primary">Sign in</Text>
              </Link>
            </View>

            <ArrowButton
              onPress={handleSendPhoneOtp}
              disabled={!canSubmitPhone}
              loading={loading}
              accessibilityLabel="Continue"
              testID="sign-up-phone-continue"
            />
          </View>
        </View>
      ) : step === "otp" ? (
        <View className="mt-8">
          <CodeSlots
            value={otp.value}
            length={AUTH_OTP_DIGITS}
            variant="underline"
            focused={!loading}
            error={Boolean(otpError)}
            shakeKey={otpShakeKey}
            slotHeight={54}
            accessibilityLabel="SMS verification code"
          />

          {otpError ? (
            <Text className="mt-4 text-sm font-medium text-destructive">
              {otpError}
            </Text>
          ) : null}

          <View className="mt-7 flex-row items-center justify-between">
            <Text className="text-sm text-muted-foreground">
              Didn&apos;t get it?{" "}
              <Text
                className={
                  resendCooldown > 0
                    ? "text-sm text-muted-foreground"
                    : "text-sm font-semibold text-primary"
                }
                onPress={
                  resendCooldown > 0 ? undefined : () => void handleResendOtp()
                }
              >
                {resendCooldown > 0
                  ? `Resend in ${formatCountdown(resendCooldown)}`
                  : "Resend code"}
              </Text>
            </Text>

            <ArrowButton
              onPress={() => void handleVerifyOtp()}
              disabled={otp.value.length !== AUTH_OTP_DIGITS || loading}
              loading={loading}
              accessibilityLabel="Verify code"
              testID="sign-up-verify"
            />
          </View>
        </View>
      ) : (
        <View className="mt-6 gap-4">
          {/* Profile photo */}
          <View className="items-center">
            <LinearGradient
              colors={[colors.orange[400], colors.orange[700], "#9A3412"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 999, padding: 3 }}
            >
              <Pressable
                onPress={() => setSourceSheetOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Add profile photo"
                style={{ position: "relative" }}
              >
                <View
                  style={{
                    borderRadius: 999,
                    overflow: "hidden",
                    backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                    borderWidth: 3,
                    borderColor: isDark ? "#0F172A" : "#FFFFFF",
                  }}
                >
                  {registrationPhoto ? (
                    <Image
                      source={{ uri: registrationPhoto.uri }}
                      style={{ width: 72, height: 72 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-[72px] w-[72px] items-center justify-center bg-muted">
                      <Ionicons name="person" size={30} color={colors.gray[400]} />
                    </View>
                  )}
                </View>
                <View
                  className="absolute -bottom-0.5 -right-0.5 h-[28px] w-[28px] items-center justify-center rounded-full border-2 border-background"
                  style={{ backgroundColor: colors.orange[500] }}
                  pointerEvents="none"
                >
                  <Ionicons name="camera" size={15} color="#FFFFFF" />
                </View>
              </Pressable>
            </LinearGradient>
            {registrationPhoto ? (
              <Pressable
                onPress={() => setRegistrationPhoto(null)}
                hitSlop={8}
                className="mt-2"
              >
                <Text className="text-xs font-medium text-primary">Remove photo</Text>
              </Pressable>
            ) : (
              <Text className="mt-2 text-center text-xs text-muted-foreground">
                Profile photo (optional)
              </Text>
            )}
          </View>

          {/* Name — side by side */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                label="First name"
                placeholder="Jane"
                value={firstName}
                onChangeText={(v) => {
                  setFirstName(v);
                  clearError("firstName");
                }}
                error={errors.firstName}
                autoComplete="given-name"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => lastNameRef.current?.focus()}
              />
            </View>
            <View className="flex-1">
              <Input
                ref={lastNameRef}
                label="Last name"
                placeholder="Doe"
                value={lastName}
                onChangeText={(v) => {
                  setLastName(v);
                  clearError("lastName");
                }}
                error={errors.lastName}
                autoComplete="family-name"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
          </View>

          {/* Settled at step 1 — confirmation only. */}
          <View className="flex-row items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2.5">
            <View className="flex-row items-center gap-1.5">
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.orange[500]}
              />
              <Text className="text-xs text-muted-foreground">Phone</Text>
            </View>
            <Text className="text-sm font-medium" numberOfLines={1}>
              {normalizedPhone}
            </Text>
          </View>

          {/* Email + inline verification */}
          <View>
            <View className="flex-row items-end gap-3">
              <View className="flex-1">
                <Input
                  label="Email address"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    clearError("email");
                    if (emailStage !== "unverified") {
                      setEmailStage("unverified");
                      setEmailCode("");
                    }
                  }}
                  error={errors.email}
                  editable={emailStage !== "verified"}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="done"
                />
              </View>
              {emailStage === "verified" ? (
                <View className="mb-1 flex-row items-center gap-1 rounded-full bg-muted px-2.5 py-1.5">
                  <Ionicons
                    name="checkmark-circle"
                    size={15}
                    color={colors.orange[500]}
                  />
                  <Text className="text-xs font-semibold text-primary">
                    Verified
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => void handleSendEmailCode()}
                  disabled={emailSendDisabled}
                  accessibilityRole="button"
                  accessibilityLabel="Verify email"
                  className={`mb-1 rounded-full px-3.5 py-2 ${
                    emailSendDisabled ? "bg-muted" : "bg-primary"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      emailSendDisabled
                        ? "text-muted-foreground"
                        : "text-primary-foreground"
                    }`}
                  >
                    {resendCooldown > 0
                      ? formatCountdown(resendCooldown)
                      : emailStage === "code_sent"
                        ? "Resend"
                        : "Verify"}
                  </Text>
                </Pressable>
              )}
            </View>

            {emailStage === "code_sent" ? (
              <View className="mt-3 flex-row items-end gap-3">
                <View className="flex-1">
                  <Input
                    label="Email code"
                    placeholder={`${AUTH_OTP_DIGITS}-digit code`}
                    value={emailCode}
                    onChangeText={(v) =>
                      setEmailCode(v.replace(/\D/g, "").slice(0, AUTH_OTP_DIGITS))
                    }
                    keyboardType="number-pad"
                    maxLength={AUTH_OTP_DIGITS}
                    returnKeyType="done"
                    onSubmitEditing={() => void handleConfirmEmailCode()}
                  />
                </View>
                <Pressable
                  onPress={() => void handleConfirmEmailCode()}
                  disabled={emailCode.length !== AUTH_OTP_DIGITS || emailBusy}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm email code"
                  className={`mb-1 rounded-full px-3.5 py-2 ${
                    emailCode.length !== AUTH_OTP_DIGITS || emailBusy
                      ? "bg-muted"
                      : "bg-primary"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      emailCode.length !== AUTH_OTP_DIGITS || emailBusy
                        ? "text-muted-foreground"
                        : "text-primary-foreground"
                    }`}
                  >
                    Confirm
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {emailStage !== "verified" && !errors.email ? (
              <Text className="mt-1.5 text-xs text-muted-foreground">
                We&apos;ll email you a code to confirm this address.
              </Text>
            ) : null}
          </View>

          <Input
            ref={passwordRef}
            label="Login PIN"
            placeholder="6-digit login PIN"
            value={password}
            onChangeText={(v) => {
              setPassword(v.replace(/\D/g, "").slice(0, AUTH_PASSWORD_DIGITS));
              clearError("password");
            }}
            error={errors.password}
            secureTextEntry
            toggleable
            keyboardType="number-pad"
            maxLength={AUTH_PASSWORD_DIGITS}
            returnKeyType="next"
            onSubmitEditing={() => transactionPinRef.current?.focus()}
          />

          <View>
            <Input
              ref={transactionPinRef}
              label="Transaction PIN"
              placeholder="4-digit transaction PIN"
              value={transactionPin}
              onChangeText={(v) => {
                setTransactionPin(v.replace(/\D/g, "").slice(0, TRANSACTION_PIN_DIGITS));
                clearError("transactionPin");
              }}
              error={errors.transactionPin}
              secureTextEntry
              toggleable
              keyboardType="number-pad"
              maxLength={TRANSACTION_PIN_DIGITS}
              returnKeyType="done"
            />
            <Text className="mt-1.5 text-xs text-muted-foreground">
              {AUTH_PASSWORD_DIGITS}-digit login PIN to sign in ·{" "}
              {TRANSACTION_PIN_DIGITS}-digit PIN to approve payments
            </Text>
          </View>

          {/* Referral */}
          <View>
            <Pressable
              className="flex-row items-start gap-3"
              onPress={() => {
                setHasReferralCode((v) => {
                  const next = !v;
                  if (!next) {
                    setReferralCode("");
                    clearError("referralCode");
                  }
                  return next;
                });
              }}
            >
              <Checkbox checked={hasReferralCode} />
              <Text className="flex-1 text-sm text-muted-foreground">
                I have a referral code
              </Text>
            </Pressable>

            {hasReferralCode && (
              <View className="mt-3">
                <Input
                  label="Referral code"
                  placeholder="e.g. @janedoe"
                  value={referralCode}
                  onChangeText={(v) => {
                    setReferralCode(v.replace(/\s+/g, ""));
                    clearError("referralCode");
                  }}
                  error={errors.referralCode}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  autoFocus
                />
                <Text className="mt-1.5 text-xs text-muted-foreground">
                  Got invited? Enter your friend&apos;s code so you both get a welcome bonus.
                </Text>
              </View>
            )}
          </View>

          {/* Terms */}
          <Pressable
            className="flex-row items-start gap-3"
            onPress={() => {
              setAgreedToTerms((v) => !v);
              clearError("terms");
            }}
          >
            <Checkbox checked={agreedToTerms} />
            <Text className="flex-1 text-sm text-muted-foreground">
              I agree to the <Text className="text-sm text-primary">Terms of Service</Text> and{" "}
              <Text className="text-sm text-primary">Privacy Policy</Text>
            </Text>
          </Pressable>
          {errors.terms && (
            <Text className="text-xs text-destructive">{errors.terms}</Text>
          )}
        </View>
      )}

      <ProfilePhotoSourceSheet
        visible={sourceSheetOpen}
        onClose={() => setSourceSheetOpen(false)}
        onSelect={handleRegistrationPhotoSource}
      />
      <ProfilePhotoPreviewModal
        visible={photoPreviewDraft !== null}
        imageUri={photoPreviewDraft?.uri ?? ""}
        headline="Your profile photo"
        description="This is how it will look on your account after you sign up."
        confirmLabel="Use this photo"
        onCancel={() => setPhotoPreviewDraft(null)}
        onConfirm={() => {
          if (photoPreviewDraft) {
            setRegistrationPhoto(photoPreviewDraft);
            setPhotoPreviewDraft(null);
          }
        }}
        isSubmitting={false}
      />
    </AuthShell>
  );
}

function StepDots({ currentIdx }: { currentIdx: number }) {
  return (
    <View className="mt-6 flex-row items-center gap-2">
      {STEPS.map((s, i) => {
        const active = i === currentIdx;
        const done = i < currentIdx;
        return (
          <View key={s} className="flex-row items-center gap-2">
            <View
              className={`h-1.5 rounded-full ${
                active
                  ? "w-6 bg-primary"
                  : done
                    ? "w-4 bg-primary/50"
                    : "w-4 bg-muted"
              }`}
            />
            {i === currentIdx ? (
              <Text className="text-xs font-medium text-muted-foreground">
                {STEP_LABELS[i]}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View
      className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
        checked ? "border-primary bg-primary" : "border-input bg-background"
      }`}
    >
      {checked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
    </View>
  );
}
