import { ImageSourcePropType } from "react-native";

export type OnboardingSlide = {
  id: string;
  icon?: string;
  image?: ImageSourcePropType;
  title: string;
  description: string;
  serviceIcons?: string[];
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "welcome",
    image: require("@/assets/images/icon.png"),
    title: "Welcome to SmiPay",
    description:
      "Thank you for your interest in SmiPay. We're excited to have you join us. Pay with a smile — it's that simple.",
  },
  {
    id: "utilities",
    icon: "flash",
    title: "Utility Services",
    description:
      "Airtime, data bundles, electricity bills, and cable TV subscriptions — all in one place. Pay instantly and recharge anytime.",
    serviceIcons: ["call", "cellular", "flash", "tv"],
  },
  {
    id: "education",
    icon: "school",
    title: "Education Payments",
    description:
      "JAMB, WAEC, NECO, and other exam fees. Secure, fast, and hassle-free. Your payments, our priority.",
    serviceIcons: ["document-text", "school", "library"],
  },
];

export const ONBOARDING_STORAGE_KEY = "@smipay/onboarding_completed";
