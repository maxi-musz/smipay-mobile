import { Pressable, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { formatNaira } from "../lib/constants";
import type { DataVariation } from "@/types/vtpass-data";

/** Left-edge accent colors for plan cards. */
const ACCENT_COLORS = [
  "#3B82F6",
  "#22C55E",
  "#A855F7",
  "#F58220",
  "#EF4444",
];

const STAR_YELLOW = "#EAB308";

/** Extract duration from plan name (e.g. "30 days", "7 Days", "1 Day"). */
function getDurationLabel(name: string): string | null {
  const match = name.match(/\b(\d+)\s*(day|days?)\b/i);
  if (match) {
    const n = match[1];
    const unit = match[2].toLowerCase();
    return `${n} ${parseInt(n, 10) === 1 ? "day" : "days"}`;
  }
  const weekly = name.match(/\b(\d+)\s*week/i);
  if (weekly) return `${weekly[1]} week${weekly[1] === "1" ? "" : "s"}`;
  const monthly = name.match(/\b(\d+)\s*month/i);
  if (monthly) return `${monthly[1]} month${monthly[1] === "1" ? "" : "s"}`;
  return null;
}

/** Strip price suffix from name if present (e.g. " - N1,000"). */
function getPlanTitle(name: string): string {
  return name.replace(/\s*[-–]\s*N[\d,.]+\s*$/i, "").trim() || name;
}

interface PlanListProps {
  serviceID: string;
  plans: DataVariation[];
  onSelectPlan: (v: DataVariation) => void;
  isFavourite?: (plan: DataVariation) => boolean;
  onToggleFavourite?: (plan: DataVariation) => void;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

function PlanCard({
  plan,
  serviceID,
  onPress,
  accentColor,
  isFav,
  onStarPress,
}: {
  plan: DataVariation;
  serviceID: string;
  onPress: () => void;
  accentColor: string;
  isFav: boolean;
  onStarPress?: () => void;
}) {
  const amount = plan.variation_amount
    ? parseFloat(String(plan.variation_amount))
    : 0;
  const hasPrice = amount > 0;
  const title = getPlanTitle(plan.name);
  const duration = getDurationLabel(plan.name);

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
            {title}
          </Text>
          {duration && (
            <Text className="mt-0.5 text-[11px] text-muted-foreground">
              {duration}
            </Text>
          )}
        </View>
        <View className="flex-row items-center gap-0.5 shrink-0">
          {hasPrice && (
            <Text
              className="text-[13px] font-semibold text-foreground"
              style={{ color: colors.orange[600] }}
            >
              {formatNaira(amount)}
            </Text>
          )}
          {onStarPress != null && (
            <Pressable
              onPress={onStarPress}
              className="h-8 w-8 items-center justify-center rounded-full"
              hitSlop={6}
            >
              <Ionicons
                name={isFav ? "star" : "star-outline"}
                size={18}
                color={isFav ? STAR_YELLOW : colors.gray[400]}
              />
            </Pressable>
          )}
          <View className="h-7 w-7 items-center justify-center rounded-full bg-muted/50">
            <Ionicons name="chevron-forward" size={14} color={colors.gray[500]} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function PlanList({
  serviceID,
  plans,
  onSelectPlan,
  isFavourite,
  onToggleFavourite,
  error,
  emptyMessage = "No plans in this category",
}: PlanListProps) {
  if (error) {
    return (
      <View className="rounded-xl bg-destructive/10 px-4 py-3">
        <Text className="text-sm text-destructive">{error}</Text>
      </View>
    );
  }

  if (plans.length === 0) {
    return (
      <View className="rounded-xl bg-muted/30 px-4 py-8">
        <Text className="text-center text-sm text-muted-foreground">
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(200)}>
      {plans.map((plan, index) => (
        <PlanCard
          key={`${serviceID}-${plan.variation_code}-${index}`}
          plan={plan}
          serviceID={serviceID}
          onPress={() => onSelectPlan(plan)}
          accentColor={ACCENT_COLORS[index % ACCENT_COLORS.length]}
          isFav={isFavourite?.(plan) ?? false}
          onStarPress={
            onToggleFavourite
              ? () => onToggleFavourite(plan)
              : undefined
          }
        />
      ))}
    </Animated.View>
  );
}
