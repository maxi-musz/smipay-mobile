import React, { useCallback, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

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
import { AuthCenteredForm } from "@/components/auth/auth-centered-form";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  AUTH_OTP_DIGITS,
  AUTH_PASSWORD_DIGITS,
  isAuthPasswordValid,
} from "@/lib/auth-password";
import { handleApiError } from "@/lib/errors";
import {
  pickFromCamera,
  pickFromFile,
  pickFromLibrary,
  rejectIfProfileImageTooLarge,
  type PickedProfileImage,
} from "@/lib/pick-profile-image";
import { useToastStore } from "@/components/ui/toast";
import { useAuthStore } from "@/store";

type Step = "email" | "otp" | "profile";

const STEPS: Step[] = ["email", "otp", "profile"];
const EMAIL_RE = /\S+@\S+\.\S+/;
const TRANSACTION_PIN_DIGITS = 4;

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
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

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

  function clearError(key: string) {
    if (errors[key])
      setErrors((p) => {
        const n = { ...p };
        delete n[key];
        return n;
      });
  }

  const canSubmitEmail = EMAIL_RE.test(email.trim()) && !loading;
  const canSubmitOtp = otp.length === AUTH_OTP_DIGITS && !loading;
  const canSubmitProfile =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    phone.trim().length > 0 &&
    isAuthPasswordValid(password) &&
    transactionPin.length === TRANSACTION_PIN_DIGITS &&
    agreedToTerms &&
    !loading;

  // ── Handlers ──────────────────────────────────────────────────────

  function startResendCooldown() {
    setResendCooldown(60);
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

  async function handleVerifyEmail() {
    if (!email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setErrors({ email: "Enter a valid email" });
      return;
    }

    Keyboard.dismiss();
    setErrors({});
    setLoading(true);
    try {
      await requestEmailVerification(email.trim().toLowerCase());
      setStep("otp");
      startResendCooldown();
    } catch (e) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await requestEmailVerification(email.trim().toLowerCase());
      startResendCooldown();
      useToastStore.getState().show({
        variant: "success",
        title: "Code Sent",
        message: "A new verification code has been sent.",
      });
    } catch (e) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otp.length !== AUTH_OTP_DIGITS) {
      setErrors({ otp: `Enter the ${AUTH_OTP_DIGITS}-digit code` });
      return;
    }

    Keyboard.dismiss();
    setErrors({});
    setLoading(true);
    try {
      if (__DEV__) console.log("[OTP] Verifying:", { email: email.trim().toLowerCase(), otp });
      await verifyEmailForRegistration(email.trim().toLowerCase(), otp);
      setStep("profile");
    } catch (e) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }

  function validateProfile() {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = "First name is required";
    if (!lastName.trim()) next.lastName = "Last name is required";
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
        ...(trimmedReferral.length > 0
          ? { referral_code: trimmedReferral }
          : {}),
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

      router.replace("/(app)/(tabs)");
    } catch (e) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }

  // ── Step indicator ────────────────────────────────────────────────

  const stepLabels = ["Email", "Verify", "Profile"];
  const currentIdx = STEPS.indexOf(step);

  function StepIndicator() {
    return (
      <View className="flex-row items-center justify-center gap-3">
        {STEPS.map((s, i) => {
          const isActive = i === currentIdx;
          const isDone = i < currentIdx;
          return (
            <View key={s} className="flex-row items-center gap-3">
              {i > 0 && (
                <View
                  className={`h-px w-6 ${isDone ? "bg-primary" : "bg-muted"}`}
                />
              )}
              <View className="items-center gap-1">
                <View
                  className={`h-7 w-7 items-center justify-center rounded-full ${
                    isActive
                      ? "bg-primary"
                      : isDone
                        ? "bg-primary/20"
                        : "bg-muted"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isActive
                        ? "text-primary-foreground"
                        : isDone
                          ? "text-primary"
                          : "text-muted-foreground"
                    }`}
                  >
                    {isDone ? "✓" : i + 1}
                  </Text>
                </View>
                <Text
                  className={`text-[10px] ${
                    isActive
                      ? "font-medium text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {stepLabels[i]}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: step === "profile" ? "flex-start" : "center",
          paddingVertical: 24,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        bottomOffset={28}
      >
          <AuthCenteredForm layout="top" className="px-6">
          {/* ── Header ── */}
          <Animated.View
            className={`items-center ${step === "profile" ? "mt-4" : ""}`}
            entering={FadeInDown.duration(220)}
          >
            <Image
              source={require("@/assets/images/icon.png")}
              className="mb-3 h-14 w-14 rounded-2xl"
              resizeMode="contain"
            />
            <Text variant="h4" className="text-foreground">
              {step === "email" && "Create Account"}
              {step === "otp" && "Verify Email"}
              {step === "profile" && "Complete Profile"}
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              {step === "email" && "Enter your email to get started"}
              {step === "otp" && `Code sent to ${email}`}
              {step === "profile" && "Just a few more details"}
            </Text>
          </Animated.View>

          {/* ── Step indicator ── */}
          <Animated.View
            className="mt-5"
            entering={FadeInDown.delay(40).duration(220)}
          >
            <StepIndicator />
          </Animated.View>

          {/* ── Step 1: Email ── */}
          {step === "email" && (
            <Animated.View
              className="mt-8 gap-5"
              entering={FadeInDown.delay(80).duration(220)}
            >
              <Input
                label="Email Address"
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
                returnKeyType="done"
                onSubmitEditing={canSubmitEmail ? handleVerifyEmail : undefined}
              />

              <Button
                className="h-14 rounded-2xl"
                onPress={handleVerifyEmail}
                disabled={!canSubmitEmail}
              >
                {loading ? (
                  <Spinner color="#fff" />
                ) : (
                  <Text className="text-base font-semibold">Continue</Text>
                )}
              </Button>

              <View className="flex-row items-center justify-center gap-1">
                <Text className="text-sm text-muted-foreground">
                  Already have an account?
                </Text>
                <Link href="/(auth)/sign-in" asChild>
                  <Text className="text-sm font-semibold text-primary">
                    Sign in
                  </Text>
                </Link>
              </View>
            </Animated.View>
          )}

          {/* ── Step 2: OTP ── */}
          {step === "otp" && (
            <Animated.View
              className="mt-8 gap-5"
              entering={FadeInDown.delay(80).duration(220)}
            >
              <Input
                label="Verification Code"
                placeholder="000000"
                value={otp}
                onChangeText={(t) => {
                  setOtp(t.replace(/\D/g, "").slice(0, AUTH_OTP_DIGITS));
                  clearError("otp");
                }}
                error={errors.otp}
                keyboardType="number-pad"
                maxLength={AUTH_OTP_DIGITS}
                returnKeyType="done"
                onSubmitEditing={canSubmitOtp ? handleVerifyOtp : undefined}
              />

              <Button
                className="h-14 rounded-2xl"
                onPress={handleVerifyOtp}
                disabled={!canSubmitOtp}
              >
                {loading ? (
                  <Spinner color="#fff" />
                ) : (
                  <Text className="text-base font-semibold">Verify</Text>
                )}
              </Button>

              <Pressable
                onPress={handleResendOtp}
                disabled={resendCooldown > 0}
              >
                <Text className="text-center text-sm text-primary">
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Resend code"}
                </Text>
              </Pressable>
            </Animated.View>
          )}

          {/* ── Step 3: Profile ── */}
          {step === "profile" && (
            <Animated.View
              className="mt-5 gap-4"
              entering={FadeInDown.delay(80).duration(220)}
            >
              <View className="items-center">
                <LinearGradient
                  colors={[colors.orange[400], colors.orange[700], "#9A3412"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 999,
                    padding: 3,
                  }}
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
                          style={{ width: 64, height: 64 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="h-[64px] w-[64px] items-center justify-center bg-muted">
                          <Ionicons name="person" size={28} color={colors.gray[400]} />
                        </View>
                      )}
                    </View>
                    <View
                      className="absolute -bottom-0.5 -right-0.5 h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-background"
                      style={{ backgroundColor: colors.orange[500] }}
                      pointerEvents="none"
                    >
                      <Ionicons name="camera" size={14} color="#FFFFFF" />
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
                    label="First Name"
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
                    label="Last Name"
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
                label="Phone Number"
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
                label="Login Password"
                placeholder="Enter 6-Digit Login Password"
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
                  placeholder="Enter 4 digit transaction pin"
                  value={transactionPin}
                  onChangeText={(v) => {
                    setTransactionPin(
                      v.replace(/\D/g, "").slice(0, TRANSACTION_PIN_DIGITS),
                    );
                    clearError("transactionPin");
                  }}
                  error={errors.transactionPin}
                  secureTextEntry
                  toggleable
                  keyboardType="number-pad"
                  maxLength={TRANSACTION_PIN_DIGITS}
                  returnKeyType="done"
                  onSubmitEditing={canSubmitProfile ? handleRegister : undefined}
                />
                <Text className="mt-1.5 text-xs text-muted-foreground">
                  {AUTH_PASSWORD_DIGITS}-digit password to log in · {TRANSACTION_PIN_DIGITS}-digit PIN to approve payments
                </Text>
              </View>

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
                  <View
                    className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
                      hasReferralCode
                        ? "border-primary bg-primary"
                        : "border-input bg-background"
                    }`}
                  >
                    {hasReferralCode && (
                      <Text className="text-xs text-primary-foreground">✓</Text>
                    )}
                  </View>
                  <Text className="flex-1 text-xs text-muted-foreground">
                    I have a referral code
                  </Text>
                </Pressable>

                {hasReferralCode && (
                  <View className="mt-3">
                    <Input
                      label="Referral Code"
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
                <View
                  className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
                    agreedToTerms
                      ? "border-primary bg-primary"
                      : "border-input bg-background"
                  }`}
                >
                  {agreedToTerms && (
                    <Text className="text-xs text-primary-foreground">✓</Text>
                  )}
                </View>
                <Text className="flex-1 text-xs text-muted-foreground">
                  I agree to the{" "}
                  <Text className="text-xs text-primary">
                    Terms of Service
                  </Text>{" "}
                  and{" "}
                  <Text className="text-xs text-primary">Privacy Policy</Text>
                </Text>
              </Pressable>
              {errors.terms && (
                <Text className="text-xs text-destructive">{errors.terms}</Text>
              )}

              <Button
                className="mt-1 h-14 rounded-2xl"
                onPress={handleRegister}
                disabled={!canSubmitProfile}
              >
                {loading ? (
                  <Spinner color="#fff" />
                ) : (
                  <Text className="text-base font-semibold">
                    Create Account
                  </Text>
                )}
              </Button>
            </Animated.View>
          )}
          </AuthCenteredForm>
      </KeyboardAwareScrollView>

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
    </SafeAreaView>
  );
}
