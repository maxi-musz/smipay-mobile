import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { getCableLogo } from "../lib/cable-logos";
import { cn } from "@/lib/utils";
import type { CableServiceItem } from "@/types/vtpass-cable";

interface ProviderRowProps {
  providers: CableServiceItem[];
  selectedServiceID: string | null;
  onSelect: (p: CableServiceItem) => void;
  error?: string | null;
  onRetry?: () => void;
}

function ProviderChip({
  provider,
  isSelected,
  onPress,
}: {
  provider: CableServiceItem;
  isSelected: boolean;
  onPress: () => void;
}) {
  const displayName =
    provider.name.replace(/\s+Subscription\s*$/i, "").trim() || provider.name;
  const logo = getCableLogo(provider.serviceID);

  return (
    <Pressable onPress={onPress} className="items-center">
      <View
        className={cn(
          "h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2",
          isSelected
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30",
        )}
      >
        {logo ? (
          <Image
            source={logo}
            style={{ width: 52, height: 52 }}
            resizeMode="contain"
          />
        ) : (
          <View className="h-full w-full items-center justify-center rounded-full bg-muted">
            <Ionicons name="tv" size={24} color={colors.gray[500]} />
          </View>
        )}
      </View>
      <Text
        className={cn(
          "mt-2 text-[10px] font-medium max-w-[64px] text-center",
          isSelected ? "text-primary" : "text-muted-foreground",
        )}
        numberOfLines={2}
      >
        {displayName}
      </Text>
    </Pressable>
  );
}

export function ProviderRow({
  providers,
  selectedServiceID,
  onSelect,
  error,
  onRetry,
}: ProviderRowProps) {
  return (
    <View className="mt-6">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-bold text-foreground">
          Select provider
        </Text>
        {error && onRetry && (
          <Pressable onPress={onRetry} hitSlop={8}>
            <Text className="text-xs font-medium text-primary">Retry</Text>
          </Pressable>
        )}
      </View>
      {error && !onRetry && (
        <Text className="mb-2 text-sm text-destructive">{error}</Text>
      )}
      <View className="flex-row justify-around">
        {providers.map((p) => (
          <ProviderChip
            key={p.serviceID}
            provider={p}
            isSelected={selectedServiceID === p.serviceID}
            onPress={() => onSelect(p)}
          />
        ))}
      </View>
    </View>
  );
}
