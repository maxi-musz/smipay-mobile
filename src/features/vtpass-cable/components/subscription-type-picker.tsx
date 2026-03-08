import { Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { formatNaira } from "../lib/constants";
import { cn } from "@/lib/utils";
import type { CableSubscriptionType } from "@/types/vtpass-cable";

interface SubscriptionTypePickerProps {
  selected: CableSubscriptionType | null;
  onSelect: (type: CableSubscriptionType) => void;
  renewalAmount: number;
  currentBouquet: string;
  selectedBouquetName: string;
}

export function SubscriptionTypePicker({
  selected,
  onSelect,
  renewalAmount,
  currentBouquet,
  selectedBouquetName,
}: SubscriptionTypePickerProps) {
  const hasRenewalInfo = renewalAmount > 0 || !!currentBouquet;

  return (
    <Animated.View
      entering={FadeInDown.delay(50).duration(300).springify().damping(15)}
      className="mt-6 gap-3"
    >
      <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        What would you like to do?
      </Text>

      {/* Renew — always visible for DSTV/GOTV */}
      <Pressable
        onPress={() => onSelect("renew")}
        className={cn(
          "flex-row items-center gap-3 rounded-xl border p-4",
          selected === "renew"
            ? "border-primary bg-primary/10"
            : "border-border bg-card active:bg-muted/50",
        )}
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
          <Ionicons name="refresh" size={22} color={colors.green[600]} />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-[15px] font-semibold text-foreground">
            Renew current bouquet
          </Text>
          {hasRenewalInfo ? (
            <Text
              className="mt-0.5 text-xs text-muted-foreground"
              numberOfLines={1}
            >
              {currentBouquet || "Current plan"}
              {renewalAmount > 0 ? ` — ${formatNaira(renewalAmount)}` : ""}
            </Text>
          ) : (
            <Text className="mt-0.5 text-xs text-muted-foreground">
              Keep your current subscription
            </Text>
          )}
        </View>
        {selected === "renew" && (
          <Ionicons
            name="checkmark-circle"
            size={22}
            color={colors.orange[500]}
          />
        )}
      </Pressable>

      {/* Change */}
      <Pressable
        onPress={() => onSelect("change")}
        className={cn(
          "flex-row items-center gap-3 rounded-xl border p-4",
          selected === "change"
            ? "border-primary bg-primary/10"
            : "border-border bg-card active:bg-muted/50",
        )}
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
          <Ionicons name="swap-horizontal" size={22} color="#2563EB" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-[15px] font-semibold text-foreground">
            Change bouquet
          </Text>
          <Text
            className="mt-0.5 text-xs text-muted-foreground"
            numberOfLines={1}
          >
            Switch to: {selectedBouquetName}
          </Text>
        </View>
        {selected === "change" && (
          <Ionicons
            name="checkmark-circle"
            size={22}
            color={colors.orange[500]}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}
