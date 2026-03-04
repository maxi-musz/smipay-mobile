import { ImageSourcePropType } from "react-native";

/**
 * Maps keywords found in a transaction description to local logo assets.
 * Returns `null` when no match is found — the caller should fall back to
 * a directional arrow icon or the backend-provided `icon` URL.
 *
 * Note: SVG logos (e.g. Airtel) are excluded because React Native requires
 * react-native-svg-transformer to use them with `require()`.
 */

type LogoEntry = {
  keywords: string[];
  source: ImageSourcePropType;
};

const VTU_LOGOS: LogoEntry[] = [
  {
    keywords: ["mtn"],
    source: require("../assets/vtu-logo/mtn-logo.jpg"),
  },
  {
    keywords: ["glo"],
    source: require("../assets/vtu-logo/glo-logo.png"),
  },
  {
    keywords: ["9mobile", "etisalat"],
    source: require("../assets/vtu-logo/9mobile-logo.png"),
  },
];

const EDUCATION_LOGOS: LogoEntry[] = [
  {
    keywords: ["jamb"],
    source: require("../assets/education-logo/jamb-logo.png"),
  },
  {
    keywords: ["waec"],
    source: require("../assets/education-logo/waec-logo.webp"),
  },
];

const ELECTRICITY_LOGOS: LogoEntry[] = [
  {
    keywords: ["ikeja", "ikedc", "ie"],
    source: require("../assets/electricity-logo/ikeja-electric.jpeg"),
  },
  {
    keywords: ["eko", "ekedc"],
    source: require("../assets/electricity-logo/eko-electric.jpg"),
  },
  {
    keywords: ["ibadan", "ibedc"],
    source: require("../assets/electricity-logo/ibadan-electric.jpg"),
  },
  {
    keywords: ["abuja", "aedc"],
    source: require("../assets/electricity-logo/abuja-electric.png"),
  },
  {
    keywords: ["kaduna", "kaedco"],
    source: require("../assets/electricity-logo/kaduna-electric.jpeg"),
  },
  {
    keywords: ["jos", "jedc"],
    source: require("../assets/electricity-logo/jos-electric.jpeg"),
  },
  {
    keywords: ["kano", "kedco"],
    source: require("../assets/electricity-logo/kano-electric.png"),
  },
  {
    keywords: ["enugu", "eedc"],
    source: require("../assets/electricity-logo/Enugu-electric.png"),
  },
  {
    keywords: ["benin", "bedc"],
    source: require("../assets/electricity-logo/benin-electric.jpg"),
  },
  {
    keywords: ["yola", "yedc"],
    source: require("../assets/electricity-logo/yola-electric.jpeg"),
  },
  {
    keywords: ["port harcourt", "phedc", "ph electric"],
    source: require("../assets/electricity-logo/ph-electric.jpg"),
  },
  {
    keywords: ["aba", "abedc"],
    source: require("../assets/electricity-logo/aba-electric.png"),
  },
];

const ALL_LOGOS: LogoEntry[] = [
  ...VTU_LOGOS,
  ...EDUCATION_LOGOS,
  ...ELECTRICITY_LOGOS,
];

/**
 * Attempts to resolve a local provider logo from the transaction description.
 * Falls back to `null` if no match — caller decides what to render.
 */
export function getProviderLogo(
  description: string,
): ImageSourcePropType | null {
  const lower = description.toLowerCase();

  for (const entry of ALL_LOGOS) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.source;
    }
  }

  return null;
}
