import React, { useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { signIn } from "@/api";
import { AuthCenteredForm } from "@/components/auth/auth-centered-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { authenticate, getBiometricsAvailability, getBiometricLabel } from "@/lib/biometrics";
import { ApiClientError } from "@/lib/api";
import { handleApiError } from "@/lib/errors";
import { canUseRequireAuthentication, secureStorage, SECURE_KEYS } from "@/lib/secure-storage";
import { useAuthStore, useAppStore } from "@/store";

const EMAIL_RE = /\S+@\S+\.\S+/;

export default function SignInScreen() {
  const login = useAuthStore.use.login();
  const storeCredentials = useAuthStore.use.storeCredentials();
  const setBiometricsEnabled = useAppStore.use.setBiometricsEnabled();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const passwordRef = useRef<TextInput>(null);

  const isValidEmail = EMAIL_RE.test(email.trim());
  /** Allow legacy alphanumeric passwords; new accounts use 6-digit PIN (validated on sign-up). */
  const canSubmit = isValidEmail && password.length > 0 && !loading;

  function onChangeEmail(v: string) {
    setEmail(v);
    if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
  }

  function onChangePassword(v: string) {
    setPassword(v);
    if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
  }

  function validate() {
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!isValidEmail) next.email = "Enter a valid email";
    if (!password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSignIn() {
    if (!validate()) return;
    Keyboard.dismiss();
    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const res = await signIn({ email: trimmedEmail, password });
      await login(
        res.data.user,
        {
          accessToken: res.data.access_token,
          refreshToken: res.data.refresh_token,
        },
      );
      await storeCredentials(trimmedEmail, password);

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
                await storeCredentials(trimmedEmail, password, canUseRequireAuthentication()
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
        >
          <AuthCenteredForm className="px-6">
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
            <Text className="mt-1 text-muted-foreground">Welcome back</Text>
          </Animated.View>

          <Animated.View
            className="mt-10 gap-4"
            entering={FadeInDown.delay(40).duration(220)}
          >
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={onChangeEmail}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <View>
              <Input
                ref={passwordRef}
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={onChangePassword}
                error={errors.password}
                secureTextEntry
                toggleable
                autoComplete="password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={canSubmit ? handleSignIn : undefined}
              />
              <Text className="mt-1.5 text-xs text-muted-foreground">
                New accounts use a 6-digit password. If you registered earlier, use your existing
                password.
              </Text>
            </View>

            <Link href="/(auth)/forgot-password" asChild>
              <Text className="self-end text-sm text-primary">
                Forgot password?
              </Text>
            </Link>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(80).duration(220)}
          >
            <Button
              className="mt-8 h-14 rounded-2xl"
              onPress={handleSignIn}
              disabled={!canSubmit}
            >
            {loading ? (
              <Spinner color="#fff" />
            ) : (
              <Text className="text-base font-semibold">Sign In</Text>
            )}
            </Button>
          </Animated.View>

          <Animated.View
            className="mt-6 flex-row items-center justify-center gap-1"
            entering={FadeInDown.delay(120).duration(220)}
          >
            <Text className="text-muted-foreground">
              Do not have an account?
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Text className="font-semibold text-primary">Create one</Text>
            </Link>
          </Animated.View>

          {__DEV__ && (
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
