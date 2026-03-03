import React, { useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  requestEmailVerification,
  verifyEmailForRegistration,
  register,
} from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { ApiClientError } from "@/lib/api";
import { useAuthStore } from "@/store";

type Step = "email" | "otp" | "profile";

export default function SignUpScreen() {
  const login = useAuthStore.use.login();

  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);

  // Step 1 — email
  const [email, setEmail] = useState("");

  // Step 2 — OTP
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Step 3 — profile
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const lastNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // ------------------------------------------------------------------
  // Step 1 — Request email verification
  // ------------------------------------------------------------------
  async function handleVerifyEmail() {
    if (!email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: "Enter a valid email" });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      await requestEmailVerification(email.trim().toLowerCase());
      setStep("otp");
      startResendCooldown();
    } catch (e) {
      Alert.alert(
        "Verification Failed",
        e instanceof ApiClientError ? e.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

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

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await requestEmailVerification(email.trim().toLowerCase());
      startResendCooldown();
      Alert.alert("Code Sent", "A new verification code has been sent.");
    } catch (e) {
      Alert.alert(
        "Resend Failed",
        e instanceof ApiClientError ? e.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Step 2 — Verify OTP
  // ------------------------------------------------------------------
  async function handleVerifyOtp() {
    if (otp.length !== 4) {
      setErrors({ otp: "Enter the 4-digit code" });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      await verifyEmailForRegistration(email.trim().toLowerCase(), otp);
      setStep("profile");
    } catch (e) {
      Alert.alert(
        "Invalid Code",
        e instanceof ApiClientError ? e.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Step 3 — Register
  // ------------------------------------------------------------------
  function validateProfile() {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = "First name is required";
    if (!lastName.trim()) next.lastName = "Last name is required";
    if (!phone.trim()) next.phone = "Phone number is required";
    if (password.length < 6) next.password = "Password must be at least 6 characters";
    if (password !== confirmPassword)
      next.confirmPassword = "Passwords do not match";
    if (!agreedToTerms) next.terms = "You must accept the terms";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleRegister() {
    if (!validateProfile()) return;

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

      await login(
        res.data.user,
        {
          accessToken: res.data.access_token,
          refreshToken: res.data.refresh_token,
        },
      );

      router.replace("/");
    } catch (e) {
      Alert.alert(
        "Registration Failed",
        e instanceof ApiClientError ? e.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-12"
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="items-center">
            <Image
              source={require("@/assets/images/icon.png")}
              className="mb-4 h-20 w-20 rounded-2xl"
              resizeMode="contain"
            />
            <Text variant="h3" className="text-primary">SmiPay</Text>
            <Text className="mt-1 text-muted-foreground">
              {step === "email" && "Create your account"}
              {step === "otp" && "Verify your email"}
              {step === "profile" && "Complete your profile"}
            </Text>
          </View>

          {/* Step indicator */}
          <View className="mt-6 flex-row items-center justify-center gap-2">
            {(["email", "otp", "profile"] as const).map((s, i) => (
              <View
                key={s}
                className={`h-1.5 rounded-full ${
                  s === step
                    ? "w-8 bg-primary"
                    : i < ["email", "otp", "profile"].indexOf(step)
                      ? "w-8 bg-primary/40"
                      : "w-8 bg-muted"
                }`}
              />
            ))}
          </View>

          {/* ---- Step 1: Email ---- */}
          {step === "email" && (
            <View className="mt-10 gap-4">
              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="done"
                onSubmitEditing={handleVerifyEmail}
              />

              <Button
                className="mt-4 h-14 rounded-2xl"
                onPress={handleVerifyEmail}
                disabled={loading}
              >
                <Text className="text-base font-semibold">
                  {loading ? "Sending code..." : "Verify Email"}
                </Text>
              </Button>

              <View className="mt-4 flex-row items-center justify-center gap-1">
                <Text className="text-muted-foreground">
                  Already have an account?
                </Text>
                <Link href="/(auth)/sign-in" asChild>
                  <Text className="font-semibold text-primary">Sign in</Text>
                </Link>
              </View>
            </View>
          )}

          {/* ---- Step 2: OTP ---- */}
          {step === "otp" && (
            <View className="mt-10 gap-4">
              <Text className="text-center text-sm text-muted-foreground">
                We sent a 4-digit code to{" "}
                <Text className="font-medium text-foreground">{email}</Text>
              </Text>

              <Input
                label="Verification Code"
                placeholder="0000"
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 4))}
                error={errors.otp}
                keyboardType="number-pad"
                maxLength={4}
                returnKeyType="done"
                onSubmitEditing={handleVerifyOtp}
              />

              <Button
                className="mt-4 h-14 rounded-2xl"
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                <Text className="text-base font-semibold">
                  {loading ? "Verifying..." : "Verify"}
                </Text>
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
            </View>
          )}

          {/* ---- Step 3: Profile ---- */}
          {step === "profile" && (
            <View className="mt-10 gap-4">
              <Input
                label="First Name"
                placeholder="Jane"
                value={firstName}
                onChangeText={setFirstName}
                error={errors.firstName}
                autoComplete="given-name"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => lastNameRef.current?.focus()}
              />

              <Input
                ref={lastNameRef}
                label="Last Name"
                placeholder="Doe"
                value={lastName}
                onChangeText={setLastName}
                error={errors.lastName}
                autoComplete="family-name"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
              />

              <Input
                ref={phoneRef}
                label="Phone Number"
                placeholder="08012345678"
                value={phone}
                onChangeText={setPhone}
                error={errors.phone}
                keyboardType="phone-pad"
                autoComplete="tel"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <Input
                ref={passwordRef}
                label="Password"
                placeholder="Min. 6 characters"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                secureTextEntry
                toggleable
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />

              <Input
                ref={confirmRef}
                label="Confirm Password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={errors.confirmPassword}
                secureTextEntry
                toggleable
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />

              {/* Terms */}
              <Pressable
                className="flex-row items-start gap-3"
                onPress={() => setAgreedToTerms((v) => !v)}
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
                <Text className="flex-1 text-sm text-muted-foreground">
                  I agree to the{" "}
                  <Text className="text-primary">Terms of Service</Text> and{" "}
                  <Text className="text-primary">Privacy Policy</Text>
                </Text>
              </Pressable>
              {errors.terms && (
                <Text className="text-xs text-destructive">{errors.terms}</Text>
              )}

              <Button
                className="mt-4 h-14 rounded-2xl"
                onPress={handleRegister}
                disabled={loading}
              >
                <Text className="text-base font-semibold">
                  {loading ? "Creating account..." : "Create Account"}
                </Text>
              </Button>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
