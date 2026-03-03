import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInUp,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { useToastStore, type Toast } from "./toast-store";

const VARIANT_STYLES: Record<
  Toast["variant"],
  {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    border: string;
    bg: string;
  }
> = {
  success: {
    icon: "checkmark-circle",
    iconColor: "#16A34A",
    border: "border-l-green-500",
    bg: "bg-card",
  },
  error: {
    icon: "close-circle",
    iconColor: "#DC2626",
    border: "border-l-red-500",
    bg: "bg-card",
  },
  warning: {
    icon: "warning",
    iconColor: "#F59E0B",
    border: "border-l-yellow-500",
    bg: "bg-card",
  },
  info: {
    icon: "information-circle",
    iconColor: "#2563EB",
    border: "border-l-blue-500",
    bg: "bg-card",
  },
};

const DEFAULT_DURATION = 4000;

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const { top } = useSafeAreaInsets();

  return (
    <View
      style={{ top: top + 8 }}
      className="absolute left-4 right-4 z-50"
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </View>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const config = VARIANT_STYLES[toast.variant];
  const duration = toast.duration ?? DEFAULT_DURATION;

  useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => dismiss(toast.id), duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss, toast.id, duration]);

  return (
    <Animated.View
      entering={FadeInUp.duration(300).springify().damping(18)}
      exiting={FadeOutUp.duration(200)}
      layout={LinearTransition.springify().damping(20)}
      className="mb-2"
    >
      <Pressable
        onPress={() => dismiss(toast.id)}
        className={cn(
          "flex-row items-start gap-3 rounded-2xl border border-border border-l-4 p-4 shadow-sm",
          config.border,
          config.bg,
        )}
      >
        <Ionicons
          name={config.icon}
          size={22}
          color={config.iconColor}
          style={{ marginTop: 1 }}
        />

        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground">
            {toast.title}
          </Text>
          {toast.message && (
            <Text className="mt-0.5 text-xs leading-4 text-muted-foreground">
              {toast.message}
            </Text>
          )}
        </View>

        <Pressable
          onPress={() => dismiss(toast.id)}
          hitSlop={8}
          className="mt-0.5"
        >
          <Ionicons name="close" size={16} color="#9CA3AF" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}
