import { Image, Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import type { IntlCountry } from "@/types/vtpass-intl-airtime";

interface CountryPickerProps {
  countries: IntlCountry[];
  selectedCode: string | null;
  onSelect: (country: IntlCountry) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function CountryPicker({
  countries,
  selectedCode,
  onSelect,
  loading,
  error,
  onRetry,
}: CountryPickerProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(50).duration(300).springify().damping(15)}
      className="mt-2"
    >
      <Text className="mb-3 text-base font-semibold text-foreground">
        Country
      </Text>
      {error && (
        <View className="mb-2 flex-row items-center justify-between rounded-lg bg-destructive/10 px-3 py-2">
          <Text className="flex-1 text-sm text-destructive">{error}</Text>
          {onRetry && (
            <Pressable onPress={onRetry} hitSlop={8}>
              <Text className="text-sm font-medium text-primary">Retry</Text>
            </Pressable>
          )}
        </View>
      )}
      <View className="gap-2">
        {countries.map((c) => {
          const isSelected = selectedCode === c.code;
          return (
            <Pressable
              key={c.code}
              onPress={() => onSelect(c)}
              className={cn(
                "flex-row items-center gap-3 rounded-xl border p-3",
                isSelected ? "border-primary bg-primary/10" : "border-border bg-muted/30",
              )}
            >
              <View className="h-8 w-10 overflow-hidden rounded bg-muted">
                <Image
                  source={{ uri: c.flag }}
                  style={{ width: 40, height: 32 }}
                  resizeMode="cover"
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">
                  {c.name}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  +{c.prefix} · {c.currency}
                </Text>
              </View>
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
