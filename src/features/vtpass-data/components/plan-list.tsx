import { Pressable, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { cn } from "@/lib/utils";
import {
  dataPlanPriceNgn,
  formatNaira,
  isDataPlanAffordable,
} from "../lib/constants";
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
  /** Wallet + cashback; plans above this are shown disabled and cannot be opened. */
  maxPayable: number;
  onSelectPlan: (v: DataVariation) => void;
  isFavourite?: (plan: DataVariation) => boolean;
  onToggleFavourite?: (plan: DataVariation) => void;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

function PlanCard({
  plan,
  onPress,
  accentColor,
  isFav,
  onStarPress,
  affordable,
}: {
  plan: DataVariation;
  onPress: () => void;
  accentColor: string;
  isFav: boolean;
  onStarPress?: () => void;
  affordable: boolean;
}) {
  const amount = dataPlanPriceNgn(plan);
  const hasPrice = amount > 0;
  const title = getPlanTitle(plan.name);
  const duration = getDurationLabel(plan.name);

  return (
    <View
      className={cn(
        "mb-2.5 flex-row items-stretch overflow-hidden rounded-xl border bg-card",
        affordable ? "border-border" : "border-border opacity-70",
      )}
    >
      <View
        className="w-0.5 min-h-[52]"
        style={{ backgroundColor: affordable ? accentColor : colors.gray[500] }}
      />
      <Pressable
        onPress={onPress}
        disabled={!affordable}
        accessibilityState={{ disabled: !affordable }}
        className={cn(
          "flex-1 min-w-0 flex-row items-center px-3 py-2.5 gap-3 min-h-[52]",
          affordable && "active:opacity-95",
        )}
      >
        <View className="flex-1 min-w-0 justify-center">
          <Text
            className={cn(
              "text-[13px] font-medium leading-tight",
              affordable ? "text-foreground" : "text-muted-foreground",
            )}
            numberOfLines={2}
          >
            {title}
          </Text>
          {duration && (
            <Text className="mt-0.5 text-[11px] text-muted-foreground">
              {duration}
            </Text>
          )}
          {!affordable && hasPrice && (
            <Text className="mt-1 text-[11px] text-destructive" numberOfLines={1}>
              Exceeds wallet + cashback
            </Text>
          )}
        </View>
        <View className="flex-row items-center gap-0.5 shrink-0">
          {hasPrice && (
            <Text
              className="text-[13px] font-semibold"
              style={{
                color: affordable ? colors.orange[600] : colors.gray[500],
              }}
            >
              {formatNaira(amount)}
            </Text>
          )}
          <View
            className={cn(
              "h-7 w-7 items-center justify-center rounded-full",
              affordable ? "bg-muted/50" : "bg-muted/30",
            )}
          >
            <Ionicons
              name="chevron-forward"
              size={14}
              color={affordable ? colors.gray[500] : colors.gray[400]}
            />
          </View>
        </View>
      </Pressable>
      {onStarPress != null && (
        <Pressable
          onPress={onStarPress}
          className="justify-center px-1 border-l border-border"
          hitSlop={6}
          accessibilityLabel="Favourite"
        >
          <Ionicons
            name={isFav ? "star" : "star-outline"}
            size={18}
            color={isFav ? STAR_YELLOW : colors.gray[400]}
          />
        </Pressable>
      )}
    </View>
  );
}

export function PlanList({
  serviceID,
  plans,
  maxPayable,
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
      {plans.map((plan, index) => {
        const affordable = isDataPlanAffordable(plan, maxPayable);
        return (
          <PlanCard
            key={`${serviceID}-${plan.variation_code}-${index}`}
            plan={plan}
            affordable={affordable}
            onPress={() => {
              if (!affordable) return;
              onSelectPlan(plan);
            }}
            accentColor={ACCENT_COLORS[index % ACCENT_COLORS.length]}
            isFav={isFavourite?.(plan) ?? false}
            onStarPress={
              onToggleFavourite
                ? () => onToggleFavourite(plan)
                : undefined
            }
          />
        );
      })}
    </Animated.View>
  );
}
