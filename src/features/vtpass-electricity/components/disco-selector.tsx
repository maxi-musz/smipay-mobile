import { Image, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { getElectricityLogo } from "../lib/electricity-logos";
import { getDiscoShortName } from "../lib/constants";
import { cn } from "@/lib/utils";
import type { ElectricityServiceItem } from "@/types/vtpass-electricity";

interface DiscoSelectorProps {
  providers: ElectricityServiceItem[];
  selectedServiceID: string | null;
  onSelect: (p: ElectricityServiceItem) => void;
  error?: string | null;
  onRetry?: () => void;
}

function DiscoChip({
  provider,
  isSelected,
  onPress,
}: {
  provider: ElectricityServiceItem;
  isSelected: boolean;
  onPress: () => void;
}) {
  const logo = getElectricityLogo(provider.serviceID);
  const shortName = getDiscoShortName(provider.serviceID);

  return (
    <Pressable onPress={onPress} className="items-center" style={{ width: 72 }}>
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
            resizeMode="cover"
          />
        ) : (
          <View className="h-full w-full items-center justify-center rounded-full bg-muted">
            <Ionicons name="flash" size={24} color={colors.gray[500]} />
          </View>
        )}
      </View>
      <Text
        className={cn(
          "mt-2 text-[10px] font-medium text-center",
          isSelected ? "text-primary" : "text-muted-foreground",
        )}
        numberOfLines={2}
      >
        {shortName}
      </Text>
    </Pressable>
  );
}

export function DiscoSelector({
  providers,
  selectedServiceID,
  onSelect,
  error,
  onRetry,
}: DiscoSelectorProps) {
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {providers.map((p) => (
          <DiscoChip
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
