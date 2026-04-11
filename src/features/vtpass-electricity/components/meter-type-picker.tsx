import { Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { cn } from "@/lib/utils";
import type { MeterType } from "@/types/vtpass-electricity";

interface MeterTypePickerProps {
  selected: MeterType;
  onSelect: (type: MeterType) => void;
}

export function MeterTypePicker({ selected, onSelect }: MeterTypePickerProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(50).duration(300)}
      className="mt-6"
    >
      <Text className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Meter type
      </Text>
      <View className="flex-row gap-3">
        <Pressable
          onPress={() => onSelect("prepaid")}
          className={cn(
            "flex-1 flex-row items-center gap-2.5 rounded-xl border p-3.5",
            selected === "prepaid"
              ? "border-primary bg-primary/10"
              : "border-border bg-card active:bg-muted/50",
          )}
        >
          <View className="h-9 w-9 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-950">
            <Ionicons name="flash" size={18} color="#EAB308" />
          </View>
          <View className="flex-1">
            <Text className="text-[14px] font-semibold text-foreground">
              Prepaid
            </Text>
            <Text className="text-[10px] text-muted-foreground">
              Get token
            </Text>
          </View>
          {selected === "prepaid" && (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.orange[500]}
            />
          )}
        </Pressable>

        <Pressable
          onPress={() => onSelect("postpaid")}
          className={cn(
            "flex-1 flex-row items-center gap-2.5 rounded-xl border p-3.5",
            selected === "postpaid"
              ? "border-primary bg-primary/10"
              : "border-border bg-card active:bg-muted/50",
          )}
        >
          <View className="h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
            <Ionicons name="receipt" size={18} color="#2563EB" />
          </View>
          <View className="flex-1">
            <Text className="text-[14px] font-semibold text-foreground">
              Postpaid
            </Text>
            <Text className="text-[10px] text-muted-foreground">
              Pay bill
            </Text>
          </View>
          {selected === "postpaid" && (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.orange[500]}
            />
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}
