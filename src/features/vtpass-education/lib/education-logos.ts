import type { ImageSourcePropType } from "react-native";

const WAEC_LOGO = require("@/assets/images/education-logo/waec-logo.jpg");

const EDUCATION_LOGO_MAP: Record<string, ImageSourcePropType> = {
  "waec-registration": WAEC_LOGO,
  waec: WAEC_LOGO,
  jamb: require("@/assets/images/education-logo/jamb-logo.png"),
};

export function getEducationLogo(
  serviceID: string,
): ImageSourcePropType | null {
  return EDUCATION_LOGO_MAP[serviceID.toLowerCase().trim()] ?? null;
}
