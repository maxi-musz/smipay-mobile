import React, { useRef, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  requestEmailVerification,
  verifyEmailForRegistration,
  register,
} from "@/api";
import { AuthCenteredForm } from "@/components/auth/auth-centered-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { handleApiError } from "@/lib/errors";
import { useToastStore } from "@/components/ui/toast";
import { useAuthStore } from "@/store";

type Step = "email" | "otp" | "profile";

const STEPS: Step[] = ["email", "otp", "profile"];
const EMAIL_RE = /\S+@\S+\.\S+/;

export default function SignUpScreen() {
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
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const lastNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  function clearError(key: string) {
    if (errors[key])
      setErrors((p) => {
        const n = { ...p };
        delete n[key];
        return n;
      });
  }

  const canSubmitEmail = EMAIL_RE.test(email.trim()) && !loading;
  const canSubmitOtp = otp.length === 4 && !loading;
  const canSubmitProfile =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    phone.trim().length > 0 &&
    password.length >= 6 &&
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
    if (otp.length !== 4) {
      setErrors({ otp: "Enter the 4-digit code" });
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
    if (!phone.trim()) next.phone = "Phone number is required";
    if (password.length < 6)
      next.password = "Password must be at least 6 characters";
    if (!agreedToTerms) next.terms = "You must accept the terms";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleRegister() {
    if (!validateProfile()) return;

    Keyboard.dismiss();
    setLoading(true);
    try {
      const res = await register({
        email: email.trim().toLowerCase(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim(),
        agree_to_terms: true,
        country: "Nigeria",
      });

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
      <KeyboardAvoidingView
        enabled={Platform.OS === "ios"}
        behavior="padding"
        className="flex-1"
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerClassName="flex-grow pb-12"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          showsVerticalScrollIndicator={false}
        >
          <AuthCenteredForm className="px-6">
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
                placeholder="0000"
                value={otp}
                onChangeText={(t) => {
                  setOtp(t.replace(/\D/g, "").slice(0, 4));
                  clearError("otp");
                }}
                error={errors.otp}
                keyboardType="number-pad"
                maxLength={4}
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
              className="mt-6 gap-5"
              entering={FadeInDown.delay(80).duration(220)}
            >
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
                  setPhone(v);
                  clearError("phone");
                }}
                error={errors.phone}
                keyboardType="phone-pad"
                autoComplete="tel"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              {/* Divider */}
              <View className="flex-row items-center gap-3">
                <View className="h-px flex-1 bg-border" />
                <Text className="text-xs text-muted-foreground">
                  Set a password
                </Text>
                <View className="h-px flex-1 bg-border" />
              </View>

              <Input
                ref={passwordRef}
                label="Password"
                placeholder="Min. 6 characters"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  clearError("password");
                }}
                error={errors.password}
                secureTextEntry
                toggleable
                returnKeyType="done"
                onSubmitEditing={canSubmitProfile ? handleRegister : undefined}
              />

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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
