/**
 * Nigerian mobile number prefix → network mapping for airtime.
 * Based on NCC allocation; used to suggest provider when user picks a contact.
 *
 * Note: Mobile Number Portability (MNP) means a number may have been ported
 * to another network while keeping its prefix. This is a best-effort hint only.
 */

/** 4-digit prefixes (0XXX) per operator. VTpass serviceID used as key. */
const PREFIX_BY_NETWORK: Record<string, readonly string[]> = {
  mtn: [
    "0803", "0806", "0810", "0813", "0814", "0816",
    "0703", "0704", "0706", "0707",
    "0903", "0906", "0913", "0916",
  ],
  airtel: [
    "0802", "0808", "0812",
    "0701", "0708",
    "0901", "0902", "0904", "0907", "0911", "0912",
  ],
  glo: [
    "0805", "0807", "0811", "0815",
    "0705",
    "0905", "0915",
  ],
  "9mobile": ["0809", "0817", "0818", "0908", "0909"],
  etisalat: ["0809", "0817", "0818", "0908", "0909"],
};

const PREFIX_SET = new Map<string, string>();
for (const [network, prefixes] of Object.entries(PREFIX_BY_NETWORK)) {
  for (const p of prefixes) {
    if (!PREFIX_SET.has(p)) PREFIX_SET.set(p, network);
  }
}

/**
 * Normalizes Nigerian phone to 11-digit form (0XXXXXXXXXX) and returns the
 * 4-digit prefix (e.g. "0814") for lookup.
 */
function getPrefix(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  let eleven = digits;
  if (digits.length === 11 && digits.startsWith("0")) {
    eleven = digits;
  } else if (digits.length === 10 && /^[789]/.test(digits)) {
    eleven = "0" + digits;
  } else if (digits.length >= 12 && digits.startsWith("234")) {
    eleven = "0" + digits.slice(-10);
  } else if (digits.length >= 10) {
    eleven = "0" + digits.slice(-10);
  }
  if (eleven.length !== 11 || eleven[0] !== "0") return null;
  return eleven.slice(0, 4);
}

/**
 * Returns the VTpass-style service ID for the network (mtn, airtel, glo, 9mobile)
 * inferred from the Nigerian phone number prefix, or null if unknown.
 */
export function getServiceIdFromPhone(phone: string): string | null {
  const prefix = getPrefix(phone);
  if (!prefix) return null;
  const network = PREFIX_SET.get(prefix);
  if (!network) return null;
  return network === "etisalat" ? "9mobile" : network;
}

/** Service IDs we resolve to; API may return these or variants (e.g. etisalat). */
export const DOMESTIC_SERVICE_IDS = ["mtn", "airtel", "glo", "9mobile", "etisalat"] as const;

/** Canonical network from provider serviceID (API may return "MTN Airtime", "etisalat", etc.). */
function canonicalServiceId(serviceID: string): string | null {
  const sid = serviceID.toLowerCase().trim();
  if (sid.includes("mtn")) return "mtn";
  if (sid.includes("airtel")) return "airtel";
  if (sid.includes("glo")) return "glo";
  if (sid.includes("9mobile") || sid.includes("etisalat")) return "9mobile";
  return null;
}

/**
 * Returns true if the phone number's prefix matches the selected provider's network.
 * Used to show a disclaimer when they may not match (e.g. after contact pick or manual entry).
 */
export function phoneMatchesProvider(
  phone: string,
  providerServiceID: string,
): boolean {
  const fromPhone = getServiceIdFromPhone(phone);
  const fromProvider = canonicalServiceId(providerServiceID);
  if (!fromPhone || !fromProvider) return false;
  return fromPhone === fromProvider;
}
