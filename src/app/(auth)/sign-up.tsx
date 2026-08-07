import { useCallback, useRef, useState } from "react";
import { BackHandler, Image, Keyboard, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router, useFocusEffect } from "expo-router";

import {
  register,
  registerWithProfilePicture,
  requestEmailVerification,
  verifyEmailForRegistration,
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
  pickFromCamera,
  pickFromFile,
  pickFromLibrary,
  rejectIfProfileImageTooLarge,
  type PickedProfileImage,
} from "@/lib/pick-profile-image";
import { useAuthStore } from "@/store";

type Step = "email" | "otp" | "profile";

const STEPS: Step[] = ["email", "otp", "profile"];
const STEP_LABELS = ["Email", "Verify", "Profile"];
const EMAIL_RE = /\S+@\S+\.\S+/;
const TRANSACTION_PIN_DIGITS = 4;
const REGISTRATION_OTP_RESEND_COOLDOWN_SECONDS = 30;

/**
 * Clamp phone input as the user types. Accepts only digits plus a single leading
 * `+`, and enforces length by format:
 *   - local `0XXXXXXXXXX` → max 11 digits
 *   - international `+234XXXXXXXXXX` → max 14 chars (`+234` + 10 digits)
 */
function sanitizePhone(input: string): string {
  let v = input.replace(/[^\d+]/g, "");
  if (v.includes("+")) v = "+" + v.replace(/\+/g, "");
  return v.startsWith("+") ? v.slice(0, 14) : v.slice(0, 11);
}

/** Final-format validation for the two accepted Nigerian phone shapes. */
function isValidPhone(phone: string): boolean {
  return /^0\d{10}$/.test(phone) || /^\+234\d{10}$/.test(phone);
}

export default function SignUpScreen() {
  const { isDark } = useAppTheme();
  const login = useAuthStore.use.login();
  const storeCredentials = useAuthStore.use.storeCredentials();

  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpError, setOtpError] = useState("");
  const [otpShakeKey, setOtpShakeKey] = useState(0);

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

  const lastNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
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

  const canSubmitEmail = EMAIL_RE.test(email.trim()) && !loading;
  const canSubmitProfile =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    phone.trim().length > 0 &&
    isAuthPasswordValid(password) &&
    transactionPin.length === TRANSACTION_PIN_DIGITS &&
    agreedToTerms &&
    !loading;

  // ── Cooldown ──────────────────────────────────────────────────────

  /** Seconds the server asked us to wait, if it said so. */
  function retryAfterSeconds(e: unknown): number | undefined {
    const data = (
      e as { response?: { data?: { retry_after_seconds?: number } } }
    )?.response?.data;
    return typeof data?.retry_after_seconds === 'number'
      ? data.retry_after_seconds
      : undefined;
  }


  /**
   * `seconds` lets the server drive the wait: a 429 carries
   * `retry_after_seconds`, so the button re-enables exactly when the backend
   * will actually accept another request — no guessing, no drift.
   */
  function startResendCooldown(seconds?: number) {
    setResendCooldown(
      seconds && seconds > 0
        ? Math.ceil(seconds)
        : REGISTRATION_OTP_RESEND_COOLDOWN_SECONDS,
    );
    const id = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) {
          clearInterval(id);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }

  // ── Handlers ──────────────────────────────────────────────────────

  async function handleVerifyEmail() {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setErrors({ email: "Enter a valid email" });
      return;
    }

    Keyboard.dismiss();
    setErrors({});
    setLoading(true);
    try {
      await requestEmailVerification(trimmed.toLowerCase());
      otp.clear();
      setOtpError("");
      setStep("otp");
      startResendCooldown();
    } catch (e) {
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
      await requestEmailVerification(email.trim().toLowerCase());
      otp.clear();
      startResendCooldown();
      useToastStore.getState().show({
        variant: "success",
        title: "Code Sent",
        message: "A new verification code has been sent.",
      });
    } catch (e) {
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
      await verifyEmailForRegistration(email.trim().toLowerCase(), value);
      setStep("profile");
    } catch (e) {
      // Clear so the next attempt starts fresh rather than editing a rejected code.
      otp.clear();
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

  function validateProfile() {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = "Required";
    if (!lastName.trim()) next.lastName = "Required";
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) next.phone = "Phone number is required";
    else if (!isValidPhone(trimmedPhone))
      next.phone = "Enter a valid phone (e.g. 08012345678 or +2348012345678)";
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
        phone_number: phone.trim(),
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
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (step === "otp") {
      setStep("email");
    } else if (step === "profile") {
      setStep("otp");
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
    step === "email"
      ? "Create your account"
      : step === "otp"
        ? "Verify your email"
        : "Complete your profile";

  const subtitle =
    step === "email"
      ? "Enter your email to get started."
      : step === "otp"
        ? `We sent a 6-digit code to ${email}.`
        : "A few more details and you're in.";

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      showVersion={step === "email"}
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

      {step === "email" ? (
        <View className="mt-8">
          <Input
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              clearError("email");
            }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={canSubmitEmail ? handleVerifyEmail : undefined}
          />

          <View className="mt-7 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1">
              <Text className="text-sm text-muted-foreground">Have an account?</Text>
              <Link href="/(auth)/sign-in" asChild>
                <Text className="text-sm font-semibold text-primary">Sign in</Text>
              </Link>
            </View>

            <ArrowButton
              onPress={handleVerifyEmail}
              disabled={!canSubmitEmail}
              loading={loading}
              accessibilityLabel="Continue"
              testID="sign-up-email-continue"
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
            accessibilityLabel="Email verification code"
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
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
            </View>
          </View>

          <Input
            ref={phoneRef}
            label="Phone number"
            placeholder="08012345678"
            value={phone}
            onChangeText={(v) => {
              setPhone(sanitizePhone(v));
              clearError("phone");
            }}
            error={errors.phone}
            keyboardType="phone-pad"
            maxLength={14}
            autoComplete="tel"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <Input
            ref={passwordRef}
            label="Login password"
            placeholder="6-digit login password"
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
              {AUTH_PASSWORD_DIGITS}-digit password to log in ·{" "}
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

          <View className="mt-2 flex-row items-center justify-between">
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
