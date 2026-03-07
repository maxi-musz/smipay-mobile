import { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  cancelAccountDeletionRequest,
  requestAccountDeletion,
} from "@/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";
import { useHomepageStore, useProfileStore } from "@/store";

const REASON_MAX_LENGTH = 500;

export default function AccountDeletionScreen() {
  const { isDark } = useAppTheme();
  const profileData = useProfileStore.use.data();
  const homepageData = useHomepageStore.use.data();
  const fetchProfile = useProfileStore.use.fetchProfile();
  const fetchHomepage = useHomepageStore.use.fetchHomepage();

  const [reason, setReason] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const requestedDeletion =
    profileData?.user?.requested_account_deletion ??
    homepageData?.user?.requested_account_deletion ??
    false;

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleRequestDeletion() {
    Keyboard.dismiss();
    setRequesting(true);
    try {
      await requestAccountDeletion(
        reason.trim() ? { reason: reason.trim().slice(0, REASON_MAX_LENGTH) } : undefined,
      );
      await Promise.all([fetchProfile(), fetchHomepage()]);
      useToastStore.getState().show({
        variant: "success",
        title: "Request received",
        message:
          "Your account deletion request has been received. You have 30 days to cancel if you change your mind.",
      });
    } catch {
      useToastStore.getState().show({
        variant: "error",
        title: "Request failed",
        message: "Could not submit deletion request. Please try again.",
      });
    } finally {
      setRequesting(false);
    }
  }

  function confirmRequestDeletion() {
    Alert.alert(
      "Request account deletion?",
      "Your account and all associated data will be permanently deleted after 30 days. You can cancel this request at any time during the 30-day period. After deletion, this action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request deletion",
          style: "destructive",
          onPress: handleRequestDeletion,
        },
      ],
    );
  }

  async function handleCancelDeletion() {
    setCancelling(true);
    try {
      await cancelAccountDeletionRequest();
      await Promise.all([fetchProfile(), fetchHomepage()]);
      useToastStore.getState().show({
        variant: "success",
        title: "Request cancelled",
        message: "Your account deletion request has been cancelled.",
      });
    } catch {
      useToastStore.getState().show({
        variant: "error",
        title: "Could not cancel",
        message: "Could not cancel deletion request. Please try again.",
      });
    } finally {
      setCancelling(false);
    }
  }

  const cardBg = isDark ? "#1E293B" : "#F5F6F8";
  const borderColor = isDark ? "#334155" : "#E2E8F0";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Delete account",
          headerBackTitle: "Profile",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: isDark ? "#0F172A" : "#F8F9FB" },
          headerTintColor: isDark ? "#F8FAFC" : "#0F172A",
        }}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-12"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {requestedDeletion ? (
          <View className="mt-6">
            <View
              className="rounded-2xl border px-4 py-4"
              style={{ backgroundColor: cardBg, borderColor }}
            >
              <View className="flex-row items-start gap-3">
                <View className="mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                  <Ionicons name="time" size={22} color={colors.warning} />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-foreground">
                    Account deletion pending
                  </Text>
                  <Text
                    className="mt-2 text-sm leading-5 text-muted-foreground"
                    style={{ lineHeight: 20 }}
                  >
                    You have requested to delete your account. You have 30 days
                    to cancel this request. If you do nothing, your account and
                    all data will be permanently deleted after the grace period.
                  </Text>
                  <Text className="mt-3 text-sm font-medium text-foreground">
                    Changed your mind?
                  </Text>
                  <Text className="mt-1 text-sm text-muted-foreground">
                    Tap the button below to cancel your deletion request and keep
                    your account.
                  </Text>
                </View>
              </View>
            </View>

            <Button
              className="mt-6 rounded-xl"
              variant="default"
              onPress={handleCancelDeletion}
              disabled={cancelling}
            >
              {cancelling ? (
                <Spinner color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">
                  Cancel deletion request
                </Text>
              )}
            </Button>

            <Text
              className="mt-4 text-center text-xs text-muted-foreground"
              style={{ lineHeight: 18 }}
            >
              You cannot submit another deletion request while one is pending.
              Cancel this request first if you need to request again later.
            </Text>
          </View>
        ) : (
          <View className="mt-6">
            <View
              className="rounded-2xl border px-4 py-4"
              style={{ backgroundColor: cardBg, borderColor }}
            >
              <Text className="text-sm leading-5 text-muted-foreground">
                Requesting account deletion will start a 30-day grace period.
                During this time you can cancel the request and keep your
                account. After 30 days, your account and all associated data
                will be permanently deleted and cannot be recovered.
              </Text>
            </View>

            <Text className="mt-6 text-sm font-medium text-foreground">
              Optional: Why are you leaving? (max {REASON_MAX_LENGTH} characters)
            </Text>
            <TextInput
              className="mt-2 rounded-xl border px-4 py-3 text-foreground"
              style={{
                backgroundColor: cardBg,
                borderColor,
                minHeight: 100,
                textAlignVertical: "top",
              }}
              placeholder="Your feedback helps us improve."
              placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
              value={reason}
              onChangeText={(t) =>
                setReason(t.length <= REASON_MAX_LENGTH ? t : t.slice(0, REASON_MAX_LENGTH))
              }
              multiline
              maxLength={REASON_MAX_LENGTH + 1}
              editable={!requesting}
            />
            <Text className="mt-1 text-right text-xs text-muted-foreground">
              {reason.length}/{REASON_MAX_LENGTH}
            </Text>

            <Button
              className="mt-6 rounded-xl"
              variant="destructive"
              onPress={confirmRequestDeletion}
              disabled={requesting}
            >
              {requesting ? (
                <Spinner color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">
                  Request account deletion
                </Text>
              )}
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
