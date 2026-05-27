import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";

type Props = {
  supportConversationId: string | null;
  onViewSupport?: () => void;
};

export function HandoffBanner({ supportConversationId, onViewSupport }: Props) {
  const { isDark } = useAppTheme();
  const bg = isDark ? "#1E3A5F" : "#DBEAFE";

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
      accessibilityLabel="Connecting you to a human agent"
    >
      <Ionicons name="people" size={20} color={isDark ? "#93C5FD" : "#2563EB"} />
      <Text className="ml-2 flex-1 text-sm font-medium">
        Connecting you to a human agent
      </Text>
      {supportConversationId && onViewSupport ? (
        <Pressable
          onPress={onViewSupport}
          accessibilityRole="button"
          accessibilityLabel="View support conversation"
          hitSlop={8}
        >
          <Text className="text-sm font-semibold text-primary">View</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
