import { useCallback, useState } from "react";
import { BackHandler, Keyboard, Pressable, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { forgotPassword, resetPassword } from "@/api";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  CodeSlots,
  Keypad,
  KeypadDock,
  PinDots,
  useNumericInput,
  type KeypadKey,
} from "@/components/keypad";
import { ArrowButton } from "@/components/ui/arrow-button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast";
import { ApiClientError } from "@/lib/api";
import {
  AUTH_OTP_DIGITS,
  AUTH_PASSWORD_DIGITS,
  isAuthPasswordValid,
} from "@/lib/auth-password";
import { handleApiError } from "@/lib/errors";

type Step = "email" | "code" | "password";

const EMAIL_RE = /\S+@\S+\.\S+/;

/** Heuristic: does a reset failure point at the code rather than the password? */
function looksLikeCodeError(message: string): boolean {
  return /otp|code|expire|invalid|incorrect/i.test(message);
}

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  const code = useNumericInput({
    length: AUTH_OTP_DIGITS,
    onComplete: () => {
      setError("");
      setStep("password");
    },
    onChange: () => setError(""),
  });

  const newPassword = useNumericInput({
    length: AUTH_PASSWORD_DIGITS,
    onComplete: (value) => {
      void handleResetPassword(value);
    },
    onChange: () => setError(""),
  });

  const canSubmitEmail = EMAIL_RE.test(email.trim()) && !loading;

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

  async function handleRequestOtp() {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Enter a valid email address");
      setShakeKey((k) => k + 1);
      return;
    }

    Keyboard.dismiss();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(trimmed.toLowerCase());
      code.clear();
      newPassword.clear();
      setStep("code");
      startResendCooldown();
    } catch (e) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      code.clear();
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

  async function handleResetPassword(passwordValue: string = newPassword.value) {
    if (code.value.length !== AUTH_OTP_DIGITS) {
      setStep("code");
      setError("Enter the full reset code first");
      setShakeKey((k) => k + 1);
      return;
    }
    if (!isAuthPasswordValid(passwordValue)) {
      setError(`Use exactly ${AUTH_PASSWORD_DIGITS} digits`);
      setShakeKey((k) => k + 1);
      return;
    }
    if (loading) return;

    Keyboard.dismiss();
    setError("");
    setLoading(true);
    try {
      await resetPassword({
        email: email.trim().toLowerCase(),
        otp: code.value,
        new_password: passwordValue,
      });
      useToastStore.getState().show({
        variant: "success",
        title: "Password Reset",
        message: "Your password has been reset. Sign in with your new password.",
      });
      router.replace("/(auth)/sign-in");
    } catch (e) {
      const message =
        e instanceof ApiClientError
          ? e.message
          : "We couldn't reset your password. Please try again.";
      newPassword.clear();
      setShakeKey((k) => k + 1);
      // A bad/expired code is fixed on the code step, so send the user back there.
      if (e instanceof ApiClientError && e.statusCode !== 500 && looksLikeCodeError(message)) {
        setStep("code");
        code.clear();
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setError("");
    if (step === "code") {
      setStep("email");
    } else if (step === "password") {
      setStep("code");
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

  const resendKey: KeypadKey = {
    type: "action",
    id: "resend",
    label: resendCooldown > 0 ? `${resendCooldown}s` : "Resend",
    ghost: true,
    disabled: resendCooldown > 0 || loading,
    accessibilityLabel:
      resendCooldown > 0
        ? `Resend available in ${resendCooldown} seconds`
        : "Resend reset code",
    onPress: () => void handleResendOtp(),
  };

  const title =
    step === "email"
      ? "Forgot password?"
      : step === "code"
        ? "Enter reset code"
        : "Set a new password";

  const subtitle =
    step === "email"
      ? "Enter your account email and we'll send a reset code."
      : step === "code"
        ? `We sent a 6-digit code to ${email}.`
        : `Choose a new ${AUTH_PASSWORD_DIGITS}-digit login password.`;

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      showVersion={step === "email"}
      bottom={
        step === "code" ? (
          <KeypadDock secure title="SmiPay Secure Keypad">
            <Keypad
              controller={code}
              disabled={loading}
              leftKey={resendKey}
              backspaceBehavior="clear"
            />
          </KeypadDock>
        ) : step === "password" ? (
          <KeypadDock secure title="SmiPay Secure Keypad">
            <Keypad
              controller={newPassword}
              disabled={loading}
              backspaceBehavior="clear"
            />
          </KeypadDock>
        ) : undefined
      }
    >
      {step === "email" ? (
        <View className="mt-9">
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setError("");
            }}
            error={error || undefined}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={canSubmitEmail ? handleRequestOtp : undefined}
          />

          <View className="mt-7 flex-row items-center justify-between">
            <Pressable
              onPress={() => router.replace("/(auth)/sign-in")}
              hitSlop={10}
              accessibilityRole="button"
              className="active:opacity-70"
            >
              <Text className="text-sm font-semibold text-primary">
                Back to sign in
              </Text>
            </Pressable>

            <ArrowButton
              onPress={handleRequestOtp}
              disabled={!canSubmitEmail}
              loading={loading}
              accessibilityLabel="Send reset code"
              testID="forgot-send-code"
            />
          </View>
        </View>
      ) : step === "code" ? (
        <View className="mt-9">
          <CodeSlots
            value={code.value}
            length={AUTH_OTP_DIGITS}
            variant="underline"
            focused={!loading}
            error={Boolean(error)}
            shakeKey={shakeKey}
            slotHeight={54}
            accessibilityLabel="Password reset code"
          />

          {error ? (
            <Text className="mt-4 text-sm font-medium text-destructive">
              {error}
            </Text>
          ) : null}

          <View className="mt-7">
            <Text className="text-sm text-muted-foreground">
              Didn&apos;t get it?{" "}
              <Text
                className={
                  resendCooldown > 0
                    ? "text-sm text-muted-foreground"
                    : "text-sm font-semibold text-primary"
                }
                onPress={resendCooldown > 0 ? undefined : () => void handleResendOtp()}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </Text>
            </Text>
          </View>
        </View>
      ) : (
        <View className="mt-9">
          <Text className="text-[13px] font-medium text-muted-foreground">
            New {AUTH_PASSWORD_DIGITS}-digit password
          </Text>
          <PinDots
            value={newPassword.value}
            length={AUTH_PASSWORD_DIGITS}
            error={Boolean(error)}
            shakeKey={shakeKey}
            style={{ justifyContent: "flex-start", marginTop: 18 }}
          />

          {error ? (
            <Text className="mt-4 text-sm font-medium text-destructive">
              {error}
            </Text>
          ) : (
            <Text className="mt-4 text-sm text-muted-foreground">
              This replaces the password you use to sign in.
            </Text>
          )}

          <View className="mt-7 flex-row justify-end">
            <ArrowButton
              onPress={() => void handleResetPassword()}
              disabled={newPassword.value.length !== AUTH_PASSWORD_DIGITS || loading}
              loading={loading}
              accessibilityLabel="Reset password"
              testID="forgot-reset-submit"
            />
          </View>
        </View>
      )}
    </AuthShell>
  );
}
