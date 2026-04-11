/**
 * Bump `OTA_DEBUG_BUILD_MARKER` after each OTA publish to confirm the new JS bundle is live.
 * The marker is shown only on Profile when the signed-in user matches `OTA_DEBUG_EMAIL`.
 */
export const OTA_DEBUG_EMAIL = "bernardmayowaa@gmail.com";

/** Change this string whenever you ship an update you want to verify (e.g. "5", "6", …). */
export const OTA_DEBUG_BUILD_MARKER = "3";

export function isOtaDebugUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === OTA_DEBUG_EMAIL.trim().toLowerCase();
}
