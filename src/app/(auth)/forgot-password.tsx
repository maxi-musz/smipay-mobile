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
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { forgotPassword, resetPassword } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { handleApiError } from "@/lib/errors";
import { useToastStore } from "@/components/ui/toast";

type Step = "email" | "reset";

const EMAIL_RE = /\S+@\S+\.\S+/;
const MIN_PASSWORD = 4;

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [errors, setErrors] = useState<Record<string, string>>({});

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
  const canSubmitReset =
    otp.length === 4 &&
    newPassword.length >= MIN_PASSWORD &&
    !loading;

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

  // ── Step 1 — Request OTP ──────────────────────────────────────────

  async function handleRequestOtp() {
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
      await forgotPassword(email.trim().toLowerCase());
      setStep("reset");
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
      setOtp("");
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

  // ── Step 2 — OTP + new password → reset in one call ───────────────

  async function handleResetPassword() {
    const next: Record<string, string> = {};
    if (otp.length !== 4) next.otp = "Enter the 4-digit code";
    if (newPassword.length < MIN_PASSWORD)
      next.newPassword = `Password must be at least ${MIN_PASSWORD} characters`;
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    Keyboard.dismiss();
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

  // ── Render ────────────────────────────────────────────────────────

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
          <Animated.View
            className="items-center"
            entering={FadeInDown.duration(400).springify().damping(15)}
          >
            <Image
              source={require("@/assets/images/icon.png")}
              className="mb-3 h-14 w-14 rounded-2xl"
              resizeMode="contain"
            />
            <Text variant="h4">
              {step === "email" ? "Forgot Password?" : "Reset Password"}
            </Text>
            <Text className="mt-2 text-center text-sm text-muted-foreground">
              {step === "email"
                ? "Enter your email and we'll send you a reset code."
                : `Enter the code sent to ${email} and your new password.`}
            </Text>
          </Animated.View>

          {/* ── Step 1: Email ── */}
          {step === "email" && (
            <Animated.View
              className="mt-10 gap-4"
              entering={FadeInDown.delay(80).duration(380).springify().damping(15)}
            >
              <Input
                label="Email"
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
                  <Text className="text-base font-semibold">
                    Send Reset Code
                  </Text>
                )}
              </Button>

              <Pressable onPress={() => router.back()}>
                <Text className="text-center text-sm text-primary">
                  Back to Sign In
                </Text>
              </Pressable>
            </Animated.View>
          )}

          {/* ── Step 2: OTP + New Password ── */}
          {step === "reset" && (
            <Animated.View
              className="mt-10 gap-4"
              entering={FadeInDown.delay(80).duration(380).springify().damping(15)}
            >
              <Input
                label="Reset Code"
                placeholder="0000"
                value={otp}
                onChangeText={(t) => {
                  setOtp(t.replace(/\D/g, "").slice(0, 4));
                  clearError("otp");
                }}
                error={errors.otp}
                keyboardType="number-pad"
                maxLength={4}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <Input
                ref={passwordRef}
                label="New Password"
                placeholder={`Min. ${MIN_PASSWORD} characters`}
                value={newPassword}
                onChangeText={(v) => {
                  setNewPassword(v);
                  clearError("newPassword");
                }}
                error={errors.newPassword}
                secureTextEntry
                toggleable
                returnKeyType="done"
                onSubmitEditing={
                  canSubmitReset ? handleResetPassword : undefined
                }
              />

              <Button
                className="mt-4 h-14 rounded-2xl"
                onPress={handleResetPassword}
                disabled={!canSubmitReset}
              >
                {loading ? (
                  <Spinner color="#fff" />
                ) : (
                  <Text className="text-base font-semibold">
                    Reset Password
                  </Text>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
