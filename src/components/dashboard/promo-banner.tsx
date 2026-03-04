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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_H_MARGIN = 20;
const CARD_GAP = 10;
const CARD_WIDTH = SCREEN_WIDTH - CARD_H_MARGIN * 2;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

interface PromoSlide {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
  cta: string;
  gradientColors: readonly [string, string, ...string[]];
}

const PROMO_SLIDES: PromoSlide[] = [
  {
    id: "welcome-bonus",
    icon: "sparkles",
    title: "Welcome Bonus 🎉",
    description:
      "Fund your account, Make your first transaction and earn ₦100 instantly.",
    cta: "CLAIM BONUS",
    gradientColors: [colors.green[500], "#E8532E", "#D63384"],
  },
  {
    id: "refer-earn",
    icon: "people",
    title: "Refer & Earn 🎁",
    description:
      "Invite your friends to SmiPay and earn ₦50 for every successful referral.",
    cta: "INVITE FRIENDS",
    gradientColors: [colors.orange[500], "#D63384", "#7C3AED"],
  },
  {
    id: "cashback",
    icon: "cash",
    title: "Cashback Rewards 💰",
    description:
      "Get up to 9% cashback on airtime purchases and 7% on data bundles.",
    cta: "LEARN MORE",
    gradientColors: ["#2563EB", colors.green[500], "#059669"],
  },
];

export function PromoBanner() {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / SNAP_INTERVAL);
    setActiveIndex(index);
  };

  return (
    <View className="mt-5">
      <FlatList
        ref={flatListRef}
        data={PROMO_SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: CARD_H_MARGIN }}
        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
        renderItem={({ item }) => <PromoCard slide={item} />}
      />

      <View className="mt-3 flex-row items-center justify-center gap-1.5">
        {PROMO_SLIDES.map((_, i) => (
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
    </View>
  );
}

function PromoCard({ slide }: { slide: PromoSlide }) {
  return (
    <View
      className="overflow-hidden rounded-2xl"
      style={{ width: CARD_WIDTH }}
    >
      <LinearGradient
        colors={slide.gradientColors}
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
          <Ionicons name={slide.icon} size={20} color="#fff" />
        </View>

        <View className="flex-1">
          <Text className="text-[15px] font-bold text-white">
            {slide.title}
          </Text>
          <Text
            className="mt-0.5 text-[12px] leading-4 text-white/80"
            numberOfLines={2}
          >
            {slide.description}
          </Text>
          <Pressable className="mt-1.5 flex-row items-center gap-0.5">
            <Text className="text-[11px] font-bold uppercase text-white">
              {slide.cta}
            </Text>
            <Ionicons name="chevron-forward" size={11} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}
