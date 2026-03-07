import { Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import type { DataVariation, DataVariationCategory } from "@/types/vtpass-data";

interface VariationPickerProps {
  variationsCategorized: Record<string, DataVariationCategory>;
  selectedCode: string | null;
  onSelect: (v: DataVariation) => void;
  loading?: boolean;
  error?: string | null;
}

/** Order of categories to display when variations_categorized is present. */
const CATEGORY_ORDER = [
  "Daily",
  "Weekly",
  "Monthly",
  "Night",
  "Weekend",
  "Social",
  "SME",
  "Hynetflex",
  "Broadband router",
  "Others",
];

function VariationItem({
  v,
  isSelected,
  onSelect,
}: {
  v: DataVariation;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const hasPrice =
    v.variation_amount && parseFloat(String(v.variation_amount)) > 0;
  return (
    <Pressable
      onPress={onSelect}
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
}

export function VariationPicker({
  variationsCategorized,
  selectedCode,
  onSelect,
  error,
}: VariationPickerProps) {
  const categories = Object.keys(variationsCategorized).filter(
    (k) =>
      variationsCategorized[k]?.variations?.length > 0,
  );
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((k) => categories.includes(k)),
    ...categories.filter((k) => !CATEGORY_ORDER.includes(k)),
  ];

  return (
    <Animated.View
      entering={FadeInDown.delay(50).duration(300).springify().damping(15)}
      className="mt-6"
    >
      <Text className="mb-3 text-base font-semibold text-foreground">
        Plan
      </Text>
      {error && (
        <Text className="mb-2 text-sm text-destructive">{error}</Text>
      )}
      <View className="gap-4">
        {orderedCategories.map((category) => {
          const block = variationsCategorized[category];
          if (!block?.variations?.length) return null;
          return (
            <View key={category}>
              <Text className="mb-2 text-sm font-medium text-muted-foreground">
                {category}
              </Text>
              <View className="gap-2">
                {block.variations.map((v) => (
                  <VariationItem
                    key={v.variation_code}
                    v={v}
                    isSelected={selectedCode === v.variation_code}
                    onSelect={() => onSelect(v)}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}
