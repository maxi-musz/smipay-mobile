import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { SMILEY_ASSISTANT_NAME } from "@/constants/smiley";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useToastStore } from "@/components/ui/toast";

const SECRET_PATTERN =
  /\b(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}|\d{3,4}|\bOTP\b|\bPIN\b)\b/i;

type Props = {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  /** Reserved to hard-block input; not used for handed-off chats, which stay interactive. */
  disabled?: boolean;
  placeholder?: string;
};

/**
 * Message input. Intentionally never locks while Smiley is generating a reply —
 * the user can keep typing and firing off messages, WhatsApp-style; the backend
 * coalesces them. After a handoff the composer also stays active: the backend
 * bridges those messages to the specialist. `disabled` remains available for any
 * future state that must genuinely block input.
 */
export function Composer({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = `Message ${SMILEY_ASSISTANT_NAME}…`,
}: Props) {
  const { isDark } = useAppTheme();
  const showToast = useToastStore((s) => s.show);
  const canSend = value.trim().length > 0 && !disabled;
  const muted = isDark ? "#64748B" : "#94A3B8";

  const handleChange = (text: string) => {
    if (disabled) return;
    if (SECRET_PATTERN.test(text)) {
      showToast({
        variant: "warning",
        title: "Never share PINs, OTPs, or card numbers in chat.",
      });
    }
    onChange(text);
  };

  return (
    <View
      className="flex-row items-end gap-2 bg-background px-4 py-3"
      style={{ minHeight: 64 }}
    >
      <Pressable
        onPress={() =>
          showToast({ variant: "info", title: "Attachments coming soon." })
        }
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Attach file"
        accessibilityState={{ disabled: !!disabled }}
        hitSlop={8}
        style={{
          minWidth: 48,
          minHeight: 48,
          justifyContent: "center",
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <Ionicons name="attach" size={24} color={muted} />
      </Pressable>
      <View className="relative max-h-28 min-h-[48px] flex-1 rounded-2xl border border-border bg-card">
        <TextInput
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={muted}
          multiline
          editable={!disabled}
          pointerEvents={disabled ? "none" : "auto"}
          accessibilityLabel={placeholder}
          className="max-h-28 flex-1 bg-transparent px-4 text-base text-foreground"
          style={{
            minHeight: 48,
            paddingTop: 12,
            paddingBottom: 12,
            ...(disabled ? { opacity: 0.7 } : null),
          }}
        />
      </View>
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        style={{
          minWidth: 48,
          minHeight: 48,
          justifyContent: "center",
          alignItems: "center",
          opacity: canSend ? 1 : 0.4,
        }}
      >
        <Ionicons name="send" size={24} color="#F97316" />
      </Pressable>
    </View>
  );
}
