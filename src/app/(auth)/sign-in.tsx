import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  Pressable,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { signIn } from "@/api";
import { AuthCenteredForm } from "@/components/auth/auth-centered-form";
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useKeyboardVisible } from "@/hooks/use-keyboard-visible";
import {
  isValidAuthIdentifier,
  maskAuthIdentifier,
  normalizeAuthIdentifier,
  sanitizeAuthIdentifier,
  toSignInIdentifier,
} from "@/lib/auth-identifier";
import { authenticate, getBiometricsAvailability, getBiometricLabel } from "@/lib/biometrics";
import { ApiClientError } from "@/lib/api";
import { handleApiError } from "@/lib/errors";
import { logSignIn, setAnalyticsUser } from "@/lib/analytics";
import { canUseRequireAuthentication, secureStorage, SECURE_KEYS } from "@/lib/secure-storage";
import { useAuthStore, useAppStore } from "@/store";

type Step = "identifier" | "password";

export default function SignInScreen() {
  const login = useAuthStore.use.login();
  const storeCredentials = useAuthStore.use.storeCredentials();
  const setBiometricsEnabled = useAppStore.use.setBiometricsEnabled();

  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [maskedIdentifier, setMaskedIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  const passwordRef = useRef<TextInput>(null);
  const keyboardVisible = useKeyboardVisible();

  const canProceed =
    isValidAuthIdentifier(identifier) && !loading;
  /** Allow legacy alphanumeric passwords; new accounts use 6-digit PIN (validated on sign-up). */
  const canSubmit = password.length > 0 && !loading;

  useEffect(() => {
    if (step !== "password") return;
    const id = setTimeout(() => passwordRef.current?.focus(), 280);
    return () => clearTimeout(id);
  }, [step]);

  function clearError(key: keyof typeof errors) {
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  }

  function validateIdentifier() {
    const trimmed = identifier.trim();
    if (!trimmed) {
      setErrors({ identifier: "Email or phone number is required" });
      return false;
    }
    if (!isValidAuthIdentifier(trimmed)) {
      setErrors({
        identifier: "Enter a valid email or phone (e.g. 08012345678 or +2348012345678)",
      });
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
    setPassword("");
    setErrors({});
    setStep("password");
  }

  async function handleBack() {
    Keyboard.dismiss();
    const stored = await secureStorage.get<string>(SECURE_KEYS.SIGN_IN_IDENTIFIER);
    if (stored) setIdentifier(stored);
    await secureStorage.remove(SECURE_KEYS.SIGN_IN_IDENTIFIER);
    setPassword("");
    setMaskedIdentifier("");
    setErrors({});
    setStep("identifier");
  }

  async function handleSignIn() {
    if (!password) {
      setErrors({ password: "Password is required" });
      return;
    }

    const storedIdentifier = await secureStorage.get<string>(SECURE_KEYS.SIGN_IN_IDENTIFIER);
    if (!storedIdentifier) {
      setStep("identifier");
      setErrors({ identifier: "Enter your email or phone number to continue" });
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    try {
      const signInIdentifier = toSignInIdentifier(storedIdentifier);
      const res = await signIn({ email: signInIdentifier, password });
      const accountEmail = res.data.user.email?.trim().toLowerCase() ?? signInIdentifier;

      await login(
        res.data.user,
        {
          accessToken: res.data.access_token,
          refreshToken: res.data.refresh_token,
        },
      );
      await storeCredentials(accountEmail, password);
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
              });
              if (result.success) {
                await storeCredentials(accountEmail, password, canUseRequireAuthentication()
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
      if (e instanceof ApiClientError && e.statusCode === 401) {
        setErrors({ password: e.message || "Invalid email or password" });
      } else {
        handleApiError(e);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: keyboardVisible ? "flex-start" : "center",
          paddingVertical: 24,
        }}
        keyboardDismissMode="on-drag"
        bottomOffset={28}
      >
        <AuthCenteredForm layout={keyboardVisible ? "top" : "center"} className="px-6">
          <Animated.View
            className="items-center"
            entering={FadeInDown.duration(220)}
          >
            <Image
              source={require("@/assets/images/icon.png")}
              className="mb-3 h-14 w-14 rounded-2xl"
              resizeMode="contain"
            />
            <Text variant="h3" className="text-primary">SmiPay</Text>
            <Text className="mt-1 text-muted-foreground">
              {step === "identifier" ? "Welcome back" : "Enter your password"}
            </Text>
            {step === "password" && maskedIdentifier ? (
              <Text className="mt-1 text-sm text-muted-foreground">
                Signing in as {maskedIdentifier}
              </Text>
            ) : null}
          </Animated.View>

          {step === "identifier" && (
            <Animated.View
              className="mt-10 gap-4"
              entering={FadeInDown.delay(40).duration(220)}
            >
              <Input
                label="Email or Phone"
                placeholder="Email or Phone"
                value={identifier}
                onChangeText={(v) => {
                  setIdentifier(sanitizeAuthIdentifier(v));
                  clearError("identifier");
                }}
                error={errors.identifier}
                autoCapitalize="none"
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={canProceed ? handleProceed : undefined}
              />

              <Button
                className="mt-4 h-14 rounded-2xl"
                onPress={handleProceed}
                disabled={!canProceed}
              >
                {loading ? (
                  <Spinner color="#fff" />
                ) : (
                  <Text className="text-base font-semibold">Proceed</Text>
                )}
              </Button>

              <Animated.View
                className="flex-row items-center justify-center gap-1"
                entering={FadeInDown.delay(80).duration(220)}
              >
                <Text className="text-muted-foreground">
                  Do not have an account?
                </Text>
                <Link href="/(auth)/sign-up" asChild>
                  <Text className="font-semibold text-primary">Create one</Text>
                </Link>
              </Animated.View>
            </Animated.View>
          )}

          {step === "password" && (
            <Animated.View
              className="mt-10 gap-4"
              entering={FadeInDown.delay(40).duration(220)}
            >
              <View>
                <Input
                  ref={passwordRef}
                  label="Password"
                  placeholder="Enter 6-digit Password"
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    clearError("password");
                  }}
                  error={errors.password}
                  secureTextEntry
                  toggleable
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={canSubmit ? handleSignIn : undefined}
                />
              </View>

              <Link href="/(auth)/forgot-password" asChild>
                <Text className="self-end text-sm text-primary">
                  Forgot password?
                </Text>
              </Link>

              <Button
                className="mt-4 h-14 rounded-2xl"
                onPress={handleSignIn}
                disabled={!canSubmit}
              >
                {loading ? (
                  <Spinner color="#fff" />
                ) : (
                  <Text className="text-base font-semibold">Sign In</Text>
                )}
              </Button>

              <Pressable onPress={handleBack} accessibilityRole="button">
                <Text className="text-center text-sm text-primary">
                  Back
                </Text>
              </Pressable>
            </Animated.View>
          )}

          {__DEV__ && step === "identifier" && (
            <Pressable
              className="mt-10 self-center"
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
                        await AsyncStorage.clear();
                        await secureStorage.clear([
                          SECURE_KEYS.ACCESS_TOKEN,
                          SECURE_KEYS.REFRESH_TOKEN,
                          SECURE_KEYS.USER_EMAIL,
                          SECURE_KEYS.USER_PASSWORD,
                          SECURE_KEYS.SIGN_IN_IDENTIFIER,
                        ]);
                        useAuthStore.getState().logout();
                        router.replace("/");
                      },
                    },
                  ],
                )
              }
            >
              <Text className="text-xs text-red-400">
                [DEV] Clear app data
              </Text>
            </Pressable>
          )}
        </AuthCenteredForm>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
