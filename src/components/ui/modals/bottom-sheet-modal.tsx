import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const MAX_PANEL_HEIGHT = Dimensions.get("window").height * 0.85;

/** Typical Android 3-button nav height when insets fail to report inside Modal. */
const ANDROID_NAV_FALLBACK = 48;

/**
 * Bottom padding for sheets. Most devices report a correct inset; a minority of
 * Android OEMs report `0` inside RN Modal while the system nav bar still overlays
 * content — use a nav-sized floor only in that case so gesture-nav phones stay tight.
 */
function sheetBottomPadding(insetsBottom: number): number {
  if (Platform.OS === "android" && insetsBottom <= 0) {
    return ANDROID_NAV_FALLBACK;
  }
  return Math.max(insetsBottom, 16);
}

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

/**
 * Content must live under a Modal-local SafeAreaProvider — Android Modals create a
 * new window and root insets are often wrong (bottom=0) without this.
 */
function BottomSheetPanel({
  onClose,
  children,
  closeOnBackdrop = true,
  showHandle = true,
  title,
}: Omit<BottomSheetModalProps, "visible">) {
  const insets = useSafeAreaInsets();

  return (
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
          paddingBottom: sheetBottomPadding(insets.bottom),
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
  );
}

export function BottomSheetModal({
  visible,
  onClose,
  children,
  closeOnBackdrop = true,
  showHandle = true,
  title,
}: BottomSheetModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent={Platform.OS === "android"}
      onRequestClose={closeOnBackdrop ? onClose : undefined}
    >
      <SafeAreaProvider>
        <BottomSheetPanel
          onClose={onClose}
          closeOnBackdrop={closeOnBackdrop}
          showHandle={showHandle}
          title={title}
        >
          {children}
        </BottomSheetPanel>
      </SafeAreaProvider>
    </Modal>
  );
}
