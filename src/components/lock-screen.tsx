import { useEffect, useRef, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  Image,
  Keyboard,
  Platform,
  Pressable,
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
import { AuthShell } from "@/components/auth/auth-shell";
import {
  Keypad,
  KeypadDock,
  PinDots,
  useNumericInput,
  type KeypadKey,
} from "@/components/keypad";
import { ArrowButton } from "@/components/ui/arrow-button";
import { Input } from "@/components/ui/input";
import { FullPageLoader } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import { ApiClientError } from "@/lib/api";
import { AUTH_PASSWORD_DIGITS } from "@/lib/auth-password";
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

/** Passwords are 6 digits now; `keyboard` mode keeps legacy accounts usable. */
type PasswordMode = "keypad" | "keyboard";

export function LockScreen() {
  const { isDark } = useAppTheme();
  const user = useAuthStore.use.user();
  const homepageData = useHomepageStore.use.data();
  const profileData = useProfileStore.use.data();
  const login = useAuthStore.use.login();
  const logout = useAuthStore.use.logout();
  const biometricsEnabled = useAppStore.use.biometricsEnabled();

  const [passwordMode, setPasswordMode] = useState<PasswordMode>("keypad");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
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

  const pin = useNumericInput({
    length: AUTH_PASSWORD_DIGITS,
    onComplete: (value) => {
      void handleUnlock(value);
    },
    onChange: () => setError(""),
  });

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
  const currentPassword = passwordMode === "keypad" ? pin.value : password;
  const canSubmit = currentPassword.length > 0 && !loading;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [profileImageUrl]);

  useEffect(() => {
    getBiometricsAvailability().then((a) => {
      setBiometricsAvailable(a.available);
      setBiometricLabel(getBiometricLabel(a));
    });
  }, []);

  useEffect(() => {
    if (passwordMode !== "keyboard") return;
    const id = setTimeout(() => passwordRef.current?.focus(), 260);
    return () => clearTimeout(id);
  }, [passwordMode]);

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

  function switchPasswordMode(next: PasswordMode) {
    setPasswordMode(next);
    setError("");
    if (next === "keyboard") {
      setPassword(pin.value);
    } else {
      Keyboard.dismiss();
      pin.setValue(password.replace(/\D/g, "").slice(0, AUTH_PASSWORD_DIGITS));
    }
  }

  async function handleUnlock(value: string = currentPassword) {
    if (!value || loading) return;
    Keyboard.dismiss();
    setError("");
    setLoading(true);
    setUnlocking(true);

    try {
      const res = await signIn({ email, password: value });
      await login(res.data.user, {
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token,
      });

      await secureStorage.set(SECURE_KEYS.USER_PASSWORD, value);

      serverFailedRef.current = false;
      resetInactivityTimer();
      pin.clear();
      setPassword("");
    } catch {
      setUnlocking(false);
      // Clear first — clearing runs `onChange`, which resets `error`.
      pin.clear();
      setPassword("");
      setError("Incorrect password. Please try again.");
      setShakeKey((k) => k + 1);
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
        // Never let the OS device-PIN unlock the app — the app has its own
        // password. Tapping the negative button just returns to our keypad.
        disableDeviceFallback: true,
        cancelLabel: "Use password",
      });
      if (!authResult.success) {
        suppressAutoBiometricRef.current = true;
        // A deliberate "Use password" / cancel is not an error — just fall back
        // to the keypad silently. Only real biometric failures show a message.
        const cancelled = /cancel|fallback/i.test(authResult.error ?? "");
        if (!cancelled) setError("Authentication failed. Try your password.");
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

  const biometricTappable =
    biometricsAvailable && biometricsEnabled && !biometricUnlockLoading;

  async function handleSignOut() {
    try {
      const pushToken = getLastRegisteredToken();
      if (pushToken) await removePushToken(pushToken);
      clearLastRegisteredToken();
    } catch {
      // Proceed even if push remove fails
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

  const biometricKey: KeypadKey | undefined = biometricTappable
    ? {
        type: "action",
        id: "biometrics",
        ghost: true,
        accessibilityLabel: `Unlock with ${biometricLabel}`,
        icon: (
          <Ionicons name="scan-outline" size={28} color={colors.orange[500]} />
        ),
        onPress: handleManualBiometricTap,
      }
    : undefined;

  return (
    <View
      className="absolute inset-0 z-50"
      style={{ backgroundColor: isDark ? "#0F172A" : "#FFFFFF" }}
    >
      <AuthShell
        title={firstName ? `Hi ${firstName}` : "Welcome back"}
        subtitle={email ? `Unlock as ${maskEmail(email)}` : "Enter your password to continue"}
        showBrand={false}
        showVersion={passwordMode === "keyboard"}
        headerRight={
          showProfileAvatar && profileImageUrl ? (
            <Image
              source={{ uri: profileImageUrl }}
              className="h-11 w-11 rounded-full"
              resizeMode="cover"
              onError={() => setAvatarLoadFailed(true)}
              accessibilityLabel="Your profile photo"
            />
          ) : (
            <Image
              source={require("@/assets/images/icon.png")}
              className="h-11 w-11 rounded-2xl"
              resizeMode="contain"
              accessibilityLabel="SmiPay"
            />
          )
        }
        bottom={
          passwordMode === "keypad" ? (
            <KeypadDock secure title="SmiPay Secure Keypad">
              <Keypad
                controller={pin}
                disabled={loading}
                leftKey={biometricKey}
                backspaceBehavior="clear"
              />
            </KeypadDock>
          ) : undefined
        }
      >
        <View className="mt-9">
          {passwordMode === "keypad" ? (
            <>
              <Text className="text-[13px] font-medium text-muted-foreground">
                {AUTH_PASSWORD_DIGITS}-digit password
              </Text>
              <PinDots
                value={pin.value}
                length={AUTH_PASSWORD_DIGITS}
                error={Boolean(error)}
                shakeKey={shakeKey}
                style={{ justifyContent: "flex-start", marginTop: 18 }}
              />
              {error ? (
                <Text className="mt-4 text-sm font-medium text-destructive">
                  {error}
                </Text>
              ) : null}
            </>
          ) : (
            <Input
              ref={passwordRef}
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (error) setError("");
              }}
              error={error || undefined}
              secureTextEntry
              toggleable
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={canSubmit ? () => void handleUnlock() : undefined}
            />
          )}

          <View className="mt-7 flex-row items-center justify-between">
            <View className="gap-2">
              <Pressable
                onPress={() =>
                  switchPasswordMode(passwordMode === "keypad" ? "keyboard" : "keypad")
                }
                hitSlop={10}
                accessibilityRole="button"
                className="active:opacity-70"
              >
                <Text className="text-sm text-muted-foreground">
                  {passwordMode === "keypad"
                    ? "Use letter keyboard"
                    : "Use number keypad"}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSignOut}
                hitSlop={10}
                accessibilityRole="button"
                className="active:opacity-70"
              >
                <Text className="text-sm font-semibold text-primary">
                  Switch account
                </Text>
              </Pressable>
            </View>

            <ArrowButton
              onPress={() => void handleUnlock()}
              disabled={!canSubmit}
              loading={loading}
              accessibilityLabel="Unlock"
              testID="lock-screen-unlock"
            />
          </View>

          {/* Biometrics lives on the keypad itself when it's shown; this is the
              fallback entry point for the letter-keyboard mode. */}
          {passwordMode === "keyboard" && biometricTappable ? (
            <Pressable
              onPress={handleManualBiometricTap}
              hitSlop={10}
              accessibilityRole="button"
              className="mt-8 flex-row items-center gap-2 active:opacity-70"
            >
              <Ionicons name="scan-outline" size={22} color={colors.orange[500]} />
              <Text className="text-sm font-semibold text-primary">
                {biometricUnlockLoading
                  ? "Authenticating…"
                  : `Unlock with ${biometricLabel}`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </AuthShell>
    </View>
  );
}
