import { Image, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { getNetworkProviderLogo } from "@/lib/network-provider-logo";
import { cn } from "@/lib/utils";
import type { DataServiceItem } from "@/types/vtpass-data";

interface ProviderRowProps {
  providers: DataServiceItem[];
  selectedServiceID: string | null;
  onSelect: (p: DataServiceItem) => void;
  error?: string | null;
  onRetry?: () => void;
}

function ProviderChip({
  provider,
  isSelected,
  onPress,
}: {
  provider: DataServiceItem;
  isSelected: boolean;
  onPress: () => void;
}) {
  const displayName =
    provider.name.replace(/\s+Data\s*$/i, "").trim() || provider.name;

  const localLogo = getNetworkProviderLogo(provider.serviceID);
  const remoteUri = provider.image?.trim() || null;

  return (
    <Pressable
      onPress={onPress}
      className="mr-4 items-center"
    >
      <View
        className={cn(
          "h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2",
          isSelected ? "border-primary bg-primary/5" : "border-border bg-muted/30",
        )}
      >
        {localLogo ? (
          <Image
            source={localLogo}
            style={{ width: 52, height: 52 }}
            resizeMode="contain"
          />
        ) : remoteUri ? (
          <Image
            source={{ uri: remoteUri }}
            style={{ width: 52, height: 52 }}
            resizeMode="contain"
          />
        ) : (
          <View className="h-full w-full items-center justify-center rounded-full bg-muted">
            <Ionicons name="wifi" size={24} color={colors.gray[500]} />
          </View>
        )}
      </View>
      <Text
        className={cn(
          "mt-2 text-[10px] font-medium max-w-[56px] text-center",
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
          Select network
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {providers.map((p) => (
          <ProviderChip
            key={p.serviceID}
            provider={p}
            isSelected={selectedServiceID === p.serviceID}
            onPress={() => onSelect(p)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
