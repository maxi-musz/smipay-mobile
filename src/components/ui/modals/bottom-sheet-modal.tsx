import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const MAX_PANEL_HEIGHT = Dimensions.get("window").height * 0.85;

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Tap backdrop to close. Default true. */
  closeOnBackdrop?: boolean;
  /** Show drag handle at top. Default true. */
  showHandle?: boolean;
  /** Optional title above content. */
  title?: string;
}

export function BottomSheetModal({
  visible,
  onClose,
  children,
  closeOnBackdrop = true,
  showHandle = true,
  title,
}: BottomSheetModalProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeOnBackdrop ? onClose : undefined}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/50"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {closeOnBackdrop && (
          <Pressable
            className="absolute inset-0"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close modal"
          />
        )}

        <View
          style={{
            maxHeight: MAX_PANEL_HEIGHT,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
          className="rounded-t-3xl bg-card"
        >
          {showHandle && (
            <View className="items-center pt-3">
              <View className="h-1 w-12 rounded-full bg-muted-foreground/30" />
            </View>
          )}

          {title && (
            <View className={cn("px-5 pb-3", showHandle ? "pt-4" : "pt-5")}>
              <Text className="text-lg font-semibold text-foreground">
                {title}
              </Text>
            </View>
          )}

          <View
            className={cn(
              "px-5 pb-2",
              showHandle && !title ? "pt-4" : title ? "" : "pt-5",
            )}
          >
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
