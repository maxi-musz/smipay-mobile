import type { ImageSourcePropType } from "react-native";

const CABLE_LOGO_MAP: Record<string, ImageSourcePropType> = {
  dstv: require("@/assets/images/cable-tv-logo/dstv-logo.png"),
  gotv: require("@/assets/images/cable-tv-logo/gotv-logo-png_seeklogo-496045.png"),
  startimes: require("@/assets/images/cable-tv-logo/startimes-logo.png"),
  showmax: require("@/assets/images/cable-tv-logo/showmax.jpeg"),
};

export function getCableLogo(serviceID: string): ImageSourcePropType | null {
  return CABLE_LOGO_MAP[serviceID.toLowerCase().trim()] ?? null;
}
