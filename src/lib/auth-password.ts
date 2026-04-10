/** Matches backend `new-auth`: password is exactly 6 digits (0–9). */
export const AUTH_PASSWORD_DIGITS = 6;

/** Email verification & password-reset codes from the API */
export const AUTH_OTP_DIGITS = 6;

export function isAuthPasswordValid(password: string): boolean {
  return new RegExp(`^\\d{${AUTH_PASSWORD_DIGITS}}$`).test(password);
}
