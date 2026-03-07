import type { ImageSourcePropType } from "react-native";

/**
 * Maps VTpass/API service IDs to local network provider logos.
 * Uses assets from assets/images/network-provider-logo/ — no reliance on
 * provider-returned image URLs (which often fail or aren't returned).
 *
 * Required files in assets/images/network-provider-logo/:
 * - MTN-icon.jpg, glo-logo.png, airtel-icon.jpg, 9mobile-logo.png
 * - spectranet.jpeg (data provider)
 * Glo SME uses the same logo as Glo.
 */

const GLO_LOGO = require("@/assets/images/network-provider-logo/glo-logo.png");
const SPECTRANET_LOGO = require("@/assets/images/network-provider-logo/spectranet.jpeg");

const NETWORK_LOGO_MAP: Record<string, ImageSourcePropType> = {
  mtn: require("@/assets/images/network-provider-logo/MTN-icon.jpg"),
  glo: GLO_LOGO,
  "glo sme": GLO_LOGO,
  "glo-sme": GLO_LOGO,
  "glo data (sme)": GLO_LOGO,
  glosme: GLO_LOGO,
  airtel: require("@/assets/images/network-provider-logo/airtel-icon.jpg"),
  etisalat: require("@/assets/images/network-provider-logo/9mobile-logo.png"),
  "9mobile": require("@/assets/images/network-provider-logo/9mobile-logo.png"),
  spectranet: SPECTRANET_LOGO,
  "spectranet internet": SPECTRANET_LOGO,
};

/**
 * Returns the local logo for a network provider by service ID.
 * Returns null if no matching logo exists.
 * Supports variants like "mtn-data", "MTN Airtime" by trying the first word or segment.
 */
export function getNetworkProviderLogo(
  serviceID: string,
): ImageSourcePropType | null {
  const key = serviceID.toLowerCase().trim();
  if (NETWORK_LOGO_MAP[key]) return NETWORK_LOGO_MAP[key];
  const segment = key.split(/[\s\-()]+/)[0];
  return NETWORK_LOGO_MAP[segment as keyof typeof NETWORK_LOGO_MAP] || null;
}
