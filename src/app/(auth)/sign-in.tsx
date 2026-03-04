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
import { SafeAreaView } from "react-native-safe-area-context";

import { signIn } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { handleApiError } from "@/lib/errors";
import { secureStorage, SECURE_KEYS } from "@/lib/secure-storage";
import { useAuthStore } from "@/store";

const EMAIL_RE = /\S+@\S+\.\S+/;

export default function SignInScreen() {
  const login = useAuthStore.use.login();
  const storeCredentials = useAuthStore.use.storeCredentials();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const passwordRef = useRef<TextInput>(null);

  const isValidEmail = EMAIL_RE.test(email.trim());
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
      router.replace("/(app)/(tabs)");
    } catch (e) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }

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
          <View className="items-center">
            <Image
              source={require("@/assets/images/icon.png")}
              className="mb-3 h-14 w-14 rounded-2xl"
              resizeMode="contain"
            />
            <Text variant="h3" className="text-primary">SmiPay</Text>
            <Text className="mt-1 text-muted-foreground">Welcome back</Text>
          </View>

          <View className="mt-10 gap-4">
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
              returnKeyType="done"
              onSubmitEditing={canSubmit ? handleSignIn : undefined}
            />

            <Link href="/(auth)/forgot-password" asChild>
              <Text className="self-end text-sm text-primary">
                Forgot password?
              </Text>
            </Link>
          </View>

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

          <View className="mt-6 flex-row items-center justify-center gap-1">
            <Text className="text-muted-foreground">
              Do not have an account?
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Text className="font-semibold text-primary">Create one</Text>
            </Link>
          </View>

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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
