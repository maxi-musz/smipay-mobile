import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface FundMethodOptionProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  className?: string;
}

export function FundMethodOption({
  title,
  description,
  icon,
  onPress,
  className,
}: FundMethodOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-row items-start gap-4 rounded-2xl border border-border bg-card p-4 active:bg-muted",
        className,
      )}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Ionicons name={icon} size={24} color="#F58220" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-foreground">{title}</Text>
        <Text className="mt-1 text-sm leading-5 text-muted-foreground">
          {description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </Pressable>
  );
}
