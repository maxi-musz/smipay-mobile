import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { cn } from "@/lib/utils";
import type { IntlOperator } from "@/types/vtpass-intl-airtime";

interface OperatorPickerProps {
  operators: IntlOperator[];
  selectedId: string | null;
  onSelect: (op: IntlOperator) => void;
  loading?: boolean;
  error?: string | null;
}

function OperatorLogo({ imageUrl, name }: { imageUrl: string; name: string }) {
  return (
    <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-muted">
      <Image
        source={{ uri: imageUrl }}
        style={{ width: 40, height: 40 }}
        resizeMode="contain"
      />
    </View>
  );
}

export function OperatorPicker({
  operators,
  selectedId,
  onSelect,
  error,
}: OperatorPickerProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(50).duration(300)}
      className="mt-6"
    >
      <Text className="mb-3 text-base font-semibold text-foreground">
        Operator
      </Text>
      {error && (
        <Text className="mb-2 text-sm text-destructive">{error}</Text>
      )}
      <View className="gap-2">
        {operators.map((op) => {
          const isSelected = selectedId === op.operator_id;
          return (
            <Pressable
              key={op.operator_id}
              onPress={() => onSelect(op)}
              className={cn(
                "flex-row items-center gap-3 rounded-xl border p-3",
                isSelected ? "border-primary bg-primary/10" : "border-border bg-muted/30",
              )}
            >
              {op.operator_image ? (
                <OperatorLogo
                  imageUrl={op.operator_image}
                  name={op.name}
                />
              ) : (
                <View className="h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Ionicons name="cellular" size={22} color={colors.gray[500]} />
                </View>
              )}
              <Text
                className={cn(
                  "flex-1 text-base font-medium",
                  isSelected ? "text-primary" : "text-foreground",
                )}
              >
                {op.name}
              </Text>
              {isSelected && (
                <View className="h-5 w-5 rounded-full bg-primary" />
              )}
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}
