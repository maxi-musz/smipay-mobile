import { ActivityIndicator, Image, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";

const PREVIEW_SIZE = 260;

interface ProfilePhotoPreviewModalProps {
  visible: boolean;
  imageUri: string;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  errorText?: string | null;
}

export function ProfilePhotoPreviewModal({
  visible,
  imageUri,
  onCancel,
  onConfirm,
  isSubmitting,
  errorText,
}: ProfilePhotoPreviewModalProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={isSubmitting ? undefined : onCancel}
    >
      <View
        className="flex-1 justify-between"
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(insets.bottom, 20),
          backgroundColor: isDark ? "rgba(6,8,14,0.97)" : "rgba(15,23,42,0.94)",
        }}
      >
        <Pressable
          onPress={isSubmitting ? undefined : onCancel}
          className="absolute right-4 z-10 rounded-full bg-white/10 p-2"
          style={{ top: insets.top + 8 }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close preview"
        >
          <Ionicons name="close" size={22} color="#F8FAFC" />
        </Pressable>

        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
            Preview
          </Text>
          <Text className="mt-2 text-center text-xl font-bold text-white">Profile photo</Text>
          <Text className="mt-2 max-w-[280px] text-center text-[14px] leading-5 text-white/65">
            This is how your picture will look across SmiPay. You can change it anytime.
          </Text>

          <View
            className="mt-8 items-center justify-center"
            style={{
              width: PREVIEW_SIZE + 10,
              height: PREVIEW_SIZE + 10,
              borderRadius: 999,
              padding: 4,
              backgroundColor: "rgba(245,130,32,0.35)",
            }}
          >
            <View
              style={{
                width: PREVIEW_SIZE,
                height: PREVIEW_SIZE,
                borderRadius: PREVIEW_SIZE / 2,
                overflow: "hidden",
                borderWidth: 3,
                borderColor: isDark ? "#1E293B" : "#FFFFFF",
              }}
            >
              <Image
                source={{ uri: imageUri }}
                style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
                resizeMode="cover"
              />
            </View>
          </View>

          {errorText ? (
            <View className="mt-6 flex-row items-start gap-2 rounded-xl bg-red-500/15 px-3 py-2.5">
              <Ionicons name="alert-circle" size={18} color="#FCA5A5" style={{ marginTop: 1 }} />
              <Text className="flex-1 text-[13px] leading-5 text-red-100">{errorText}</Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row gap-3 px-5">
          <Pressable
            onPress={onCancel}
            disabled={isSubmitting}
            className="min-h-[52px] flex-1 items-center justify-center rounded-2xl border border-white/20 active:opacity-85"
            style={{ opacity: isSubmitting ? 0.45 : 1 }}
          >
            <Text className="text-[16px] font-semibold text-white">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            disabled={isSubmitting}
            className="min-h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl active:opacity-90"
            style={{
              backgroundColor: colors.orange[500],
              opacity: isSubmitting ? 0.85 : 1,
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text className="text-[16px] font-bold text-white">Update profile</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
