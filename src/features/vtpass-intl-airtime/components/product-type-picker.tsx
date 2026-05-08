import { Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import type { IntlProductType } from "@/types/vtpass-intl-airtime";

interface ProductTypePickerProps {
  productTypes: IntlProductType[];
  selectedId: number | null;
  onSelect: (pt: IntlProductType) => void;
  loading?: boolean;
  error?: string | null;
}

export function ProductTypePicker({
  productTypes,
  selectedId,
  onSelect,
  error,
}: ProductTypePickerProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(50).duration(300)}
      className="mt-6"
    >
      <Text className="mb-3 text-base font-semibold text-foreground">
        Product type
      </Text>
      {error && (
        <Text className="mb-2 text-sm text-destructive">{error}</Text>
      )}
      <View className="flex-row flex-wrap gap-2">
        {productTypes.map((pt) => {
          const isSelected = selectedId === pt.product_type_id;
          return (
            <Pressable
              key={pt.product_type_id}
              onPress={() => onSelect(pt)}
              className={cn(
                "rounded-xl border px-4 py-3",
                isSelected ? "border-primary bg-primary/10" : "border-border bg-muted/30",
              )}
            >
              <Text
                className={cn(
                  "text-sm font-medium",
                  isSelected ? "text-primary" : "text-foreground",
                )}
              >
                {pt.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
