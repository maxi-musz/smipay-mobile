import type { ImageSourcePropType } from "react-native";

type LogoEntry = {
  keywords: string[];
  source: ImageSourcePropType;
};

const BANK_LOGOS: LogoEntry[] = [
  {
    keywords: ["wema"],
    source: require("@/assets/images/bank-logos/wema-logo.jpg"),
  },
];

/**
 * Resolves a local bank logo from `bank_name`. Case-insensitive substring match
 * on keywords. Returns null when no match — caller should use a generic icon.
 */
export function getBankLogo(bankName: string): ImageSourcePropType | null {
  const lower = (bankName ?? "").toLowerCase();

  for (const entry of BANK_LOGOS) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.source;
    }
  }

  return null;
}
