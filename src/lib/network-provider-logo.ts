import type { ImageSourcePropType } from "react-native";

/**
 * Maps VTpass/API service IDs to local network provider logos.
 * Uses assets from assets/images/network-provider-logo/ — no reliance on
 * provider-returned image URLs (which often fail or aren't returned).
 *
 * Required files in assets/images/network-provider-logo/:
 * - mtn-logo.png
 * - glo-logo.png
 * - airtel-logo.png
 * - 9mobile-logo.png
 */

const NETWORK_LOGO_MAP: Record<string, ImageSourcePropType> = {
  mtn: require("@/assets/images/network-provider-logo/MTN-icon.jpg"),
  glo: require("@/assets/images/network-provider-logo/glo-logo.png"),
  airtel: require("@/assets/images/network-provider-logo/airtel-icon.jpg"),
  etisalat: require("@/assets/images/network-provider-logo/9mobile-logo.png"),
  "9mobile": require("@/assets/images/network-provider-logo/9mobile-logo.png"),
};

/**
 * Returns the local logo for a network provider by service ID.
 * Returns null if no matching logo exists.
 */
export function getNetworkProviderLogo(
  serviceID: string,
): ImageSourcePropType | null {
  const key = serviceID.toLowerCase().trim();
  return NETWORK_LOGO_MAP[key] ?? null;
}
