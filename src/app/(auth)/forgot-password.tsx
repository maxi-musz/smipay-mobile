import React, { useRef, useState } from "react";
import {
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
} from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { handleApiError } from "@/lib/errors";
import { useToastStore } from "@/components/ui/toast";

type Step = "email" | "otp" | "reset";

const EMAIL_RE = /\S+@\S+\.\S+/;
const MIN_PASSWORD = 4;

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

  function clearError(key: string) {
    if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  }

  // ---- Computed disabled states ----
  const canSubmitEmail = EMAIL_RE.test(email.trim()) && !loading;
  const canSubmitOtp = otp.length === 4 && !loading;
  const canSubmitReset =
    newPassword.length >= MIN_PASSWORD &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword &&
    !loading;

  function startResendCooldown() {
    setResendCooldown(60);
    const id = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) { clearInterval(id); return 0; }
        return v - 1;
      });
    }, 1000);
  }

  // ------------------------------------------------------------------
  // Step 1 — Request reset OTP
  // ------------------------------------------------------------------
  async function handleRequestOtp() {
    if (!email.trim()) { setErrors({ email: "Email is required" }); return; }
    if (!EMAIL_RE.test(email)) { setErrors({ email: "Enter a valid email" }); return; }

    setErrors({});
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
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
      await forgotPassword(email.trim().toLowerCase());
      startResendCooldown();
      useToastStore.getState().show({
        variant: "success",
        title: "Code Sent",
        message: "A new reset code has been sent.",
      });
    } catch (e) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Step 2 — Verify OTP
  // ------------------------------------------------------------------
  async function handleVerifyOtp() {
    if (otp.length !== 4) { setErrors({ otp: "Enter the 4-digit code" }); return; }

    setErrors({});
    setLoading(true);
    try {
      await verifyPasswordResetOtp(email.trim().toLowerCase(), otp);
      setStep("reset");
    } catch (e) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Step 3 — Reset password
  // ------------------------------------------------------------------
  async function handleResetPassword() {
    const next: Record<string, string> = {};
    if (newPassword.length < MIN_PASSWORD) next.newPassword = `Password must be at least ${MIN_PASSWORD} characters`;
    if (newPassword !== confirmPassword) next.confirmPassword = "Passwords do not match";
    if (Object.keys(next).length > 0) { setErrors(next); return; }

    setErrors({});
    setLoading(true);
    try {
      await resetPassword({
        email: email.trim().toLowerCase(),
        otp,
        new_password: newPassword,
      });
      useToastStore.getState().show({
        variant: "success",
        title: "Password Reset",
        message: "Your password has been reset successfully.",
      });
      router.replace("/(auth)/sign-in");
    } catch (e) {
      handleApiError(e);
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
                onChangeText={(v) => { setEmail(v); clearError("email"); }}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="done"
                onSubmitEditing={canSubmitEmail ? handleRequestOtp : undefined}
              />

              <Button
                className="mt-4 h-14 rounded-2xl"
                onPress={handleRequestOtp}
                disabled={!canSubmitEmail}
              >
                {loading ? (
                  <Spinner color="#fff" />
                ) : (
                  <Text className="text-base font-semibold">Send Reset Code</Text>
                )}
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
                onChangeText={(t) => { setOtp(t.replace(/\D/g, "").slice(0, 4)); clearError("otp"); }}
                error={errors.otp}
                keyboardType="number-pad"
                maxLength={4}
                returnKeyType="done"
                onSubmitEditing={canSubmitOtp ? handleVerifyOtp : undefined}
              />

              <Button
                className="mt-4 h-14 rounded-2xl"
                onPress={handleVerifyOtp}
                disabled={!canSubmitOtp}
              >
                {loading ? (
                  <Spinner color="#fff" />
                ) : (
                  <Text className="text-base font-semibold">Verify Code</Text>
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
            </View>
          )}

          {/* ---- Step 3: New password ---- */}
          {step === "reset" && (
            <View className="mt-10 gap-4">
              <Input
                label="New Password"
                placeholder={`Min. ${MIN_PASSWORD} characters`}
                value={newPassword}
                onChangeText={(v) => { setNewPassword(v); clearError("newPassword"); }}
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
                onChangeText={(v) => { setConfirmPassword(v); clearError("confirmPassword"); }}
                error={errors.confirmPassword}
                secureTextEntry
                toggleable
                returnKeyType="done"
                onSubmitEditing={canSubmitReset ? handleResetPassword : undefined}
              />

              <Button
                className="mt-4 h-14 rounded-2xl"
                onPress={handleResetPassword}
                disabled={!canSubmitReset}
              >
                {loading ? (
                  <Spinner color="#fff" />
                ) : (
                  <Text className="text-base font-semibold">Reset Password</Text>
                )}
              </Button>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
