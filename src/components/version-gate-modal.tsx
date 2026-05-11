import { useEffect } from "react";
import { Linking, Modal, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";

export type VersionGateLevel = "force" | "soft";

interface VersionGateModalProps {
  visible: boolean;
  /**
   * `"force"` → user must update before continuing. Modal is non-dismissable.
   * `"soft"`  → optional nudge. Dismissable; offers a "Later" action.
   */
  level: VersionGateLevel;
  /** Body copy from the server (force_message / soft_message). */
  message: string;
  /** Current installed app version, rendered as a tiny caption for support. */
  currentVersion: string | null;
  /** Required (force) / available (soft) version the user should land on. */
  targetVersion: string | null;
  /** Platform-appropriate store URL (handled internally by the hook). */
  storeUrl: string;
  /** Called when the user taps "Update now" (after the URL launches). */
  onUpdatePressed?: () => void;
  /** Called when the user dismisses a soft prompt. Ignored in `"force"`. */
  onDismiss?: () => void;
}

/**
 * Top-level overlay that surfaces server-driven force / soft update prompts.
 * Mirrors the visual language of `SetTransactionPinModal`: a centred card with
 * a tinted icon, a "REQUIRED" chip (force only), title, body, and one or two
 * actions. There is intentionally no input keyboard handling — this screen is
 * read-only and CTA-driven.
 */
export function VersionGateModal({
  visible,
  level,
  message,
  currentVersion,
  targetVersion,
  storeUrl,
  onUpdatePressed,
  onDismiss,
}: VersionGateModalProps) {
  const { isDark } = useAppTheme();
  const isForce = level === "force";

  // Reuses the same spring-y entry animation as the transaction PIN modal so
  // the gate feels consistent with the rest of the app.
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withTiming(1, {
        duration: 240,
        easing: Easing.out(Easing.back(1.15)),
      });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = 0.9;
      opacity.value = 0;
    }
  }, [visible, scale, opacity]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const cardBg = isDark ? "#0F172A" : "#FFFFFF";
  const subtleText = isDark ? "#94A3B8" : "#6B7280";

  function handleDismiss() {
    if (isForce) return;
    onDismiss?.();
  }

  async function handleUpdate() {
    try {
      const canOpen = await Linking.canOpenURL(storeUrl);
      if (canOpen) {
        await Linking.openURL(storeUrl);
      } else {
        // Fallback for emulators / unhandled schemes — best-effort, never
        // throw out of the press handler.
        await Linking.openURL(storeUrl).catch(() => undefined);
      }
    } catch {
      // Swallow — the modal stays mounted so the user can retry the CTA.
    } finally {
      onUpdatePressed?.();
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={isForce ? () => {} : handleDismiss}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        className="flex-1 items-center justify-center bg-black/70 px-6"
      >
        {!isForce ? (
          <Pressable
            className="absolute inset-0"
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        ) : null}

        <Animated.View
          style={[cardStyle, { backgroundColor: cardBg }]}
          className="w-full max-w-md rounded-3xl p-6 shadow-2xl"
        >
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Ionicons
                name="cloud-download-outline"
                size={26}
                color={colors.orange[500]}
              />
            </View>
            <View className="flex-1">
              {isForce ? (
                <View
                  className="self-start rounded-full px-2 py-0.5"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(245,131,32,0.16)"
                      : "rgba(245,131,32,0.12)",
                  }}
                >
                  <Text
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: colors.orange[500] }}
                  >
                    Required
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <Text className="mt-4 text-xl font-semibold text-foreground">
            {isForce ? "Update SmiPay to continue" : "A new version is available"}
          </Text>
          <Text
            className="mt-1.5 text-sm leading-5"
            style={{ color: subtleText }}
          >
            {message}
          </Text>

          

          <View className="mt-7">
            {isForce ? (
              <Pressable
                onPress={handleUpdate}
                accessibilityRole="button"
                className="h-12 w-full flex-row items-center justify-center rounded-2xl active:opacity-90"
                style={{ backgroundColor: colors.orange[500] }}
              >
                {!visible ? (
                  <Spinner color="#FFFFFF" />
                ) : (
                  <Text className="text-sm font-semibold text-white">
                    {Platform.OS === "ios"
                      ? "Open App Store"
                      : "Open Play Store"}
                  </Text>
                )}
              </Pressable>
            ) : (
              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleDismiss}
                  accessibilityRole="button"
                  className="h-12 flex-1 flex-row items-center justify-center rounded-2xl border active:opacity-80"
                  style={{
                    borderColor: isDark ? "#334155" : "#E5E7EB",
                  }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}
                  >
                    Later
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleUpdate}
                  accessibilityRole="button"
                  className="h-12 flex-1 flex-row items-center justify-center rounded-2xl active:opacity-90"
                  style={{ backgroundColor: colors.orange[500] }}
                >
                  <Text className="text-sm font-semibold text-white">
                    Update
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
