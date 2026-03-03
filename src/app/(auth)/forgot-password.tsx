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
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  forgotPassword,
  verifyPasswordResetOtp,
  resetPassword,
} from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { ApiClientError } from "@/lib/api";

type Step = "email" | "otp" | "reset";

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const confirmRef = useRef<TextInput>(null);

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

  // ------------------------------------------------------------------
  // Step 1 — Request reset OTP
  // ------------------------------------------------------------------
  async function handleRequestOtp() {
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
      await forgotPassword(email.trim().toLowerCase());
      setStep("otp");
      startResendCooldown();
    } catch (e) {
      Alert.alert(
        "Request Failed",
        e instanceof ApiClientError ? e.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      startResendCooldown();
      Alert.alert("Code Sent", "A new reset code has been sent.");
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
      await verifyPasswordResetOtp(email.trim().toLowerCase(), otp);
      setStep("reset");
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
  // Step 3 — Reset password
  // ------------------------------------------------------------------
  async function handleResetPassword() {
    const next: Record<string, string> = {};
    if (newPassword.length < 4) next.newPassword = "Password must be at least 4 characters";
    if (newPassword !== confirmPassword) next.confirmPassword = "Passwords do not match";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      await resetPassword({
        email: email.trim().toLowerCase(),
        otp,
        new_password: newPassword,
      });
      Alert.alert(
        "Password Reset",
        "Your password has been reset. Please sign in with your new password.",
        [{ text: "Sign In", onPress: () => router.replace("/(auth)/sign-in") }],
      );
    } catch (e) {
      Alert.alert(
        "Reset Failed",
        e instanceof ApiClientError ? e.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const stepTitles: Record<Step, string> = {
    email: "Forgot password?",
    otp: "Enter reset code",
    reset: "New password",
  };

  const stepSubtitles: Record<Step, string> = {
    email: "Enter your email and we'll send you a reset code.",
    otp: `We sent a 4-digit code to ${email}`,
    reset: "Choose a new password for your account.",
  };

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
            <Text variant="h4">{stepTitles[step]}</Text>
            <Text className="mt-2 text-center text-sm text-muted-foreground">
              {stepSubtitles[step]}
            </Text>
          </View>

          {/* Step indicator */}
          <View className="mt-6 flex-row items-center justify-center gap-2">
            {(["email", "otp", "reset"] as const).map((s, i) => (
              <View
                key={s}
                className={`h-1.5 rounded-full ${
                  s === step
                    ? "w-8 bg-primary"
                    : i < ["email", "otp", "reset"].indexOf(step)
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
                onSubmitEditing={handleRequestOtp}
              />

              <Button
                className="mt-4 h-14 rounded-2xl"
                onPress={handleRequestOtp}
                disabled={loading}
              >
                <Text className="text-base font-semibold">
                  {loading ? "Sending..." : "Send Reset Code"}
                </Text>
              </Button>

              <Pressable onPress={() => router.back()}>
                <Text className="text-center text-sm text-primary">
                  Back to Sign In
                </Text>
              </Pressable>
            </View>
          )}

          {/* ---- Step 2: OTP ---- */}
          {step === "otp" && (
            <View className="mt-10 gap-4">
              <Input
                label="Reset Code"
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
                  {loading ? "Verifying..." : "Verify Code"}
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

          {/* ---- Step 3: New password ---- */}
          {step === "reset" && (
            <View className="mt-10 gap-4">
              <Input
                label="New Password"
                placeholder="Min. 4 characters"
                value={newPassword}
                onChangeText={setNewPassword}
                error={errors.newPassword}
                secureTextEntry
                toggleable
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />

              <Input
                ref={confirmRef}
                label="Confirm Password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={errors.confirmPassword}
                secureTextEntry
                toggleable
                returnKeyType="done"
                onSubmitEditing={handleResetPassword}
              />

              <Button
                className="mt-4 h-14 rounded-2xl"
                onPress={handleResetPassword}
                disabled={loading}
              >
                <Text className="text-base font-semibold">
                  {loading ? "Resetting..." : "Reset Password"}
                </Text>
              </Button>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
