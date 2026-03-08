import { Pressable, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { formatNaira } from "../lib/constants";
import type { EducationVariation } from "@/types/vtpass-education";

const ACCENT_COLORS = ["#3B82F6", "#22C55E", "#A855F7", "#F58220", "#EF4444"];

function VariationCard({
  variation,
  onPress,
  accentColor,
}: {
  variation: EducationVariation;
  onPress: () => void;
  accentColor: string;
}) {
  const amount = parseFloat(variation.variation_amount);

  return (
    <Pressable
      onPress={onPress}
      className="mb-2.5 flex-row items-center overflow-hidden rounded-xl border border-border bg-card active:opacity-95"
    >
      <View
        className="h-full w-0.5 min-h-[52]"
        style={{ backgroundColor: accentColor }}
      />
      <View className="flex-1 flex-row items-center min-h-[52] px-3 py-2.5 gap-3">
        <View className="flex-1 min-w-0 justify-center">
          <Text
            className="text-[13px] font-medium text-foreground leading-tight"
            numberOfLines={2}
          >
            {variation.name}
          </Text>
        </View>
        <View className="flex-row items-center gap-0.5 shrink-0">
          <Text
            className="text-[13px] font-semibold"
            style={{ color: colors.orange[600] }}
          >
            {formatNaira(amount)}
          </Text>
          <View className="h-7 w-7 items-center justify-center rounded-full bg-muted/50">
            <Ionicons
              name="chevron-forward"
              size={14}
              color={colors.gray[500]}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

interface VariationListProps {
  variations: EducationVariation[];
  onSelect: (v: EducationVariation) => void;
  loading?: boolean;
  error?: string | null;
}

export function VariationList({
  variations,
  onSelect,
  error,
}: VariationListProps) {
  if (error) {
    return (
      <View className="rounded-xl bg-destructive/10 px-4 py-3">
        <Text className="text-sm text-destructive">{error}</Text>
      </View>
    );
  }

  if (variations.length === 0) {
    return (
      <View className="rounded-xl bg-muted/30 px-4 py-8">
        <Text className="text-center text-sm text-muted-foreground">
          No plans available
        </Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(200)}>
      {variations.map((v, i) => (
        <VariationCard
          key={`${v.variation_code}-${i}`}
          variation={v}
          onPress={() => onSelect(v)}
          accentColor={ACCENT_COLORS[i % ACCENT_COLORS.length]}
        />
      ))}
    </Animated.View>
  );
}
