import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { getNetworkProviderLogo } from "@/lib/network-provider-logo";
import {
  type DataRecentEntry,
  getRecentDataEntryDisplay,
} from "../lib/data-recent-storage";

function formatDisplayPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function NetworkLogo({ serviceID, size }: { serviceID: string; size: number }) {
  const source = getNetworkProviderLogo(serviceID);
  if (!source) {
    return (
      <View
        className="items-center justify-center rounded-lg bg-muted"
        style={{ width: size, height: size }}
      >
        <Ionicons name="cellular" size={size * 0.55} color={colors.gray[500]} />
      </View>
    );
  }
  return (
    <Image
      source={source}
      style={{ width: size, height: size, borderRadius: 8 }}
      resizeMode="contain"
    />
  );
}

export interface RecentDataListProps {
  entries: DataRecentEntry[];
  /** Only show entries for this provider; if null, show all with label. */
  currentServiceID: string | null;
  onSelect: (entry: DataRecentEntry) => void;
  /** Provider display names for labels when showing all (e.g. from store). */
  getProviderName?: (serviceID: string) => string;
}

export function RecentDataList({
  entries,
  currentServiceID,
  onSelect,
  getProviderName,
}: RecentDataListProps) {
  const filtered =
    currentServiceID != null
      ? entries.filter((e) => e.serviceID.toLowerCase() === currentServiceID.toLowerCase())
      : entries;

  if (filtered.length === 0) return null;

  return (
    <View className="mt-6">
      <Text className="mb-3 text-sm font-semibold text-muted-foreground">
        Recent
      </Text>
      <View className="gap-2">
        {filtered.map((entry) => {
          const label =
            getProviderName?.(entry.serviceID) ??
            entry.serviceID.replace(/\s*data\s*/i, "").trim() ??
            "Data";
          return (
            <Pressable
              key={`${entry.serviceID}-${entry.phone}`}
              onPress={() => onSelect(entry)}
              className="flex-row items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 active:bg-muted"
            >
              <NetworkLogo serviceID={entry.serviceID} size={32} />
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">
                  {formatDisplayPhone(getRecentDataEntryDisplay(entry))}
                </Text>
                <Text className="text-xs text-muted-foreground">{label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gray[400]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
