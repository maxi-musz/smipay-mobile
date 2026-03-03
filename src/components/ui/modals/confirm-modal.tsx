import { useEffect } from "react";
import { Modal, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Makes the confirm button red. Use for delete / irreversible actions. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.back(1.2)) });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = 0.85;
      opacity.value = 0;
    }
  }, [visible, scale, opacity]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const iconColor = destructive ? "#DC2626" : "#F59E0B";
  const iconBg = destructive
    ? "bg-red-50 dark:bg-red-950/40"
    : "bg-yellow-50 dark:bg-yellow-950/40";
  const confirmBg = destructive
    ? "bg-red-600 active:bg-red-700"
    : "bg-primary active:bg-primary/90";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        className="flex-1 items-center justify-center bg-black/50 px-8"
      >
        <Pressable
          className="absolute inset-0"
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Close modal"
        />

        <Animated.View
          style={cardStyle}
          className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-lg"
        >
          {/* Icon */}
          <View className="items-center">
            <View className={`h-20 w-20 items-center justify-center rounded-full ${iconBg}`}>
              <Ionicons
                name={destructive ? "alert-circle" : "help-circle"}
                size={44}
                color={iconColor}
              />
            </View>
          </View>

          {/* Title */}
          <Text className="mt-5 text-center text-lg font-semibold text-foreground">
            {title}
          </Text>

          {/* Message */}
          {message && (
            <Text className="mt-2 text-center text-sm leading-5 text-muted-foreground">
              {message}
            </Text>
          )}

          {/* Buttons — side by side */}
          <View className="mt-6 flex-row gap-3">
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-2xl"
              onPress={onCancel}
            >
              <Text className="text-sm font-medium text-foreground">
                {cancelLabel}
              </Text>
            </Button>

            <Button
              className={`h-12 flex-1 rounded-2xl ${confirmBg}`}
              onPress={onConfirm}
            >
              <Text className="text-sm font-semibold text-white">
                {confirmLabel}
              </Text>
            </Button>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
