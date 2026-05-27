import { Pressable, useWindowDimensions, View } from "react-native";
import { router, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { getAirtimeRoute, getDataRoute } from "@/lib/provider-config";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useResponsiveScale } from "@/hooks/use-responsive-scale";
import { colors } from "@/constants/colors";
import type { CashbackRate } from "@/types";

type ServiceItem = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  iconColor: string;
  bgColor: string;
  darkBgColor: string;
  cashbackService?: string;
  comingSoon?: boolean;
};

const SERVICES: ServiceItem[] = [
  {
    id: "airtime",
    icon: "call",
    label: "Airtime",
    iconColor: colors.orange[500],
    bgColor: colors.orange[100],
    darkBgColor: colors.orange[950],
    cashbackService: "airtime",
  },
  {
    id: "data",
    icon: "wifi",
    label: "Data",
    iconColor: "#6366F1",
    bgColor: "#EEF2FF",
    darkBgColor: "#1E1B4B",
    cashbackService: "data",
  },
  {
    id: "cable-tv",
    icon: "tv",
    label: "Cable TV",
    iconColor: "#EF4444",
    bgColor: "#FEF2F2",
    darkBgColor: "#450A0A",
    cashbackService: "cable",
  },
  {
    id: "education",
    icon: "school",
    label: "Education",
    iconColor: colors.green[500],
    bgColor: colors.green[100],
    darkBgColor: colors.green[950],
    cashbackService: "education",
  },
  {
    id: "electricity",
    icon: "flash",
    label: "Electricity",
    iconColor: "#EAB308",
    bgColor: "#FEFCE8",
    darkBgColor: "#422006",
    cashbackService: "electricity",
  },
  {
    id: "intl-airtime",
    icon: "globe",
    label: "Intl. Airtime",
    iconColor: "#0EA5E9",
    bgColor: "#F0F9FF",
    darkBgColor: "#082F49",
    cashbackService: "international_airtime",
  },
  {
    id: "streaming",
    icon: "repeat",
    label: "Subscriptions",
    iconColor: "#6366F1",
    bgColor: "#EEF2FF",
    darkBgColor: "#1E1B4B",
    comingSoon: true,
  },
];

interface ServicesGridProps {
  cashbackRates?: CashbackRate[];
}

const CASHBACK_LABELS: Partial<Record<string, string>> = {
  airtime: "up to 9% off",
  data: "up to 5% off",
};

/** Only airtime and data show cashback badges on the quick links. */
function getCashbackLabel(
  service: ServiceItem,
  rates?: CashbackRate[],
): string | null {
  if (service.id !== "airtime" && service.id !== "data") return null;
  if (!rates || !service.cashbackService) return null;

  const rate = rates.find((r) => r.service === service.cashbackService);
  if (!rate || !rate.is_active || rate.percentage <= 0) return null;

  const fixedLabel = CASHBACK_LABELS[service.cashbackService];
  if (fixedLabel) return fixedLabel;
  return `${rate.percentage}% cashback`;
}

export function ServicesGrid({ cashbackRates }: ServicesGridProps) {
  const { isDark } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { s } = useResponsiveScale();

  const horizontalMargin = s(12);
  const cardPadding = s(12);
  const colGap = s(10);
  const rowGap = s(26);
  const contentWidth =
    screenWidth - horizontalMargin * 2 - cardPadding * 2;
  const itemWidth = (contentWidth - colGap * 3) / 4;

  return (
    <View
      className="rounded-2xl mx-3"
      style={{
        backgroundColor: isDark ? "#1E293B" : "#F5F6F8",
        marginTop: s(24),
        marginHorizontal: horizontalMargin,
        paddingHorizontal: cardPadding,
        paddingTop: s(20),
        paddingBottom: s(16),
      }}
    >
      <View
        className="flex-row flex-wrap"
        style={{ rowGap, columnGap: colGap }}
      >
        {SERVICES.map((service) => (
          <ServiceIcon
            key={service.id}
            service={service}
            isDark={isDark}
            itemWidth={itemWidth}
            cashbackLabel={getCashbackLabel(service, cashbackRates)}
            scale={s}
            onPress={
              service.id === "airtime" && !service.comingSoon
                ? () => router.push(getAirtimeRoute() as Href)
                : service.id === "intl-airtime" && !service.comingSoon
                  ? () => router.push("/(app)/vtpass/intl-airtime" as Href)
                  : service.id === "data" && !service.comingSoon
                    ? () => router.push(getDataRoute() as Href)
                    : service.id === "cable-tv" && !service.comingSoon
                      ? () => router.push("/(app)/vtpass/cable" as Href)
                      : service.id === "education" && !service.comingSoon
                        ? () => router.push("/(app)/vtpass/education" as Href)
                        : service.id === "electricity" && !service.comingSoon
                          ? () => router.push("/(app)/vtpass/electricity" as Href)
                          : undefined
            }
          />
        ))}
      </View>
    </View>
  );
}

function ServiceIcon({
  service,
  isDark,
  itemWidth,
  cashbackLabel,
  onPress,
  scale,
}: {
  service: ServiceItem;
  isDark: boolean;
  itemWidth: number;
  cashbackLabel: string | null;
  onPress?: () => void;
  scale: (n: number) => number;
}) {
  const bg = isDark ? service.darkBgColor : service.bgColor;
  const s = scale;
  const iconSize = s(22);
  const circleSize = s(52);

  return (
    <Pressable
      className="items-center"
      style={{ width: itemWidth }}
      disabled={service.comingSoon}
      onPress={onPress}
    >
      <View className="relative">
        {cashbackLabel && (
          <View
            className="absolute left-1/2 z-10 -translate-x-1/2 rounded-full"
            style={{
              top: -s(4),
              paddingHorizontal: s(4),
              paddingVertical: s(2),
              backgroundColor: colors.green[500],
            }}
          >
            <Text
              className="font-semibold text-white"
              style={{ fontSize: s(8) }}
              numberOfLines={1}
            >
              {cashbackLabel}
            </Text>
          </View>
        )}

        {service.comingSoon && (
          <View
            className="absolute z-10 rounded-full bg-destructive"
            style={{
              right: -s(2),
              top: -s(2),
              paddingHorizontal: s(4),
              paddingVertical: s(2),
            }}
          >
            <Text
              className="font-bold uppercase text-white"
              style={{ fontSize: s(8) }}
            >
              Soon
            </Text>
          </View>
        )}

        <View
          className="items-center justify-center rounded-full"
          style={{
            width: circleSize,
            height: circleSize,
            backgroundColor: bg,
          }}
        >
          <Ionicons
            name={service.icon}
            size={iconSize}
            color={service.iconColor}
          />
        </View>
      </View>

      <Text
        className="text-center text-foreground"
        numberOfLines={1}
        style={[
          { marginTop: s(6), fontSize: s(12) },
          service.comingSoon ? { opacity: 0.5 } : undefined,
        ]}
      >
        {service.label}
      </Text>
    </Pressable>
  );
}
