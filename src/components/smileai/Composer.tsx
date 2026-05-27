import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useToastStore } from "@/components/ui/toast";

const SECRET_PATTERN =
  /\b(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}|\d{3,4}|\bOTP\b|\bPIN\b)\b/i;

type Props = {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
};

export function Composer({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = "Message Smile…",
}: Props) {
  const { isDark } = useAppTheme();
  const showToast = useToastStore((s) => s.show);
  const canSend = value.trim().length > 0 && !disabled;

  const handleChange = (text: string) => {
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
      className="flex-row items-end gap-2 border-t border-border bg-background px-3 py-2"
      style={{ minHeight: 56 }}
    >
      <Pressable
        onPress={() =>
          showToast({ variant: "info", title: "Attachments coming soon." })
        }
        accessibilityRole="button"
        accessibilityLabel="Attach file"
        hitSlop={8}
        style={{ minWidth: 44, minHeight: 44, justifyContent: "center" }}
      >
        <Ionicons
          name="attach"
          size={22}
          color={isDark ? "#94A3B8" : "#64748B"}
        />
      </Pressable>
      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
        multiline
        editable={!disabled}
        className="max-h-28 flex-1 rounded-2xl border border-border bg-card px-3 py-2 text-base text-foreground"
      />
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        style={{
          minWidth: 44,
          minHeight: 44,
          justifyContent: "center",
          alignItems: "center",
          opacity: canSend ? 1 : 0.4,
        }}
      >
        <Ionicons name="send" size={22} color="#F97316" />
      </Pressable>
    </View>
  );
}
