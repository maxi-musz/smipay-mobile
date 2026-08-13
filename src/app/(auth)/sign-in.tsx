import { useCallback, useState } from "react";
import { Alert, BackHandler, DevSettings, Keyboard, Pressable, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, router, useFocusEffect } from "expo-router";

import { signIn } from "@/api";
import { AuthShell } from "@/components/auth/auth-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { PhoneNumberDisplay } from "@/components/auth/phone-number-display";
import {
  Keypad,
  KeypadDock,
  PinDots,
  useNumericInput,
  type KeypadKey,
} from "@/components/keypad";
import { ArrowButton, ArrowButtonRow } from "@/components/ui/arrow-button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import {
  isValidAuthIdentifier,
  isValidPhoneIdentifier,
  maskAuthIdentifier,
  normalizeAuthIdentifier,
  sanitizeAuthIdentifier,
  toSignInIdentifier,
} from "@/lib/auth-identifier";
import { AUTH_PASSWORD_DIGITS } from "@/lib/auth-password";
import { authenticate, getBiometricsAvailability, getBiometricLabel } from "@/lib/biometrics";
import { ApiClientError } from "@/lib/api";
import { handleApiError } from "@/lib/errors";
import { logSignIn, setAnalyticsUser } from "@/lib/analytics";
import { canUseRequireAuthentication, secureStorage, SECURE_KEYS } from "@/lib/secure-storage";
import { useAuthStore, useAppStore, useSmileaiStore } from "@/store";

type Step = "identifier" | "password";
/** Phone is the primary sign-in identifier; email is the fallback. */
type IdentifierMode = "phone" | "email";

const PHONE_DIGITS = 11;

