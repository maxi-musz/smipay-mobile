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
import { cn } from "@/lib/utils";

type Variant = "success" | "error" | "warning" | "info";

interface ModalAction {
  label: string;
  onPress: () => void;
}

interface AlertModalProps {
  visible: boolean;
  variant?: Variant;
  title: string;
  message?: string;
  /** Primary CTA — filled button. */
  primaryAction?: ModalAction;
  /** Secondary action — ghost/outline button. */
  secondaryAction?: ModalAction;
  /** Show close icon in top-right. Defaults to true. */
  closeable?: boolean;
  onClose: () => void;
}

const VARIANT_CONFIG: Record<
  Variant,
  {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    bgLight: string;
    bgDark: string;
    buttonClass: string;
  }
> = {
  success: {
    icon: "checkmark-circle",
    iconColor: "#16A34A",
    bgLight: "bg-green-50",
    bgDark: "dark:bg-green-950",
    buttonClass: "bg-green-600 active:bg-green-700",
  },
  error: {
    icon: "close-circle",
    iconColor: "#DC2626",
    bgLight: "bg-red-50",
    bgDark: "dark:bg-red-950/40",
    buttonClass: "bg-red-600 active:bg-red-700",
  },
  warning: {
    icon: "warning",
    iconColor: "#F59E0B",
    bgLight: "bg-yellow-50",
    bgDark: "dark:bg-yellow-950/40",
    buttonClass: "bg-yellow-500 active:bg-yellow-600",
  },
  info: {
    icon: "information-circle",
    iconColor: "#2563EB",
    bgLight: "bg-blue-50",
    bgDark: "dark:bg-blue-950/40",
    buttonClass: "bg-blue-600 active:bg-blue-700",
  },
};

export function AlertModal({
  visible,
  variant = "info",
  title,
  message,
  primaryAction,
  secondaryAction,
  closeable = true,
  onClose,
}: AlertModalProps) {
  const config = VARIANT_CONFIG[variant];
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeable ? onClose : undefined}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        className="flex-1 items-center justify-center bg-black/50 px-8"
      >
        {/* Backdrop press */}
        {closeable && (
          <Pressable
            className="absolute inset-0"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close modal"
          />
        )}

        {/* Card */}
        <Animated.View
          style={cardStyle}
          className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-lg"
        >
          {/* Close icon */}
          {closeable && (
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="absolute right-4 top-4 z-10 h-8 w-8 items-center justify-center rounded-full active:bg-muted"
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color="#9CA3AF" />
            </Pressable>
          )}

          {/* Icon circle */}
          <View className="items-center">
            <View
              className={cn(
                "h-20 w-20 items-center justify-center rounded-full",
                config.bgLight,
                config.bgDark,
              )}
            >
              <Ionicons name={config.icon} size={44} color={config.iconColor} />
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

          {/* Actions */}
          <View className="mt-6 gap-3">
            {primaryAction && (
              <Button
                className={cn("h-12 rounded-2xl", config.buttonClass)}
                onPress={primaryAction.onPress}
              >
                <Text className="text-sm font-semibold text-white">
                  {primaryAction.label}
                </Text>
              </Button>
            )}

            {secondaryAction && (
              <Button
                variant="ghost"
                className="h-12 rounded-2xl"
                onPress={secondaryAction.onPress}
              >
                <Text className="text-sm font-medium text-muted-foreground">
                  {secondaryAction.label}
                </Text>
              </Button>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
