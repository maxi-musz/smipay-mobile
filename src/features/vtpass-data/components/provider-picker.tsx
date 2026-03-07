import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { cn } from "@/lib/utils";
import type { DataServiceItem } from "@/types/vtpass-data";

interface ProviderPickerProps {
  providers: DataServiceItem[];
  selectedServiceID: string | null;
  onSelect: (p: DataServiceItem) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function ProviderLogo({ imageUrl, name }: { imageUrl: string; name: string }) {
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

export function ProviderPicker({
  providers,
  selectedServiceID,
  onSelect,
  error,
  onRetry,
}: ProviderPickerProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(50).duration(300).springify().damping(15)}
      className="mt-6"
    >
      <Text className="mb-3 text-base font-semibold text-foreground">
        Network
      </Text>
      {error && (
        <View className="mb-2 flex-row items-center justify-between gap-2">
          <Text className="flex-1 text-sm text-destructive">{error}</Text>
          {onRetry && (
            <Pressable onPress={onRetry} hitSlop={8}>
              <Text className="text-sm font-medium text-primary">Retry</Text>
            </Pressable>
          )}
        </View>
      )}
      <View className="gap-2">
        {providers.map((p) => {
          const isSelected = selectedServiceID === p.serviceID;
          return (
            <Pressable
              key={p.serviceID}
              onPress={() => onSelect(p)}
              className={cn(
                "flex-row items-center gap-3 rounded-xl border p-3",
                isSelected ? "border-primary bg-primary/10" : "border-border bg-muted/30",
              )}
            >
              {p.image ? (
                <ProviderLogo imageUrl={p.image} name={p.name} />
              ) : (
                <View className="h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Ionicons name="wifi" size={22} color={colors.gray[500]} />
                </View>
              )}
              <Text
                className={cn(
                  "flex-1 text-base font-medium",
                  isSelected ? "text-primary" : "text-foreground",
                )}
              >
                {p.name}
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