export default function SignInScreen() {
  const login = useAuthStore.use.login();
  const storeCredentials = useAuthStore.use.storeCredentials();
  const setBiometricsEnabled = useAppStore.use.setBiometricsEnabled();

  const [step, setStep] = useState<Step>("identifier");
  const [identifierMode, setIdentifierMode] = useState<IdentifierMode>("phone");
  const [identifier, setIdentifier] = useState("");
  const [maskedIdentifier, setMaskedIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [shakeKey, setShakeKey] = useState(0);

  const phone = useNumericInput({
    maxLength: PHONE_DIGITS,
    onChange: (value) => {
      setIdentifier(value);
      clearError("identifier");
    },
  });

  const pin = useNumericInput({
    length: AUTH_PASSWORD_DIGITS,
    onComplete: (value) => {
      void handleSignIn(value);
    },
    onChange: () => clearError("password"),
  });

  const canProceed = isValidAuthIdentifier(identifier) && !loading;
  const canSubmit = pin.value.length > 0 && !loading;

  function clearError(key: keyof typeof errors) {
    setErrors((p) => (p[key] ? { ...p, [key]: undefined } : p));
  }

  /** Carries the typed value across so switching modes never costs input. */
  function switchIdentifierMode(next: IdentifierMode) {
    setIdentifierMode(next);
    setErrors({});
    if (next === "phone") {
      Keyboard.dismiss();
      const digits = identifier.replace(/\D/g, "").slice(0, PHONE_DIGITS);
      phone.setValue(digits);
      setIdentifier(digits);
    } else {
      setIdentifier(phone.value);
    }
  }

  function validateIdentifier() {
    const trimmed = identifier.trim();
    if (!trimmed) {
      setErrors({
        identifier:
          identifierMode === "phone"
            ? "Enter your phone number"
            : "Email address is required",
      });
      setShakeKey((k) => k + 1);
      return false;
    }
    if (!isValidAuthIdentifier(trimmed)) {
      setErrors({
        identifier:
          identifierMode === "phone"
            ? "Enter a valid phone number (e.g. 08012345678)"
            : "Enter a valid email address",
      });
      setShakeKey((k) => k + 1);
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleProceed() {
    if (!validateIdentifier()) return;
    Keyboard.dismiss();

    const normalized = normalizeAuthIdentifier(identifier);
    await secureStorage.set(SECURE_KEYS.SIGN_IN_IDENTIFIER, normalized);
    setMaskedIdentifier(maskAuthIdentifier(normalized));
    setIdentifier("");
    phone.clear();
    pin.clear();
    setErrors({});
    setStep("password");
  }

  async function handleBack() {
    Keyboard.dismiss();
    const stored = await secureStorage.get<string>(SECURE_KEYS.SIGN_IN_IDENTIFIER);
    if (stored) {
      // Restore into whichever field can actually hold the value.
      if (isValidPhoneIdentifier(stored) && !stored.startsWith("+")) {
        setIdentifierMode("phone");
        phone.setValue(stored);
        setIdentifier(stored);
      } else {
        setIdentifierMode("email");
        setIdentifier(stored);
      }
    }
    await secureStorage.remove(SECURE_KEYS.SIGN_IN_IDENTIFIER);
    pin.clear();
    setMaskedIdentifier("");
    setErrors({});
    setStep("identifier");
  }

  useFocusEffect(
    useCallback(() => {
      if (step !== "password") return;

      const onHardwareBack = () => {
        void handleBack();
        return true;
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", onHardwareBack);
      return () => sub.remove();
    }, [step]),
  );

  async function handleSignIn(value: string = pin.value) {
    if (!value) {
      setErrors({ password: "Password is required" });
      setShakeKey((k) => k + 1);
      return;
    }
    if (loading) return;

    const storedIdentifier = await secureStorage.get<string>(SECURE_KEYS.SIGN_IN_IDENTIFIER);
    if (!storedIdentifier) {
      setStep("identifier");
      setErrors({ identifier: "Enter your phone number or email to continue" });
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    try {
      const signInIdentifier = toSignInIdentifier(storedIdentifier);
      const res = await signIn({ email: signInIdentifier, password: value });
      const accountEmail = res.data.user.email?.trim().toLowerCase() ?? signInIdentifier;

      await login(
        res.data.user,
        {
          accessToken: res.data.access_token,
          refreshToken: res.data.refresh_token,
        },
      );
      await storeCredentials(accountEmail, value);
      await secureStorage.remove(SECURE_KEYS.SIGN_IN_IDENTIFIER);
      void logSignIn();
      void setAnalyticsUser(res.data.user.id);

      const availability = await getBiometricsAvailability();
      if (!availability.available) {
        router.replace("/(app)/(tabs)");
        return;
      }

      const label = getBiometricLabel(availability);
      Alert.alert(
        "Unlock with " + label + "?",
        "Use " + label + " to unlock SmiPay next time you open the app.",
        [
          {
            text: "Not now",
            style: "cancel",
            onPress: () => router.replace("/(app)/(tabs)"),
          },
          {
            text: "Yes",
            onPress: async () => {
              const result = await authenticate({
                promptMessage: "Use " + label + " to unlock SmiPay",
                disableDeviceFallback: true,
              });
              if (result.success) {
                await storeCredentials(accountEmail, value, canUseRequireAuthentication()
                  ? { requireAuthentication: true }
                  : undefined);
                setBiometricsEnabled(true);
              }
              router.replace("/(app)/(tabs)");
            },
          },
        ],
      );
    } catch (e) {
      // Wipe the entry so a rejected attempt starts fresh instead of being edited.
      pin.clear();
      setShakeKey((k) => k + 1);
      if (e instanceof ApiClientError && e.statusCode === 401) {
        setErrors({ password: e.message || "Incorrect password. Please try again." });
      } else {
        handleApiError(e);
      }
    } finally {
      setLoading(false);
    }
  }

  const showIdentifierKeypad = step === "identifier" && identifierMode === "phone";
  const showPasswordKeypad = step === "password";

  const emailSwitchKey: KeypadKey = {
    type: "action",
    id: "email-mode",
    label: "Email",
    ghost: true,
    accessibilityLabel: "Sign in with email instead",
    onPress: () => switchIdentifierMode("email"),
  };

  return (
    <AuthShell
      title={step === "identifier" ? "Welcome back" : "Enter your password"}
      subtitle={
        step === "identifier"
          ? identifierMode === "phone"
            ? "Sign in with the phone number on your SmiPay account."
            : "Sign in with the email on your SmiPay account."
          : maskedIdentifier
            ? `Signing in as ${maskedIdentifier}`
            : undefined
      }
      headerRight={step === "identifier" ? <ThemeToggle /> : undefined}
      showVersion={!showIdentifierKeypad && !showPasswordKeypad}
      footer={
        step === "identifier" ? (
          <View className="items-center gap-3 pb-1">
            <Text className="text-center text-sm text-muted-foreground">
              {"Don't have an account? "}
              <Link href="/(auth)/sign-up" asChild>
                <Text className="text-sm font-medium text-primary">Create one</Text>
              </Link>
            </Text>
            {__DEV__ ? <DevClearAppData /> : null}
          </View>
        ) : undefined
      }
      bottom={
        showIdentifierKeypad ? (
          <KeypadDock>
            <Keypad
              controller={phone}
              disabled={loading}
              leftKey={emailSwitchKey}
              backspaceBehavior="clear"
            />
          </KeypadDock>
        ) : showPasswordKeypad ? (
          <KeypadDock secure title="SmiPay Secure Keypad">
            <Keypad
              controller={pin}
              disabled={loading}
              backspaceBehavior="clear"
            />
          </KeypadDock>
        ) : undefined
      }
    >
      {step === "identifier" ? (
        <View className="mt-9">
          {identifierMode === "phone" ? (
            <PhoneNumberDisplay
              value={phone.value}
              error={errors.identifier}
              focused={!loading}
              shakeKey={shakeKey}
            />
          ) : (
            <Input
              label="Email address"
              placeholder="you@example.com"
              value={identifier}
              onChangeText={(v) => {
                setIdentifier(sanitizeAuthIdentifier(v));
                clearError("identifier");
              }}
              error={errors.identifier}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              autoFocus
              returnKeyType="next"
              onSubmitEditing={canProceed ? handleProceed : undefined}
            />
          )}

          {identifierMode === "phone" ? (
            <ArrowButtonRow className="mt-6">
              <ArrowButton
                onPress={handleProceed}
                disabled={!canProceed}
                loading={loading}
                accessibilityLabel="Proceed"
                testID="sign-in-proceed"
              />
            </ArrowButtonRow>
          ) : (
            <View className="mt-7 flex-row items-center justify-between">
              <Pressable
                onPress={() => switchIdentifierMode("phone")}
                hitSlop={10}
                accessibilityRole="button"
                className="active:opacity-70"
              >
                <Text className="text-sm text-muted-foreground">Use phone number</Text>
              </Pressable>

              <ArrowButton
                onPress={handleProceed}
                disabled={!canProceed}
                loading={loading}
                accessibilityLabel="Proceed"
                testID="sign-in-proceed"
              />
            </View>
          )}
        </View>
      ) : (
        <View className="mt-9">
          <Text className="text-[13px] font-medium text-muted-foreground">
            {AUTH_PASSWORD_DIGITS}-digit password
          </Text>
          <PinDots
            value={pin.value}
            length={AUTH_PASSWORD_DIGITS}
            error={Boolean(errors.password)}
            shakeKey={shakeKey}
            style={{ justifyContent: "flex-start", marginTop: 18 }}
          />
          {errors.password ? (
            <Text className="mt-4 text-sm font-medium text-destructive">
              {errors.password}
            </Text>
          ) : null}

          <View className="mt-7 flex-row items-center justify-between">
            <Link href="/(auth)/forgot-password" asChild>
              <Text className="text-sm font-semibold text-primary">
                Forgot password?
              </Text>
            </Link>

            <ArrowButton
              onPress={() => void handleSignIn()}
              disabled={!canSubmit}
              loading={loading}
              accessibilityLabel="Sign in"
              testID="sign-in-submit"
            />
          </View>
        </View>
      )}
    </AuthShell>
  );
}

function DevClearAppData() {
  return (
    <Pressable
      className="active:opacity-70"
      onPress={() =>
        Alert.alert(
          "Clear App Data",
          "This will reset onboarding, auth, theme, and all local data. Continue?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Clear",
              style: "destructive",
              onPress: async () => {
                // Clear disk first, then in-memory Zustand stores. Without
                // the store resets, smileai UI prefs (e.g. suggested
                // replies) stay in RAM and get re-persisted after clear.
                await AsyncStorage.clear();
                await secureStorage.clear([
                  SECURE_KEYS.ACCESS_TOKEN,
                  SECURE_KEYS.REFRESH_TOKEN,
                  SECURE_KEYS.USER_EMAIL,
                  SECURE_KEYS.USER_PASSWORD,
                  SECURE_KEYS.SIGN_IN_IDENTIFIER,
                ]);
                useSmileaiStore.getState().reset();
                useAppStore.getState().reset();
                useAuthStore.getState().logout();
                if (__DEV__ && typeof DevSettings.reload === "function") {
                  DevSettings.reload();
                } else {
                  router.replace("/");
                }
              },
            },
          ],
        )
      }
    >
      <Text className="text-[11px] text-muted-foreground/70">Clear app data</Text>
    </Pressable>
  );
}
