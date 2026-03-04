import { useRef, useState } from "react";
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

import { signIn } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast";
import { useAppTheme } from "@/hooks/use-app-theme";
import { secureStorage, SECURE_KEYS } from "@/lib/secure-storage";
import { resetInactivityTimer } from "@/lib/inactivity";
import { useAuthStore } from "@/store";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

export function LockScreen() {
  const { isDark } = useAppTheme();
  const user = useAuthStore.use.user();
  const login = useAuthStore.use.login();
  const logout = useAuthStore.use.logout();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordRef = useRef<TextInput>(null);

  const email = user?.email ?? "";
  const firstName = user?.first_name ?? "";
  const canSubmit = password.length > 0 && !loading;

  async function handleUnlock() {
    if (!canSubmit) return;
    Keyboard.dismiss();
    setError("");
    setLoading(true);

    try {
      const res = await signIn({ email, password });
      await login(res.data.user, {
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token,
      });

      await secureStorage.set(SECURE_KEYS.USER_PASSWORD, password);

      resetInactivityTimer();
      setPassword("");
    } catch {
      setError("Incorrect password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await logout();
    useToastStore.getState().show({
      variant: "success",
      title: "Signed Out",
      message: "You have been signed out successfully.",
    });
    router.replace("/(auth)/sign-in");
  }

  return (
    <View
      className="absolute inset-0 z-50"
      style={{ backgroundColor: isDark ? "#0F172A" : "#FFFFFF" }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-8 py-12"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center">
            <Image
              source={require("@/assets/images/icon.png")}
              className="mb-3 h-16 w-16 rounded-2xl"
              resizeMode="contain"
            />

            {firstName ? (
              <Text className="mt-1 text-lg font-semibold text-foreground">
                {firstName}
              </Text>
            ) : null}

            <Text className="mt-1 text-sm text-muted-foreground">
              {maskEmail(email)}
            </Text>
          </View>

          <View className="mt-10">
            <Input
              ref={passwordRef}
              placeholder="Enter Password"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (error) setError("");
              }}
              error={error}
              secureTextEntry
              toggleable
              autoComplete="password"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={canSubmit ? handleUnlock : undefined}
            />

            <Pressable className="mt-2 self-end">
              <Text className="text-sm text-primary">Forgot Password?</Text>
            </Pressable>
          </View>

          <Button
            className="mt-8 h-14 rounded-2xl"
            onPress={handleUnlock}
            disabled={!canSubmit}
          >
            {loading ? (
              <Spinner color="#fff" />
            ) : (
              <Text className="text-base font-semibold">Log in</Text>
            )}
          </Button>

          <Pressable className="mt-8 self-center" onPress={handleSignOut}>
            <Text className="text-sm text-primary">
              Switch Account
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
