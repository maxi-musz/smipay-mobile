import { useRef, useState } from "react";
import { Dimensions, FlatList, Image, NativeSyntheticEvent, NativeScrollEvent, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
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
      router.replace("/(auth)/sign-up");
    }
  };

  const activeSlide = ONBOARDING_SLIDES[currentIndex] ?? ONBOARDING_SLIDES[0];

  const handleSkip = () => {
    onComplete();
  };

  const handleSignIn = () => {
    onComplete();
    router.push("/(auth)/sign-in");
  };

  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <LinearGradient
        colors={["#FFE5D2", "#FFF5EC"]}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View className="flex-1 pt-2">
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

          <View className="mt-auto rounded-t-[56px] bg-white px-6 pb-10 pt-8 shadow-lg shadow-black/5">
            <View className="mb-5 flex-row justify-center gap-2">
              {ONBOARDING_SLIDES.map((_, i) => (
                <View
                  key={i}
                  className="h-1.5 rounded-full"
                  style={{
                    width: currentIndex === i ? 24 : 8,
                    backgroundColor:
                      currentIndex === i ? colors.orange[500] : "#FACCAB",
                  }}
                />
              ))}
            </View>

            <Text variant="h3" className="text-center">
              {activeSlide.title}
            </Text>

            <Text className="mt-3 text-center text-sm leading-6 text-muted-foreground">
              {activeSlide.description}
            </Text>

            <View className="mt-6 flex-row gap-3">
              <Button
                className="flex-1 rounded-full bg-orange-50"
                variant="outline"
                onPress={handleSkip}
              >
                <Text className="text-orange-500">Skip</Text>
              </Button>
              <Button
                className="flex-1 rounded-full"
                onPress={handleNext}
              >
                <Text>
                  {currentIndex === ONBOARDING_SLIDES.length - 1
                    ? "Create my account"
                    : "Next"}
                </Text>
              </Button>
            </View>

            <View className="mt-5 flex-row justify-center">
              <Text className="text-sm text-muted-foreground">
                Already have an account?{" "}
              </Text>
              <Text
                className="text-sm font-semibold text-orange-500"
                onPress={handleSignIn}
              >
                Sign in
              </Text>
            </View>

            <View className="mt-5 items-center">
              <View className="h-1 w-24 rounded-full bg-black/10" />
            </View>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

function SlideCard({ slide }: { slide: OnboardingSlide }) {
  return (
    <View
      style={{ width: SCREEN_WIDTH }}
      className="flex-1 items-center justify-center px-6"
    >
      <Image
        source={slide.image}
        style={{
          width: SCREEN_WIDTH - 48,
          height: (SCREEN_WIDTH - 48) * 1.4,
        }}
        resizeMode="contain"
      />
    </View>
  );
}
