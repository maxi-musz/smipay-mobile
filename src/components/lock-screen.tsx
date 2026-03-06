import { useEffect, useRef, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { logout as logoutApi, removePushToken, signIn } from "@/api";
import {
  clearLastRegisteredToken,
  getLastRegisteredToken,
} from "@/lib/push-notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast";
import { useAppTheme } from "@/hooks/use-app-theme";
import { authenticate, getBiometricsAvailability, getBiometricLabel } from "@/lib/biometrics";
import { canUseRequireAuthentication, secureStorage, SECURE_KEYS } from "@/lib/secure-storage";
import { resetInactivityTimer } from "@/lib/inactivity";
import { useAppStore, useAuthStore } from "@/store";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

const BIOMETRIC_ICON_SIZE = 48;

export function LockScreen() {
  const { isDark } = useAppTheme();
  const user = useAuthStore.use.user();
  const login = useAuthStore.use.login();
  const logout = useAuthStore.use.logout();
  const biometricsEnabled = useAppStore.use.biometricsEnabled();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("");
  const [biometricUnlockLoading, setBiometricUnlockLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const email = user?.email ?? "";
  const firstName = user?.first_name ?? "";
  const canSubmit = password.length > 0 && !loading;

  const hasAutoTriggeredRef = useRef(false);

  useEffect(() => {
    getBiometricsAvailability().then((a) => {
      setBiometricsAvailable(a.available);
      setBiometricLabel(getBiometricLabel(a));
    });
  }, []);

  // Auto-trigger biometrics once availability state has updated.
  // Separate effect so biometricsAvailable is true when handleBiometricUnlock runs.
  useEffect(() => {
    if (biometricsAvailable && biometricsEnabled && !hasAutoTriggeredRef.current) {
      hasAutoTriggeredRef.current = true;
      handleBiometricUnlock();
    }
  }, [biometricsAvailable, biometricsEnabled]);

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

  async function handleBiometricUnlock() {
    if (!biometricsAvailable || !biometricsEnabled || biometricUnlockLoading) return;
    setError("");
    setBiometricUnlockLoading(true);
    try {
      const authResult = await authenticate({
        promptMessage: "Unlock SmiPay",
      });
      if (!authResult.success) {
        setError("Authentication failed. Try your password.");
        return;
      }
      const getOptions =
        Platform.OS === "ios" && canUseRequireAuthentication()
          ? { requireAuthentication: true as const, authenticationPrompt: "Unlock SmiPay" }
          : undefined;
      const storedPassword = await secureStorage.get<string>(
        SECURE_KEYS.USER_PASSWORD,
        getOptions,
      );
      if (!storedPassword) {
        setError("Could not retrieve credentials. Please enter your password.");
        return;
      }
      const res = await signIn({ email, password: storedPassword });
      await login(res.data.user, {
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token,
      });
      await secureStorage.set(SECURE_KEYS.USER_PASSWORD, storedPassword);
      resetInactivityTimer();
    } catch {
      setError("Authentication failed. Try your password.");
    } finally {
      setBiometricUnlockLoading(false);
    }
  }

  const showBiometricIcon = biometricsAvailable || biometricsEnabled;
  const biometricTappable = biometricsAvailable && biometricsEnabled && !biometricUnlockLoading;

  async function handleSignOut() {
    try {
      const pushToken = getLastRegisteredToken();
      if (pushToken) await removePushToken(pushToken);
      clearLastRegisteredToken();
    } catch {
      // Proceed even if push remove failsdals
    }
    try {
      await logoutApi();
    } catch {
      // Ignore
    }
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
              returnKeyType="done"
              onSubmitEditing={canSubmit ? handleUnlock : undefined}
            />

            <Pressable className="mt-2 self-end">
              <Text className="text-sm text-primary">Forgot Password?</Text>
            </Pressable>
          </View>

          {showBiometricIcon && (
            <View className="mt-6 items-center">
              <Pressable
                onPress={biometricTappable ? handleBiometricUnlock : undefined}
                disabled={!biometricTappable}
                className="items-center justify-center active:opacity-70"
                style={{
                  width: BIOMETRIC_ICON_SIZE + 16,
                  height: BIOMETRIC_ICON_SIZE + 16,
                }}
              >
                <View
                  className="items-center justify-center rounded-full"
                  style={{
                    width: BIOMETRIC_ICON_SIZE,
                    height: BIOMETRIC_ICON_SIZE,
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6",
                  }}
                >
                  <Ionicons
                    name="scan-outline"
                    size={28}
                    color={biometricTappable ? "#F4831F" : (isDark ? "#6B7280" : "#9CA3AF")}
                  />
                  {!biometricsAvailable && (
                    <View
                      className="absolute"
                      style={{
                        width: BIOMETRIC_ICON_SIZE,
                        height: BIOMETRIC_ICON_SIZE,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      pointerEvents="none"
                    >
                      <View
                        style={{
                          width: BIOMETRIC_ICON_SIZE * 1.2,
                          height: 2,
                          backgroundColor: "#EF4444",
                          transform: [{ rotate: "45deg" }],
                        }}
                      />
                      <View
                        style={{
                          position: "absolute",
                          width: BIOMETRIC_ICON_SIZE * 1.2,
                          height: 2,
                          backgroundColor: "#EF4444",
                          transform: [{ rotate: "-45deg" }],
                        }}
                      />
                    </View>
                  )}
                </View>
                <Text
                  className="mt-2 text-xs text-muted-foreground"
                  numberOfLines={1}
                >
                  {biometricTappable
                    ? biometricUnlockLoading
                      ? "Authenticating…"
                      : `Unlock with ${biometricLabel}`
                    : "Not available on this device"}
                </Text>
              </Pressable>
            </View>
          )}

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
