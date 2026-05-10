import { useCallback, useEffect, useState } from "react";
import { Keyboard, Modal, Pressable, ScrollView, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { signIn } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loaders";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast";
import { useAppTheme } from "@/hooks/use-app-theme";
import { authenticate, getBiometricsAvailability, getBiometricLabel } from "@/lib/biometrics";
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
  const [appLockExpanded, setAppLockExpanded] = useState(false);

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

  async function handleBiometricsSwitch(value: boolean) {
    if (value) {
      if (!biometricsAvailable) return;
      setEnableModalVisible(true);
      setEnablePassword("");
      setEnableError("");
    } else {
      setBiometricsEnabled(false);
    }
  }

  async function handleEnableBiometricsSubmit() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !enablePassword.trim()) {
      setEnableError("Please enter your password.");
      return;
    }
    Keyboard.dismiss();
    setEnableError("");
    setEnableLoading(true);
    try {
      const res = await signIn({ email: trimmedEmail, password: enablePassword });
      const authResult = await authenticate({
        promptMessage: `Use ${biometricLabel} to unlock SmiPay`,
      });
      if (!authResult.success) {
        setEnableError("Biometric authentication was not completed.");
        return;
      }
      await storeCredentials(trimmedEmail, enablePassword, canUseRequireAuthentication()
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
      setEnableError("Incorrect password. Please try again.");
    } finally {
      setEnableLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: bg }}>
        <View className="flex-row items-center justify-between px-5 pb-3 pt-14">
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
                onPress={() => {
                  /* PIN update flow — to be implemented */
                }}
              >
                <Text className="font-semibold text-foreground">Update transaction PIN</Text>
              </Button>
            ) : (
              <Pressable
                className="mt-3 active:opacity-70"
                onPress={() => {
                  /* PIN setup flow — to be implemented */
                }}
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

      {/* Enable biometrics modal */}
      <Modal
        visible={enableModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEnableModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-center bg-black/50 p-5"
          onPress={() => setEnableModalVisible(false)}
        >
          <Pressable
            className="rounded-2xl bg-card p-5"
            style={{ backgroundColor: cardBg }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-semibold text-foreground">
              Enable {biometricLabel}
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              Enter your password to enable biometric unlock.
            </Text>
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
            />
            <View className="mt-5 flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onPress={() => setEnableModalVisible(false)}
                disabled={enableLoading}
              >
                <Text className="text-foreground">Cancel</Text>
              </Button>
              <Button
                className="flex-1 rounded-xl"
                onPress={handleEnableBiometricsSubmit}
                disabled={enableLoading}
              >
                {enableLoading ? (
                  <Spinner color="#fff" />
                ) : (
                  <Text className="font-semibold text-primary-foreground">Enable</Text>
                )}
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
