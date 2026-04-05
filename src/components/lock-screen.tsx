import { useEffect, useRef, useState } from "react";
import {
  AppState,
  type AppStateStatus,
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
import { AuthCenteredForm } from "@/components/auth/auth-centered-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FullPageLoader, Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast";
import { useAppTheme } from "@/hooks/use-app-theme";
import { ApiClientError } from "@/lib/api";
import { authenticate, getBiometricsAvailability, getBiometricLabel } from "@/lib/biometrics";
import { classifyError } from "@/lib/errors";
import { resolveProfileImageUrl } from "@/lib/profile-image-url";
import { secureStorage, SECURE_KEYS } from "@/lib/secure-storage";
import { resetInactivityTimer } from "@/lib/inactivity";
import { useAppStore, useAuthStore, useHomepageStore, useProfileStore } from "@/store";

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
  const homepageData = useHomepageStore.use.data();
  const profileData = useProfileStore.use.data();
  const login = useAuthStore.use.login();
  const logout = useAuthStore.use.logout();
  const biometricsEnabled = useAppStore.use.biometricsEnabled();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("");
  const [biometricUnlockLoading, setBiometricUnlockLoading] = useState(false);
  /** True after biometric success — show FullPageLoader while signIn runs. */
  const [unlocking, setUnlocking] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  /** Stops auto-trigger after a server/network failure to prevent infinite loop. */
  const serverFailedRef = useRef(false);
  /**
   * After biometric cancel/failure, AppState often goes "active" again and would re-schedule
   * auto biometric indefinitely. Suppress until the user taps the biometric control.
   */
  const suppressAutoBiometricRef = useRef(false);

  const passwordRef = useRef<TextInput>(null);

  const email = user?.email ?? "";
  const firstName = user?.first_name ?? "";
  /** Prefer homepage / profile (fresh) over persisted auth user — sign-in may omit or stale `profile_image`. */
  const profileImageUrl = resolveProfileImageUrl(
    homepageData?.user?.profile_image
      ?? profileData?.user?.profile_image
      ?? user?.profile_image
      ?? null,
  );
  const showProfileAvatar = profileImageUrl !== null && !avatarLoadFailed;
  const canSubmit = password.length > 0 && !loading;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [profileImageUrl]);

  useEffect(() => {
    getBiometricsAvailability().then((a) => {
      setBiometricsAvailable(a.available);
      setBiometricLabel(getBiometricLabel(a));
    });
  }, []);

  // Auto-trigger biometrics only when the app is fully active (foreground).
  // On iOS, Face ID fails without showing the prompt if called before the app has
  // transitioned to active — e.g. when the lock screen mounts while in background.
  const handleBiometricUnlockRef = useRef(handleBiometricUnlock);
  handleBiometricUnlockRef.current = handleBiometricUnlock;

  useEffect(() => {
    if (!biometricsAvailable || !biometricsEnabled) return;

    const triggerAfterDelay = () => {
      if (serverFailedRef.current || suppressAutoBiometricRef.current) return;
      const delay = Platform.OS === "ios" ? 600 : 300;
      return setTimeout(() => {
        if (!serverFailedRef.current && !suppressAutoBiometricRef.current) {
          handleBiometricUnlockRef.current();
        }
      }, delay);
    };

    const checkAndTrigger = (currentState: AppStateStatus) => {
      if (currentState !== "active") return;
      return triggerAfterDelay();
    };

    let timer: ReturnType<typeof setTimeout> | undefined = checkAndTrigger(
      AppState.currentState ?? "background",
    );

    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        timer = triggerAfterDelay();
      }
    });

    return () => {
      sub.remove();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [biometricsAvailable, biometricsEnabled]);

  async function handleUnlock() {
    if (!canSubmit) return;
    Keyboard.dismiss();
    setError("");
    setLoading(true);
    setUnlocking(true);

    try {
      const res = await signIn({ email, password });
      await login(res.data.user, {
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token,
      });

      await secureStorage.set(SECURE_KEYS.USER_PASSWORD, password);

      serverFailedRef.current = false;
      resetInactivityTimer();
      setPassword("");
    } catch {
      setUnlocking(false);
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
        suppressAutoBiometricRef.current = true;
        setError("Authentication failed. Try your password.");
        return;
      }
      setUnlocking(true);

      const storedPassword = await secureStorage.get<string>(
        SECURE_KEYS.USER_PASSWORD,
      );
      if (!storedPassword) {
        suppressAutoBiometricRef.current = true;
        setUnlocking(false);
        setError("Could not retrieve credentials. Please enter your password.");
        return;
      }
      const res = await signIn({ email, password: storedPassword });
      await login(res.data.user, {
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token,
      });
      await secureStorage.set(SECURE_KEYS.USER_PASSWORD, storedPassword);
      serverFailedRef.current = false;
      resetInactivityTimer();
    } catch (e) {
      setUnlocking(false);
      suppressAutoBiometricRef.current = true;
      const classified = classifyError(e);
      if (classified.variant === "warning" || (classified.statusCode && classified.statusCode >= 500)) {
        serverFailedRef.current = true;
        setError("We're experiencing difficulty right now. Please try again later.");
      } else if (e instanceof ApiClientError && e.statusCode === 401) {
        setError("Your credentials have changed. Please enter your password.");
      } else {
        setError("Authentication failed. Try your password.");
      }
    } finally {
      setBiometricUnlockLoading(false);
    }
  }

  function handleManualBiometricTap() {
    suppressAutoBiometricRef.current = false;
    serverFailedRef.current = false;
    handleBiometricUnlock();
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

  if (unlocking) {
    return (
      <View
        className="absolute inset-0 z-50"
        style={{ backgroundColor: isDark ? "#0F172A" : "#FFFFFF" }}
      >
        <FullPageLoader message="Opening..." />
      </View>
    );
  }

  return (
    <View
      className="absolute inset-0 z-50"
      style={{ backgroundColor: isDark ? "#0F172A" : "#FFFFFF" }}
    >
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
          <AuthCenteredForm className="px-8">
          <View className="items-center">
            {showProfileAvatar && profileImageUrl ? (
              <Image
                source={{ uri: profileImageUrl }}
                className="mb-3 h-16 w-16 rounded-full"
                resizeMode="cover"
                onError={() => setAvatarLoadFailed(true)}
                accessibilityLabel="Your profile photo"
              />
            ) : (
              <Image
                source={require("@/assets/images/icon.png")}
                className="mb-3 h-16 w-16 rounded-2xl"
                resizeMode="contain"
                accessibilityLabel="SmiPay"
              />
            )}

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
                onPress={biometricTappable ? handleManualBiometricTap : undefined}
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
          </AuthCenteredForm>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
