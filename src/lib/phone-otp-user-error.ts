/** Messages safe to show on the phone verification screen (cooldown/rate limit). */
const USER_SAFE_REQUEST_PATTERNS = [
  /^please wait \d+:\d{2} before requesting/i,
  /^please wait \d+s before requesting/i,
  /^please wait \d+ second/i,
  /^you('ve| have) reached today'?s limit for verification codes/i,
  /^you('ve| have) reached the daily limit/i,
];

export const PHONE_OTP_SEND_FAILED_MESSAGE =
  "We couldn't send a verification code right now. Please try again shortly.";

export function isUserSafePhoneOtpRequestMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;
  return USER_SAFE_REQUEST_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Returns a user-safe OTP request error. Provider/HTTP diagnostics are hidden.
 */
export function toUserFacingPhoneOtpRequestError(
  err: unknown,
  fallback = PHONE_OTP_SEND_FAILED_MESSAGE,
): string {
  if (err instanceof Object && "data" in err) {
    const data = (err as { data?: { message?: string } }).data;
    const message = data?.message?.trim();
    if (message && isUserSafePhoneOtpRequestMessage(message)) {
      return message;
    }
  }

  if (err instanceof Error) {
    const message = err.message.trim();
    if (isUserSafePhoneOtpRequestMessage(message)) {
      return message;
    }
  }

  return fallback;
}
