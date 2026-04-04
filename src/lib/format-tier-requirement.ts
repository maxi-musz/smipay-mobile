/** Maps common API requirement keys to readable labels. */
const KNOWN: Record<string, string> = {
  email_verification: "Email verification",
  phone_verification: "Phone verification",
  kyc_verification: "KYC verification",
  bvn_verification: "BVN verification",
  id_verification: "ID verification",
  nin_verification: "NIN verification",
  address_verification: "Address verification",
};

/**
 * Turns tier requirement strings from the API (e.g. `email_verification`) into
 * short, readable labels for UI.
 */
export function formatTierRequirement(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return raw;

  const lower = trimmed.toLowerCase();
  if (KNOWN[lower]) return KNOWN[lower];

  return trimmed
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
