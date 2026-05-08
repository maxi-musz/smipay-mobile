import { Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import type { IntlVariation } from "@/types/vtpass-intl-airtime";

interface VariationPickerProps {
  variations: IntlVariation[];
  selectedCode: string | null;
  onSelect: (v: IntlVariation) => void;
  loading?: boolean;
  error?: string | null;
}

export function VariationPicker({
  variations,
  selectedCode,
  onSelect,
  error,
}: VariationPickerProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(50).duration(300)}
      className="mt-6"
    >
      <Text className="mb-3 text-base font-semibold text-foreground">
        Plan
      </Text>
      {error && (
        <Text className="mb-2 text-sm text-destructive">{error}</Text>
      )}
      <View className="gap-2">
        {variations.map((v) => {
          const isSelected = selectedCode === v.variation_code;
          const hasPrice =
            v.variation_amount && parseFloat(v.variation_amount) > 0;
          return (
            <Pressable
              key={v.variation_code}
              onPress={() => onSelect(v)}
              className={cn(
                "rounded-xl border p-3",
                isSelected ? "border-primary bg-primary/10" : "border-border bg-muted/30",
              )}
            >
              <View className="flex-row items-center justify-between">
                <Text
                  className={cn(
                    "flex-1 text-base font-medium",
                    isSelected ? "text-primary" : "text-foreground",
                  )}
                >
                  {v.name}
                </Text>
                {hasPrice && (
                  <Text className="text-sm text-muted-foreground">
                    ₦{v.variation_amount}
                  </Text>
                )}
                {isSelected && (
                  <View className="ml-2 h-5 w-5 rounded-full bg-primary" />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
