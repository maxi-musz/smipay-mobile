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
import { AuthCenteredForm } from "@/components/auth/auth-centered-form";
import { AuthVersionFooter } from "@/components/auth/auth-version-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import {
  AUTH_OTP_DIGITS,
  AUTH_PASSWORD_DIGITS,
  isAuthPasswordValid,
} from "@/lib/auth-password";
import { handleApiError } from "@/lib/errors";
import { useToastStore } from "@/components/ui/toast";
type Step = "email" | "reset";

const EMAIL_RE = /\S+@\S+\.\S+/;

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
    otp.length === AUTH_OTP_DIGITS &&
    isAuthPasswordValid(newPassword) &&
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
    if (otp.length !== AUTH_OTP_DIGITS)
      next.otp = `Enter the ${AUTH_OTP_DIGITS}-digit code`;
    if (!isAuthPasswordValid(newPassword))
      next.newPassword = `Use exactly ${AUTH_PASSWORD_DIGITS} digits (0–9)`;
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
        enabled={Platform.OS === "ios"}
        behavior="padding"
        className="flex-1"
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingVertical: 24,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={false}
        >
          <AuthCenteredForm layout="top" className="px-6">
          {/* Header */}
          <Animated.View
            className="items-center"
            entering={FadeInDown.duration(220)}
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
              entering={FadeInDown.delay(40).duration(220)}
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
              entering={FadeInDown.delay(40).duration(220)}
            >
              <Input
                label="Reset Code"
                placeholder="000000"
                value={otp}
                onChangeText={(t) => {
                  setOtp(t.replace(/\D/g, "").slice(0, AUTH_OTP_DIGITS));
                  clearError("otp");
                }}
                error={errors.otp}
                keyboardType="number-pad"
                maxLength={AUTH_OTP_DIGITS}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <View>
                <Input
                  ref={passwordRef}
                  label="New Password"
                  placeholder="••••••"
                  value={newPassword}
                  onChangeText={(v) => {
                    setNewPassword(v.replace(/\D/g, "").slice(0, AUTH_PASSWORD_DIGITS));
                    clearError("newPassword");
                  }}
                  error={errors.newPassword}
                  secureTextEntry
                  toggleable
                  keyboardType="number-pad"
                  maxLength={AUTH_PASSWORD_DIGITS}
                  returnKeyType="done"
                  onSubmitEditing={
                    canSubmitReset ? handleResetPassword : undefined
                  }
                />
                <Text className="mt-1.5 text-xs text-muted-foreground">
                  Exactly {AUTH_PASSWORD_DIGITS} numbers — same as sign-in password
                </Text>
              </View>

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
          </AuthCenteredForm>
        </ScrollView>
      </KeyboardAvoidingView>
      <AuthVersionFooter />
    </SafeAreaView>
  );
}
