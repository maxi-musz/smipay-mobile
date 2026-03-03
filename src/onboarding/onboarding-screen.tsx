import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";

import { ONBOARDING_SLIDES, type OnboardingSlide } from "./constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950" edges={["top", "bottom"]}>
      <View className="flex-1">
        {/* Header: Logo + Skip */}
        <View className="flex-row items-center justify-between px-6 pt-2">
          <Image
            source={require("@/assets/images/smipay-logo.png")}
            style={{ width: 100, height: 32 }}
            resizeMode="contain"
          />
          <Pressable
            onPress={handleSkip}
            hitSlop={12}
            className="rounded-lg px-3 py-2 active:bg-gray-100 dark:active:bg-gray-800"
          >
            <Text className="text-base font-semibold text-gray-500 dark:text-gray-400">
              Skip
            </Text>
          </Pressable>
        </View>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={ONBOARDING_SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          renderItem={({ item }) => <SlideCard slide={item} />}
        />

        {/* Footer: Dots + CTA */}
        <View className="px-6 pb-10">
          <View className="mb-8 flex-row justify-center gap-2">
            {ONBOARDING_SLIDES.map((_, i) => (
              <View
                key={i}
                className="h-2 rounded-full"
                style={{
                  width: currentIndex === i ? 24 : 8,
                  backgroundColor:
                    currentIndex === i
                      ? colors.orange[500]
                      : colors.gray[300],
                }}
              />
            ))}
          </View>

          <Pressable
            onPress={handleNext}
            className="rounded-2xl py-4 active:opacity-90"
            style={{ backgroundColor: colors.orange[500] }}
          >
            <Text className="text-center text-base font-bold text-white">
              {currentIndex === ONBOARDING_SLIDES.length - 1
                ? "Get Started"
                : "Next"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function SlideCard({ slide }: { slide: OnboardingSlide }) {
  const { isDark } = useAppTheme();
  const iconBg = isDark ? colors.orange[950] : colors.orange[100];
  const serviceIconBg = isDark ? colors.green[950] : colors.green[100];

  return (
    <View
      style={{ width: SCREEN_WIDTH }}
      className="flex-1 items-center justify-center px-12"
    >
      {slide.image ? (
        <Image
          source={slide.image}
          className="mb-10 h-32 w-32 rounded-3xl"
          resizeMode="contain"
        />
      ) : (
        <View
          className="mb-10 h-32 w-32 items-center justify-center rounded-3xl"
          style={{ backgroundColor: iconBg }}
        >
          <Ionicons
            name={slide.icon as keyof typeof Ionicons.glyphMap}
            size={64}
            color={colors.orange[500]}
          />
        </View>
      )}

      <Text className="text-center text-2xl font-bold text-gray-900 dark:text-gray-50">
        {slide.title}
      </Text>

      <Text className="mt-5 text-center text-base leading-7 text-gray-600 dark:text-gray-400">
        {slide.description}
      </Text>

      {slide.serviceIcons && slide.serviceIcons.length > 0 && (
        <View className="mt-8 flex-row gap-4">
          {slide.serviceIcons.map((name, i) => (
            <View
              key={i}
              className="h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: serviceIconBg }}
            >
              <Ionicons
                name={name as keyof typeof Ionicons.glyphMap}
                size={28}
                color={colors.green[500]}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
