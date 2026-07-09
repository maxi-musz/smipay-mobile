const EMAIL_RE = /\S+@\S+\.\S+/;

/** True when the user is typing an email (letters or @), not a phone number. */
function looksLikeEmail(input: string): boolean {
  return /[a-zA-Z@]/.test(input);
}

/**
 * Clamp phone input as the user types. Accepts only digits plus a single leading
 * `+`, and enforces length by format:
 *   - local `0XXXXXXXXXX` → max 11 digits
 *   - international `+234XXXXXXXXXX` → max 14 chars (`+234` + 10 digits)
 *
 * Email input is only whitespace-stripped so letters survive before `@` is typed.
 */
export function sanitizeAuthIdentifier(input: string): string {
  if (looksLikeEmail(input)) {
    return input.replace(/\s/g, "");
  }

  let v = input.replace(/[^\d+]/g, "");
  if (v.includes("+")) v = "+" + v.replace(/\+/g, "");
  return v.startsWith("+") ? v.slice(0, 14) : v.slice(0, 11);
}

/** Final-format validation for the two accepted Nigerian phone shapes. */
export function isValidPhoneIdentifier(phone: string): boolean {
  return /^0\d{10}$/.test(phone) || /^\+234\d{10}$/.test(phone);
}

export function isValidAuthIdentifier(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (EMAIL_RE.test(trimmed)) return true;
  return isValidPhoneIdentifier(trimmed);
}

export function normalizeAuthIdentifier(value: string): string {
  const trimmed = value.trim();
  if (EMAIL_RE.test(trimmed)) return trimmed.toLowerCase();
  return trimmed;
}

export function maskAuthIdentifier(identifier: string): string {
  if (EMAIL_RE.test(identifier)) {
    const [local, domain] = identifier.split("@");
    if (!domain) return identifier;
    const visible = local.slice(0, 2);
    return `${visible}${"•".repeat(Math.max(local.length - 2, 3))}@${domain}`;
  }

  const digits = identifier.replace(/\D/g, "");
  if (digits.length <= 4) return identifier;
  const visibleStart = identifier.startsWith("+") ? identifier.slice(0, 4) : identifier.slice(0, 3);
  const visibleEnd = identifier.slice(-2);
  const hiddenLen = Math.max(identifier.length - visibleStart.length - visibleEnd.length, 3);
  return `${visibleStart}${"•".repeat(hiddenLen)}${visibleEnd}`;
}

/** Value sent as `email` in the sign-in API (email or phone). */
export function toSignInIdentifier(value: string): string {
  return normalizeAuthIdentifier(value);
}
