/**
 * URL Paystack redirects to after payment completes or is cancelled.
 *
 * This must be a clean custom-scheme URL that Paystack can redirect to.
 * Don't use Linking.createURL here — in Expo Go it produces an
 * exp://IP:PORT/--/... URL that Paystack can't handle.
 *
 * openAuthSessionAsync extracts the scheme ("smipay") and detects
 * the redirect in both Expo Go and production builds.
 */
export const PAYSTACK_FUNDING_CALLBACK_URL = "smipay://wallet/funding/callback";
