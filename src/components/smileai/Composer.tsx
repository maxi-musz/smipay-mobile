import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useToastStore } from "@/components/ui/toast";

const SECRET_PATTERN =
  /\b(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}|\d{3,4}|\bOTP\b|\bPIN\b)\b/i;

type Props = {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  /** When Smile is generating a reply — shows a high-contrast status in the input. */
  isThinking?: boolean;
  placeholder?: string;
};

export function Composer({
  value,
  onChange,
  onSend,
  disabled,
  isThinking = false,
  placeholder = "Message Smile…",
}: Props) {
  const { isDark } = useAppTheme();
  const showToast = useToastStore((s) => s.show);
  const canSend = value.trim().length > 0 && !disabled;
  const muted = isDark ? "#64748B" : "#94A3B8";
  const thinkingColor = isDark ? "#FB923C" : "#C2520A";
  const showThinkingStatus = isThinking && !value.trim();

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
      <View
        className="relative max-h-28 min-h-[48px] flex-1 rounded-2xl border border-border bg-card"
        style={
          showThinkingStatus
            ? {
                backgroundColor: isDark ? "rgba(251,146,60,0.08)" : "#FFF7ED",
                borderColor: isDark ? "rgba(251,146,60,0.35)" : "#FED7AA",
              }
            : undefined
        }
      >
        <TextInput
          value={value}
          onChangeText={handleChange}
          placeholder={showThinkingStatus ? "" : placeholder}
          placeholderTextColor={muted}
          multiline
          editable={!disabled}
          pointerEvents={disabled ? "none" : "auto"}
          accessibilityLabel={
            showThinkingStatus ? "Smile is thinking" : placeholder
          }
          className="max-h-28 flex-1 bg-transparent px-4 text-base text-foreground"
          style={{
            minHeight: 48,
            paddingTop: 12,
            paddingBottom: 12,
            ...(disabled && !isThinking ? { opacity: 0.7 } : null),
          }}
        />
        {showThinkingStatus ? (
          <View
            pointerEvents="none"
            className="absolute inset-0 justify-center rounded-2xl px-4"
            style={{ zIndex: 1 }}
          >
            <Text
              style={{
                color: thinkingColor,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              Smile is thinking…
            </Text>
          </View>
        ) : null}
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
