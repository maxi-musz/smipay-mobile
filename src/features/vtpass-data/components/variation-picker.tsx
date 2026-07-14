import { Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import {
  dataPlanPriceNgn,
  formatNaira,
  isDataPlanAffordable,
  sortDataPlansByAffordability,
} from "@/features/vtpass-data/lib/constants";
import type { DataVariation, DataVariationCategory } from "@/types/vtpass-data";

interface VariationPickerProps {
  variationsCategorized: Record<string, DataVariationCategory>;
  selectedCode: string | null;
  /** Wallet + cashback; plans above this cannot be selected. */
  maxPayable: number;
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
  affordable,
  onSelect,
}: {
  v: DataVariation;
  isSelected: boolean;
  affordable: boolean;
  onSelect: () => void;
}) {
  const price = dataPlanPriceNgn(v);
  const hasPrice = price > 0;
  return (
    <Pressable
      onPress={onSelect}
      disabled={!affordable}
      accessibilityState={{ disabled: !affordable }}
      className={cn(
        "rounded-xl border p-3",
        !affordable && "opacity-60",
        isSelected && affordable
          ? "border-primary bg-primary/10"
          : "border-border bg-muted/30",
      )}
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text
          className={cn(
            "flex-1 text-base font-medium",
            isSelected && affordable ? "text-primary" : "text-foreground",
            !affordable && "text-muted-foreground",
          )}
        >
          {v.name}
        </Text>
        {hasPrice && (
          <Text
            className={cn(
              "text-sm shrink-0",
              affordable ? "text-muted-foreground" : "text-destructive",
            )}
          >
            {formatNaira(price)}
          </Text>
        )}
        {isSelected && affordable && (
          <View className="h-5 w-5 rounded-full bg-primary" />
        )}
      </View>
      {!affordable && hasPrice && (
        <Text className="mt-2 text-xs text-destructive">
          Exceeds wallet + cashback — add funds or use a cheaper plan
        </Text>
      )}
    </Pressable>
  );
}

export function VariationPicker({
  variationsCategorized,
  selectedCode,
  maxPayable,
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
      entering={FadeInDown.delay(50).duration(300)}
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
                {sortDataPlansByAffordability(block.variations, maxPayable).map(
                  (v) => {
                    const affordable = isDataPlanAffordable(v, maxPayable);
                    return (
                      <VariationItem
                        key={v.variation_code}
                        v={v}
                        isSelected={selectedCode === v.variation_code}
                        affordable={affordable}
                        onSelect={() => {
                          if (!affordable) return;
                          onSelect(v);
                        }}
                      />
                    );
                  },
                )}
              </View>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}
