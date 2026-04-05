import type { ComponentProps } from "react";
import { InteractionManager, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { BottomSheetModal } from "@/components/ui/modals";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";

export type ProfilePhotoPickMode = "camera" | "library" | "file";

type IonName = ComponentProps<typeof Ionicons>["name"];

/**
 * iOS will often fail to present the photo library / document picker if we try while this
 * RN Modal is still dismissing. Close first, then run after interactions + a short delay.
 */
function schedulePickerAfterSheetClose(action: () => void) {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(action, Platform.OS === "ios" ? 150 : 0);
  });
}

interface ProfilePhotoSourceSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (mode: ProfilePhotoPickMode) => void;
}

function OptionRow({
  icon,
  label,
  hint,
  onPress,
  isDark,
}: {
  icon: IonName;
  label: string;
  hint: string;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-4 rounded-2xl px-4 py-3.5 active:opacity-85"
      style={{
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : colors.gray[50],
        borderWidth: 1,
        borderColor: isDark ? "rgba(148,163,184,0.12)" : colors.gray[200],
      }}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: isDark ? "rgba(245,130,32,0.15)" : colors.orange[50] }}
      >
        <Ionicons name={icon} size={22} color={colors.orange[500]} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-semibold text-foreground">{label}</Text>
        <Text className="mt-0.5 text-[13px] text-muted-foreground">{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.gray[400]} />
    </Pressable>
  );
}

export function ProfilePhotoSourceSheet({
  visible,
  onClose,
  onSelect,
}: ProfilePhotoSourceSheetProps) {
  const { isDark } = useAppTheme();

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title="Update profile photo"
      closeOnBackdrop
      showHandle
    >
      <View className="gap-2.5 px-1 pb-2">
        <OptionRow
          icon="camera-outline"
          label="Take photo"
          hint="Use your camera now"
          isDark={isDark}
          onPress={() => {
            onClose();
            schedulePickerAfterSheetClose(() => onSelect("camera"));
          }}
        />
        <OptionRow
          icon="images-outline"
          label="Photo library"
          hint="Choose from your gallery"
          isDark={isDark}
          onPress={() => {
            onClose();
            schedulePickerAfterSheetClose(() => onSelect("library"));
          }}
        />
        <OptionRow
          icon="document-attach-outline"
          label="Choose file"
          hint="Browse images on your device"
          isDark={isDark}
          onPress={() => {
            onClose();
            schedulePickerAfterSheetClose(() => onSelect("file"));
          }}
        />
        <Pressable
          onPress={onClose}
          className="mt-2 items-center rounded-xl py-3.5 active:opacity-80"
        >
          <Text className="text-[15px] font-semibold text-muted-foreground">Cancel</Text>
        </Pressable>
      </View>
    </BottomSheetModal>
  );
}
