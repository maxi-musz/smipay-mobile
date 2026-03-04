import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { logout as logoutApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToastStore } from "@/components/ui/toast";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuthStore, useAppStore } from "@/store";
import type { LockTimeout } from "@/store/app.store";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type MenuItem = {
  icon: IconName;
  label: string;
  id: string;
};

const menuItems: MenuItem[] = [
  { id: "edit-profile", icon: "person-outline", label: "Edit Profile" },
  { id: "security", icon: "shield-checkmark-outline", label: "Security" },
  { id: "notifications", icon: "notifications-outline", label: "Notifications" },
  { id: "help", icon: "help-circle-outline", label: "Help & Support" },
  { id: "privacy", icon: "document-text-outline", label: "Privacy Policy" },
];

type SecuritySubItem = {
  id: string;
  icon: IconName;
  label: string;
};

const securitySubItems: SecuritySubItem[] = [
  { id: "app-lock", icon: "lock-closed-outline", label: "App Lock Settings" },
  { id: "change-password", icon: "key-outline", label: "Change Password" },
  { id: "transaction-pin", icon: "keypad-outline", label: "Transaction PIN" },
];

const LOCK_OPTIONS: { value: LockTimeout; label: string; description: string }[] = [
  { value: "immediate", label: "Immediately", description: "Lock as soon as app is minimised or closed" },
  { value: "60min", label: "After 60 Minutes", description: "Lock 60 min after app is minimised or closed" },
  { value: "none", label: "Password-Free", description: "Never auto-lock, even if app is closed" },
];

export default function ProfileScreen() {
  const user = useAuthStore.use.user();
  const storeLogout = useAuthStore.use.logout();
  const { isDark } = useAppTheme();
  const [loggingOut, setLoggingOut] = useState(false);
  const [securityExpanded, setSecurityExpanded] = useState(false);
  const [appLockOpen, setAppLockOpen] = useState(false);

  const lockTimeout = useAppStore.use.lockTimeout();
  const setLockTimeout = useAppStore.use.setLockTimeout();

  const fullName = user
    ? `${user.first_name} ${user.last_name}`
    : "User";
  const email = user?.email ?? "";
  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "U";

  const cardBg = isDark ? "#1E293B" : "#F5F6F8";
  const dividerColor = isDark ? "#2D3A4D" : "#E8EAED";
  const chevronColor = isDark ? "#808999" : "#9CA3B0";
  const subItemBg = isDark ? "#172033" : "#ECEEF1";

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logoutApi();
    } catch {
      // Silently ignore — we're logging out regardless
    }
    await storeLogout();
    useToastStore.getState().show({
      variant: "success",
      title: "Signed Out",
      message: "You have been signed out successfully.",
    });
    router.replace("/(auth)/sign-in");
  }

  function handleMenuPress(id: string) {
    if (id === "security") {
      setSecurityExpanded((v) => !v);
    }
  }

  function handleSecuritySubPress(id: string) {
    if (id === "app-lock") {
      setAppLockOpen((v) => !v);
    }
  }

  function renderMenuItem(item: MenuItem, index: number) {
    const isSecurity = item.id === "security";
    const isLast = index === menuItems.length - 1;
    const showDivider = !isLast && !(isSecurity && securityExpanded);

    return (
      <View key={item.id}>
        <Pressable
          className="flex-row items-center px-4 py-4 active:opacity-70"
          style={showDivider ? { borderBottomWidth: 1, borderBottomColor: dividerColor } : undefined}
          onPress={() => handleMenuPress(item.id)}
        >
          <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Ionicons name={item.icon} size={18} color="#F4831F" />
          </View>
          <Text className="flex-1 text-[15px] text-foreground">
            {item.label}
          </Text>
          <Ionicons
            name={isSecurity
              ? (securityExpanded ? "chevron-down" : "chevron-forward")
              : "chevron-forward"
            }
            size={18}
            color={chevronColor}
          />
        </Pressable>

        {isSecurity && securityExpanded && (
          <View
            className="mx-3 mb-3 overflow-hidden rounded-xl"
            style={{ backgroundColor: subItemBg }}
          >
            {securitySubItems.map((sub, si) => (
              <View key={sub.id}>
                <Pressable
                  className="flex-row items-center px-3 py-3 active:opacity-70"
                  style={
                    si < securitySubItems.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: dividerColor }
                      : undefined
                  }
                  onPress={() => handleSecuritySubPress(sub.id)}
                >
                  <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Ionicons name={sub.icon} size={16} color="#F4831F" />
                  </View>
                  <Text className="flex-1 text-sm text-foreground">
                    {sub.label}
                  </Text>
                  {sub.id === "app-lock" ? (
                    <View className="flex-row items-center gap-1">
                      <Text className="text-xs text-muted-foreground">
                        {LOCK_OPTIONS.find((o) => o.value === lockTimeout)?.label}
                      </Text>
                      <Ionicons
                        name={appLockOpen ? "chevron-down" : "chevron-forward"}
                        size={14}
                        color={chevronColor}
                      />
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={14} color={chevronColor} />
                  )}
                </Pressable>

                {sub.id === "app-lock" && appLockOpen && (
                  <View className="px-3 pb-2">
                    {LOCK_OPTIONS.map((option) => {
                      const isSelected = lockTimeout === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          className="flex-row items-center rounded-lg px-3 py-2.5"
                          style={isSelected ? { backgroundColor: isDark ? "#1E3A5F" : "#FFF3E8" } : undefined}
                          onPress={() => setLockTimeout(option.value)}
                        >
                          <View className="flex-1">
                            <Text
                              className="text-sm text-foreground"
                              style={isSelected ? { fontWeight: "600" } : undefined}
                            >
                              {option.label}
                            </Text>
                            <Text className="mt-0.5 text-[11px] text-muted-foreground">
                              {option.description}
                            </Text>
                          </View>
                          <View
                            className="h-5 w-5 items-center justify-center rounded-full"
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
                      );
                    })}
                  </View>
                )}
              </View>
            ))}

            {!isLast && (
              <View style={{ height: 1, backgroundColor: dividerColor }} />
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center justify-between px-6 pb-2 pt-3">
        <Text variant="h3" className="text-foreground">
          Profile
        </Text>
        <ThemeToggle />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-24"
        showsVerticalScrollIndicator={false}
      >
        <View
          className="mt-4 items-center rounded-2xl px-6 py-6"
          style={{ backgroundColor: cardBg }}
        >
          <View className="h-20 w-20 items-center justify-center rounded-full bg-primary">
            <Text className="text-2xl font-bold text-primary-foreground">
              {initials}
            </Text>
          </View>
          <Text variant="h4" className="mt-3 text-foreground">
            {fullName}
          </Text>
          <Text className="mt-1 text-muted-foreground">{email}</Text>
        </View>

        <View
          className="mt-6 overflow-hidden rounded-2xl"
          style={{ backgroundColor: cardBg }}
        >
          {menuItems.map((item, index) => renderMenuItem(item, index))}
        </View>

        <Button
          variant="outline"
          className="mt-6 h-12 rounded-2xl border-destructive"
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <Spinner color="#ef4444" />
          ) : (
            <Text className="text-sm font-semibold text-destructive">
              Sign Out
            </Text>
          )}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
