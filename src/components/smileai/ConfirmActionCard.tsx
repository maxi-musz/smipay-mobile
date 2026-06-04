import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";

type Props = {
  title: string;
  description: string;
  safety?: "read" | "write" | "sensitive";
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
};

export function ConfirmActionCard({
  title,
  description,
  safety,
  onCancel,
  onConfirm,
  loading,
}: Props) {
  const { isDark } = useAppTheme();
  const isSensitive = safety === "sensitive";
  const bg = isSensitive
    ? isDark
      ? "#3F1D1D"
      : "#FEF2F2"
    : isDark
      ? "#1E293B"
      : "#FFF7ED";
  const borderColor = isSensitive
    ? isDark
      ? "#7F1D1D"
      : "#FCA5A5"
    : isDark
      ? "#334155"
      : "#FED7AA";
  const ctaLabel = isSensitive ? "Verify PIN to confirm" : "Confirm";

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor,
      }}
      accessibilityRole="alert"
    >
      <Text className="text-base font-semibold">{title}</Text>
      <Text className="mt-2 text-sm text-muted-foreground">{description}</Text>
      {isSensitive ? (
        <Text className="mt-2 text-xs text-muted-foreground">
          You will be asked for your transaction PIN before this runs.
        </Text>
      ) : null}
      <View className="mt-4 flex-row gap-3">
        <Button variant="outline" className="flex-1" onPress={onCancel} disabled={loading}>
          <Text>Cancel</Text>
        </Button>
        <Button className="flex-1" onPress={onConfirm} disabled={loading}>
          <Text className="font-semibold text-primary-foreground">{ctaLabel}</Text>
        </Button>
      </View>
    </View>
  );
}
