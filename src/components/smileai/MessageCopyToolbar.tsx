import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useToastStore } from "@/components/ui/toast";

export type MessageCopyAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  visible: boolean;
  anchor: MessageCopyAnchor | null;
  text: string;
  onClose: () => void;
};

const TOOLBAR_WIDTH = 108;
const TOOLBAR_HEIGHT = 40;
const GAP = 8;

export function MessageCopyToolbar({ visible, anchor, text, onClose }: Props) {
  const { isDark } = useAppTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const showToast = useToastStore((s) => s.show);

  if (!visible || !anchor) return null;

  const left = Math.min(
    Math.max(GAP, anchor.x + anchor.width / 2 - TOOLBAR_WIDTH / 2),
    screenWidth - TOOLBAR_WIDTH - GAP,
  );

  const spaceAbove = anchor.y - GAP;
  const spaceBelow = screenHeight - (anchor.y + anchor.height) - GAP;
  const showAbove =
    spaceAbove >= TOOLBAR_HEIGHT + GAP || spaceAbove >= spaceBelow;

  const top = showAbove
    ? Math.max(GAP, anchor.y - TOOLBAR_HEIGHT - GAP)
    : anchor.y + anchor.height + GAP;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(text);
    showToast({
      variant: "success",
      title: "Copied",
      message: "Message copied to clipboard.",
    });
    onClose();
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss copy menu">
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Pressable
            onPress={handleCopy}
            accessibilityRole="button"
            accessibilityLabel="Copy message"
            style={[
              styles.toolbar,
              {
                left,
                top,
                width: TOOLBAR_WIDTH,
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                borderColor: isDark ? "#334155" : "#E2E8F0",
                shadowColor: "#000",
              },
            ]}
          >
            <Ionicons
              name="copy-outline"
              size={16}
              color={isDark ? "#FB923C" : "#EA580C"}
            />
            <Text
              className="text-sm font-semibold"
              style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}
            >
              Copy
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  toolbar: {
    position: "absolute",
    height: TOOLBAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
});
