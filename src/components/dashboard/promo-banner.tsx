import { useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { useResponsiveScale } from "@/hooks/use-responsive-scale";
import type { RewardBanner } from "@/types";

type BannerConfig = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  cta: string;
  gradientColors: readonly [string, string, ...string[]];
};

const BANNER_CONFIG: Record<RewardBanner["type"], BannerConfig> = {
  referral: {
    icon: "people",
    cta: "INVITE FRIENDS",
    gradientColors: [colors.orange[500], "#D63384", "#7C3AED"],
  },
  cashback: {
    icon: "cash",
    cta: "LEARN MORE",
    gradientColors: ["#2563EB", colors.green[500], "#059669"],
  },
  first_transaction: {
    icon: "sparkles",
    cta: "CLAIM BONUS",
    gradientColors: [colors.green[500], "#E8532E", "#D63384"],
  },
};

interface PromoBannerProps {
  banners: RewardBanner[];
}

export function PromoBanner({ banners }: PromoBannerProps) {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { width } = useWindowDimensions();
  const { s } = useResponsiveScale();

  if (banners.length === 0) return null;

  const cardHMargin = s(12);
  const cardGap = s(10);
  const cardWidth = width - cardHMargin * 2;
  const snapInterval = cardWidth + cardGap;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / snapInterval);
    setActiveIndex(index);
  };

  return (
    <View style={{ marginTop: s(8) }}>
      <FlatList
        ref={flatListRef}
        data={banners}
        keyExtractor={(_, i) => String(i)}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: cardHMargin }}
        ItemSeparatorComponent={() => <View style={{ width: cardGap }} />}
        renderItem={({ item }) => (
          <PromoCard banner={item} cardWidth={cardWidth} />
        )}
      />

      {banners.length > 1 && (
        <View
          className="flex-row items-center justify-center"
          style={{ marginTop: s(12), gap: s(6) }}
        >
          {banners.map((_, i) => (
            <View
              key={i}
              className="rounded-full"
              style={{
                width: activeIndex === i ? s(20) : s(6),
                height: s(6),
                backgroundColor:
                  activeIndex === i ? colors.orange[500] : colors.gray[300],
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function PromoCard({
  banner,
  cardWidth,
}: {
  banner: RewardBanner;
  cardWidth: number;
}) {
  const config = BANNER_CONFIG[banner.type];
  const { s } = useResponsiveScale();

  return (
    <View
      className="overflow-hidden rounded-2xl"
      style={{ width: cardWidth }}
    >
      <LinearGradient
        colors={config.gradientColors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: s(14),
          paddingVertical: s(10),
        }}
      >
        <View
          className="items-center justify-center rounded-lg bg-white/20"
          style={{
            width: s(36),
            height: s(36),
            marginRight: s(10),
          }}
        >
          <Ionicons name={config.icon} size={s(18)} color="#fff" />
        </View>

        <View className="flex-1">
          <Text
            className="font-semibold text-white"
            style={{ fontSize: s(14) }}
          >
            {banner.title}
          </Text>
          <Text
            className="text-white/80"
            style={{ marginTop: s(2), fontSize: s(11), lineHeight: s(15) }}
            numberOfLines={2}
          >
            {banner.message}
          </Text>
          <Pressable
            className="flex-row items-center gap-0.5"
            style={{ marginTop: s(4) }}
          >
            <Text
              className="font-semibold uppercase text-white"
              style={{ fontSize: s(10) }}
            >
              {config.cta}
            </Text>
            <Ionicons name="chevron-forward" size={s(10)} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}
