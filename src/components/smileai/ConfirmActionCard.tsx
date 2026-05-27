import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";

type Props = {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
};

export function ConfirmActionCard({
  title,
  description,
  onCancel,
  onConfirm,
  loading,
}: Props) {
  const { isDark } = useAppTheme();
  const bg = isDark ? "#1E293B" : "#FFF7ED";

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: isDark ? "#334155" : "#FED7AA",
      }}
      accessibilityRole="alert"
    >
      <Text className="text-base font-semibold">{title}</Text>
      <Text className="mt-2 text-sm text-muted-foreground">{description}</Text>
      <View className="mt-4 flex-row gap-3">
        <Button variant="outline" className="flex-1" onPress={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button className="flex-1" onPress={onConfirm} disabled={loading}>
          Confirm
        </Button>
      </View>
    </View>
  );
}
