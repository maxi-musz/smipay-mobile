import { ImageSourcePropType } from "react-native";

export type OnboardingSlide = {
  id: string;
  image: ImageSourcePropType;
  title: string;
  description: string;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "welcome",
    image: require("@/assets/images/onboarding-imgs/png-512w/01-png.png"),
    title: "Your Money, Just Smarter",
    description:
      "Everything you need to spend, and stay ahead, packed into one sleek app.",
  },
  {
    id: "utilities",
    image: require("@/assets/images/onboarding-imgs/png-512w/02-png.png"),
    title: "Keep the Light & Vibes On",
    description:
      "Instant airtime, data, cable TV renewals, plus electricity tokens that arrive before you can blink.",
  },
  {
    id: "education",
    image: require("@/assets/images/onboarding-imgs/png-512w/03-png.png"),
    title: "The Way to Your Success",
    description:
      "Skip the bank queues—grab your WAEC or JAMB pins and settle school fees in a few taps.",
  },
];

export const ONBOARDING_STORAGE_KEY = "@smipay/onboarding_completed";
