import type { ImageSourcePropType } from "react-native";

const LOGO_MAP: Record<string, ImageSourcePropType> = {
  "ikeja-electric": require("@/assets/images/electricity-logo/ikeja-electric.jpeg"),
  "eko-electric": require("@/assets/images/electricity-logo/eko-electric.jpg"),
  "kano-electric": require("@/assets/images/electricity-logo/kano-electric.png"),
  "portharcourt-electric": require("@/assets/images/electricity-logo/ph-electric.jpg"),
  "jos-electric": require("@/assets/images/electricity-logo/jos-electric.jpeg"),
  "ibadan-electric": require("@/assets/images/electricity-logo/ibadan-electric.jpg"),
  "kaduna-electric": require("@/assets/images/electricity-logo/kaduna-electric.jpeg"),
  "abuja-electric": require("@/assets/images/electricity-logo/abuja-electric.png"),
  "enugu-electric": require("@/assets/images/electricity-logo/Enugu-electric.png"),
  "benin-electric": require("@/assets/images/electricity-logo/benin-electric.jpg"),
  "aba-electric": require("@/assets/images/electricity-logo/aba-electric.png"),
  "yola-electric": require("@/assets/images/electricity-logo/yola-electric.jpeg"),
};

export function getElectricityLogo(serviceID: string): ImageSourcePropType | null {
  return LOGO_MAP[serviceID.toLowerCase().trim()] ?? null;
}
