import { useCallback, useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { signIn } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Keypad, KeypadDock, PinDots, useNumericInput } from "@/components/keypad";
import { Spinner } from "@/components/ui/loaders";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useCompactScreen } from "@/hooks/use-compact-screen";
import { authenticate, getBiometricsAvailability, getBiometricLabel } from "@/lib/biometrics";
import { AUTH_PASSWORD_DIGITS } from "@/lib/auth-password";
import { canUseRequireAuthentication } from "@/lib/secure-storage";
import { useAppStore, useAuthStore, useProfileStore } from "@/store";
import type { LockTimeout } from "@/store/app.store";

const LOCK_OPTIONS: { value: LockTimeout; label: string; description: string }[] = [
  { value: "1min", label: "After 1 Minute", description: "Lock 1 min after app is minimised or closed" },
  { value: "60min", label: "After 60 Minutes", description: "Lock 60 min after app is minimised or closed" },
  { value: "immediate", label: "Immediately", description: "Lock as soon as app is minimised or closed" },
  { value: "none", label: "Password-Free", description: "Never auto-lock, even if app is closed" },
];

export default function SecurityScreen() {
  const { isDark } = useAppTheme();
  const lockTimeout = useAppStore.use.lockTimeout();
  const setLockTimeout = useAppStore.use.setLockTimeout();
  const biometricsEnabled = useAppStore.use.biometricsEnabled();
  const setBiometricsEnabled = useAppStore.use.setBiometricsEnabled();
  const storeCredentials = useAuthStore.use.storeCredentials();
  const user = useAuthStore.use.user();

  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometrics");
  const [enableModalVisible, setEnableModalVisible] = useState(false);
  const [enablePassword, setEnablePassword] = useState("");
  const [enableLoading, setEnableLoading] = useState(false);
  const [enableError, setEnableError] = useState("");
  const [enableShakeKey, setEnableShakeKey] = useState(0);
  // Numeric keypad is primary; `keyboard` supports legacy alphanumeric passwords.
  const [enableMode, setEnableMode] = useState<"keypad" | "keyboard">("keypad");
  const [appLockExpanded, setAppLockExpanded] = useState(false);
  const compact = useCompactScreen();

  const enablePin = useNumericInput({
    length: AUTH_PASSWORD_DIGITS,
    onComplete: (value) => void handleEnableBiometricsSubmit(value),
    onChange: () => setEnableError(""),
  });

  const profileData = useProfileStore.use.data();
  const fetchProfile = useProfileStore.use.fetchProfile();
  const profileLoading = useProfileStore.use.isLoading();

  const email = user?.email ?? "";
  const cardBg = isDark ? "#1E293B" : "#F5F6F8";
  const dividerColor = isDark ? "#2D3A4D" : "#E8EAED";
  const chevronColor = isDark ? "#808999" : "#9CA3B0";
  const bg = isDark ? "#0F172A" : "#F8F9FB";

  useEffect(() => {
    getBiometricsAvailability().then((a) => {
      setBiometricsAvailable(a.available);
      setBiometricLabel(getBiometricLabel(a));
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchProfile();
    }, [fetchProfile]),
  );

  const selectedLock =
    LOCK_OPTIONS.find((o) => o.value === lockTimeout) ?? LOCK_OPTIONS[0];
  const pinSet = profileData?.user?.is_four_digit_pin_set === true;

  function openEnableModal() {
    setEnablePassword("");
    enablePin.clear();
    setEnableMode("keypad");
    setEnableError("");
    setEnableModalVisible(true);
  }

  function closeEnableModal() {
    if (enableLoading) return;
    Keyboard.dismiss();
    setEnableModalVisible(false);
    setEnablePassword("");
    enablePin.clear();
    setEnableError("");
  }

  /** Carry the typed value across so switching modes never costs input. */
  function switchEnableMode(next: "keypad" | "keyboard") {
    setEnableMode(next);
    setEnableError("");
    if (next === "keyboard") {
      setEnablePassword(enablePin.value);
    } else {
      Keyboard.dismiss();
      enablePin.setValue(
        enablePassword.replace(/\D/g, "").slice(0, AUTH_PASSWORD_DIGITS),
      );
    }
  }

  async function handleBiometricsSwitch(value: boolean) {
    if (value) {
      if (!biometricsAvailable) return;
      openEnableModal();
    } else {
      setBiometricsEnabled(false);
    }
  }

  const currentEnablePassword =
    enableMode === "keypad" ? enablePin.value : enablePassword;

  async function handleEnableBiometricsSubmit(
    passwordValue: string = currentEnablePassword,
  ) {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !passwordValue.trim()) {
      setEnableError("Please enter your password.");
      setEnableShakeKey((k) => k + 1);
      return;
    }
    if (enableLoading) return;
    Keyboard.dismiss();
    setEnableError("");
    setEnableLoading(true);
    try {
      // Verify the password by attempting sign-in; throws on wrong password.
      await signIn({ email: trimmedEmail, password: passwordValue });
      const authResult = await authenticate({
        promptMessage: `Use ${biometricLabel} to unlock SmiPay`,
        disableDeviceFallback: true,
        cancelLabel: "Cancel",
      });
      if (!authResult.success) {
        setEnableError("Biometric authentication was not completed.");
        return;
      }
      await storeCredentials(trimmedEmail, passwordValue, canUseRequireAuthentication()
        ? { requireAuthentication: true }
        : undefined);
      setBiometricsEnabled(true);
      setEnableModalVisible(false);
      useToastStore.getState().show({
        variant: "success",
        title: "Biometrics enabled",
        message: `You can now use ${biometricLabel} to unlock the app.`,
      });
    } catch {
      // Wipe the keypad so a rejected attempt starts fresh.
      enablePin.clear();
      setEnablePassword("");
      setEnableError("Incorrect pin. Please try again.");
      setEnableShakeKey((k) => k + 1);
    } finally {
      setEnableLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: bg }}>
        <View className={`flex-row items-center justify-between px-5 pb-3 ${compact ? "pt-8" : "pt-14"}`}>
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6" }}
          >
            <Ionicons name="chevron-back" size={20} color={isDark ? "#E5E7EB" : "#111827"} />
          </Pressable>
          <Text className="text-base font-semibold text-foreground">Security</Text>
          <View className="h-9 w-9" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-24"
          showsVerticalScrollIndicator={false}
        >
          {/* App Lock */}
          <View className="mt-4 overflow-hidden rounded-2xl" style={{ backgroundColor: cardBg }}>
            <Pressable
              onPress={() => setAppLockExpanded((e) => !e)}
              className="flex-row items-center px-4 pt-4 pb-3 active:opacity-70"
              accessibilityRole="button"
              accessibilityState={{ expanded: appLockExpanded }}
              accessibilityHint="Shows options for when the app locks automatically"
            >
              <View className="flex-1">
                <Text className="text-sm font-semibold text-muted-foreground">App Lock</Text>
                {!appLockExpanded ? (
                  <>
                    <Text
                      className="mt-1 text-[15px] text-foreground"
                      style={{ fontWeight: "600" }}
                    >
                      {selectedLock.label}
                    </Text>
                    <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={2}>
                      {selectedLock.description}
                    </Text>
                  </>
                ) : (
                  <Text className="mt-1 text-xs text-muted-foreground">
                    Choose when the app should require unlock
                  </Text>
                )}
              </View>
              <Ionicons
                name={appLockExpanded ? "chevron-up" : "chevron-down"}
                size={22}
                color={chevronColor}
              />
            </Pressable>
            {appLockExpanded
              ? LOCK_OPTIONS.map((option) => {
                  const isSelected = lockTimeout === option.value;
                  return (
                    <View key={option.value}>
                      <View style={{ height: 1, backgroundColor: dividerColor }} />
                      <Pressable
                        className="flex-row items-center px-4 py-3.5 active:opacity-70"
                        onPress={() => setLockTimeout(option.value)}
                        style={
                          isSelected
                            ? { backgroundColor: isDark ? "#1E3A5F" : "#FFF3E8" }
                            : undefined
                        }
                      >
                        <View className="flex-1">
                          <Text
                            className="text-[15px] text-foreground"
                            style={isSelected ? { fontWeight: "600" } : undefined}
                          >
                            {option.label}
                          </Text>
                          <Text className="mt-0.5 text-xs text-muted-foreground">
                            {option.description}
                          </Text>
                        </View>
                        <View
                          className="ml-3 h-5 w-5 items-center justify-center rounded-full"
                          style={{
                            borderWidth: 2,
                            borderColor: isSelected ? "#F4831F" : chevronColor,
                          }}
                        >
                          {isSelected && (
                            <View className="h-2.5 w-2.5 rounded-full bg-primary" />
                          )}
                        </View>
                      </Pressable>
                    </View>
                  );
                })
              : null}
          </View>

          {/* Biometrics */}
          <View
            className="mt-6 flex-row items-center justify-between overflow-hidden rounded-2xl px-4 py-4"
            style={{ backgroundColor: cardBg }}
          >
            <View className="flex-row flex-1 items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Ionicons name="scan-outline" size={22} color="#F4831F" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-medium text-foreground">
                  Biometrics login
                </Text>
                <Text className="mt-0.5 text-xs text-muted-foreground">
                  {biometricsAvailable
                    ? `Use ${biometricLabel} to unlock the app`
                    : "Not available on this device"}
                </Text>
              </View>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={handleBiometricsSwitch}
              disabled={!biometricsAvailable}
            />
          </View>

          {/* Transaction PIN */}
          <View className="mt-6 overflow-hidden rounded-2xl px-4 py-4" style={{ backgroundColor: cardBg }}>
            <Text className="text-sm font-semibold text-muted-foreground">Transaction PIN</Text>
            {profileLoading && !profileData ? (
              <Text className="mt-3 text-sm text-muted-foreground">Loading…</Text>
            ) : pinSet ? (
              <Button
                variant="outline"
                className="mt-3 rounded-xl"
                onPress={() =>
                  router.push("/(app)/profile/transaction-pin?mode=update")
                }
              >
                <Text className="font-semibold text-foreground">Update transaction PIN</Text>
              </Button>
            ) : (
              <Pressable
                className="mt-3 active:opacity-70"
                onPress={() => router.push("/(app)/profile/transaction-pin")}
                accessibilityRole="button"
              >
                <Text className="text-sm leading-5 text-muted-foreground">
                  You haven&apos;t set your four digit transaction PIN.{" "}
                  <Text className="font-semibold text-primary">Set it now</Text>
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Enable biometrics — modern bottom sheet with the custom keypad. */}
      <Modal
        visible={enableModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeEnableModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
            <Pressable className="flex-1" onPress={closeEnableModal} />

            <View className="overflow-hidden rounded-t-3xl" style={{ backgroundColor: bg }}>
              <View className="items-center pt-3">
                <View
                  className="h-1 w-10 rounded-full"
                  style={{ backgroundColor: dividerColor }}
                />
              </View>

              <View className="px-5 pt-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-semibold text-foreground">
                    Enable {biometricLabel}
                  </Text>
                  <Pressable
                    onPress={closeEnableModal}
                    hitSlop={10}
                    disabled={enableLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                  >
                    <Ionicons name="close" size={22} color={chevronColor} />
                  </Pressable>
                </View>
                <Text className="mt-1 text-sm text-muted-foreground">
                  Enter your {AUTH_PASSWORD_DIGITS}-digit login pin to turn on{" "}
                  {biometricLabel}.
                </Text>

                {enableMode === "keypad" ? (
                  <>
                    <PinDots
                      value={enablePin.value}
                      length={AUTH_PASSWORD_DIGITS}
                      error={Boolean(enableError)}
                      shakeKey={enableShakeKey}
                      style={{
                        justifyContent: "flex-start",
                        marginTop: compact ? 16 : 22,
                      }}
                    />
                    {enableError ? (
                      <Text className="mt-3 text-sm font-medium text-destructive">
                        {enableError}
                      </Text>
                    ) : null}
                    {/* <View className="mt-4 flex-row items-center justify-between">
                      <Pressable
                        onPress={() => switchEnableMode("keyboard")}
                        hitSlop={8}
                        className="active:opacity-70"
                        accessibilityRole="button"
                      >
                        <Text className="text-sm text-muted-foreground">
                          Use letter keyboard
                        </Text>
                      </Pressable>
                      {enableLoading ? (
                        <Spinner size="small" color="#F4831F" />
                      ) : null}
                    </View> */}
                  </>
                ) : (
                  <>
                    <Input
                      containerClassName="mt-4"
                      label="Password"
                      placeholder="Enter your password"
                      value={enablePassword}
                      onChangeText={(v) => {
                        setEnablePassword(v);
                        if (enableError) setEnableError("");
                      }}
                      error={enableError}
                      secureTextEntry
                      toggleable
                      autoComplete="password"
                      editable={!enableLoading}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={() => void handleEnableBiometricsSubmit()}
                    />
                    <View className="mt-4 flex-row items-center justify-between">
                      <Pressable
                        onPress={() => switchEnableMode("keypad")}
                        hitSlop={8}
                        className="active:opacity-70"
                        accessibilityRole="button"
                      >
                        <Text className="text-sm text-muted-foreground">
                          Use number keypad
                        </Text>
                      </Pressable>
                      <Button
                        className="rounded-xl px-5"
                        onPress={() => void handleEnableBiometricsSubmit()}
                        disabled={enableLoading || !enablePassword.trim()}
                      >
                        {enableLoading ? (
                          <Spinner color="#fff" />
                        ) : (
                          <Text className="font-semibold text-primary-foreground">
                            Enable
                          </Text>
                        )}
                      </Button>
                    </View>
                  </>
                )}
              </View>

              {enableMode === "keypad" ? (
                <View className="mt-3">
                  <KeypadDock secure title="SmiPay Secure Keypad">
                    <Keypad
                      controller={enablePin}
                      disabled={enableLoading}
                      backspaceBehavior="clear"
                    />
                  </KeypadDock>
                </View>
              ) : (
                <View style={{ height: 16 }} />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
