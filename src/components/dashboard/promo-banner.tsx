import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import type { RewardBanner } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_H_MARGIN = 20;
const CARD_GAP = 10;
const CARD_WIDTH = SCREEN_WIDTH - CARD_H_MARGIN * 2;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

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

  if (banners.length === 0) return null;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / SNAP_INTERVAL);
    setActiveIndex(index);
  };

  return (
    <View className="mt-5">
      <FlatList
        ref={flatListRef}
        data={banners}
        keyExtractor={(_, i) => String(i)}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: CARD_H_MARGIN }}
        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
        renderItem={({ item }) => <PromoCard banner={item} />}
      />

      {banners.length > 1 && (
        <View className="mt-3 flex-row items-center justify-center gap-1.5">
          {banners.map((_, i) => (
            <View
              key={i}
              className="rounded-full"
              style={{
                width: activeIndex === i ? 20 : 6,
                height: 6,
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

function PromoCard({ banner }: { banner: RewardBanner }) {
  const config = BANNER_CONFIG[banner.type];

  return (
    <View
      className="overflow-hidden rounded-2xl"
      style={{ width: CARD_WIDTH }}
    >
      <LinearGradient
        colors={config.gradientColors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-white/20">
          <Ionicons name={config.icon} size={20} color="#fff" />
        </View>

        <View className="flex-1">
          <Text className="text-[15px] font-bold text-white">
            {banner.title}
          </Text>
          <Text
            className="mt-0.5 text-[12px] leading-4 text-white/80"
            numberOfLines={2}
          >
            {banner.message}
          </Text>
          <Pressable className="mt-1.5 flex-row items-center gap-0.5">
            <Text className="text-[11px] font-bold uppercase text-white">
              {config.cta}
            </Text>
            <Ionicons name="chevron-forward" size={11} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}
