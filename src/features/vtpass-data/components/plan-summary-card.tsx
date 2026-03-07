import { Image, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { getNetworkProviderLogo } from "@/lib/network-provider-logo";
import { formatNaira } from "../lib/constants";
import type { DataServiceItem, DataVariation } from "@/types/vtpass-data";

interface PlanSummaryCardProps {
  provider: DataServiceItem;
  variation: DataVariation;
}

const ACCENT_WIDTH = 4;

export function PlanSummaryCard({ provider, variation }: PlanSummaryCardProps) {
  const amount = variation?.variation_amount
    ? parseFloat(String(variation.variation_amount))
    : 0;
  const source = getNetworkProviderLogo(provider.serviceID);
  const productLabel = variation.name || "Data plan";
  const networkLabel = provider.name?.replace(/\s*data\s*/i, "").trim() || provider.serviceID;

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-card flex-row">
      <View
        style={{
          width: ACCENT_WIDTH,
          backgroundColor: colors.orange[500],
        }}
      />
      <View className="flex-1 flex-row items-center gap-4 px-4 py-4">
        {source ? (
          <Image
            source={source}
            style={{ width: 44, height: 44, borderRadius: 10 }}
            resizeMode="contain"
          />
        ) : (
          <View className="h-11 w-11 items-center justify-center rounded-lg bg-muted">
            <Ionicons name="cellular" size={24} color={colors.gray[500]} />
          </View>
        )}
        <View className="flex-1 min-w-0">
          <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {networkLabel}
          </Text>
          <Text
            className="mt-1 text-[15px] font-semibold text-foreground leading-tight"
            numberOfLines={2}
          >
            {productLabel}
          </Text>
          {amount > 0 && (
            <Text
              className="mt-2 text-lg font-bold"
              style={{ color: colors.orange[600] }}
            >
              {formatNaira(amount)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
