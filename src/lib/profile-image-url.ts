/**
 * Normalizes API `profile_image` (string URL or Cloudinary-style `{ secure_url }`) to a single
 * https URL, or null if missing / invalid.
 */
export function resolveProfileImageUrl(raw: unknown): string | null {
  if (raw == null) return null;

  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    if (t.startsWith("http://") || t.startsWith("https://")) return t;
    return null;
  }

  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const secure = o.secure_url ?? o.secureUrl;
    if (typeof secure === "string") {
      const t = secure.trim();
      if (t.startsWith("http://") || t.startsWith("https://")) return t;
    }
    const url = o.url;
    if (typeof url === "string") {
      const t = url.trim();
      if (t.startsWith("http://") || t.startsWith("https://")) return t;
    }
  }

  return null;
}

/** True if `raw` resolves to a loadable remote image URL. */
export function isValidProfileImageUrl(raw: unknown): boolean {
  return resolveProfileImageUrl(raw) !== null;
}
