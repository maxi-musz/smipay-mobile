import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";

type Props = {
  /** First-name-friendly agent name once a specialist has claimed the chat. */
  agentName?: string | null;
};

function firstWord(name?: string | null): string {
  if (!name?.trim()) return "";
  return name.trim().split(/\s+/)[0] ?? "";
}

/**
 * Inline status banner shown at the top of the Smiley thread after a handoff.
 * The conversation stays in this same screen — before a specialist claims it we
 * show a "connecting" state; once claimed we reveal who the user is chatting
 * with. Their replies arrive inline in the thread below.
 */
export function HandoffBanner({ agentName }: Props) {
  const { isDark } = useAppTheme();
  const bg = isDark ? "#1E3A5F" : "#DBEAFE";
  const name = firstWord(agentName);
  const title = name
    ? `You're now chatting with ${name}`
    : "Connecting you to a specialist agent";
  const subtitle = name
    ? "Replies from the specialist appear right here."
    : "As soon as they reply, you'll see it here — usually within a few minutes.";

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
      }}
      accessibilityRole="text"
      accessibilityLabel={title}
    >
      <Ionicons name="people" size={20} color={isDark ? "#93C5FD" : "#2563EB"} />
      <View className="ml-2 flex-1">
        <Text className="text-sm font-medium">{title}</Text>
        <Text className="mt-0.5 text-xs text-muted-foreground">{subtitle}</Text>
      </View>
    </View>
  );
}
