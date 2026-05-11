import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

const DEFAULT_PROMPT = "Authenticate to continue";

export type BiometricsAvailability = {
  available: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  biometricType: "face" | "fingerprint" | "iris" | null;
};

let cached: BiometricsAvailability | null = null;

/**
 * Check if biometrics is available (hardware present and user has enrolled).
 * Result is cached for the session to avoid repeated native calls.
 */
export async function getBiometricsAvailability(): Promise<BiometricsAvailability> {
  if (cached !== null) return cached;
  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const hasFace = types?.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    );
    const hasFingerprint = types?.includes(
      LocalAuthentication.AuthenticationType.FINGERPRINT,
    );
    const hasIris = types?.includes(LocalAuthentication.AuthenticationType.IRIS);

    // Android often reports both face + fingerprint even when only fingerprint is used;
    // prefer fingerprint there. iOS: face (Face ID) before fingerprint (Touch ID).
    let biometricType: BiometricsAvailability["biometricType"] = null;
    if (Platform.OS === "android") {
      if (hasFingerprint) biometricType = "fingerprint";
      else if (hasFace) biometricType = "face";
      else if (hasIris) biometricType = "iris";
    } else {
      if (hasFace) biometricType = "face";
      else if (hasFingerprint) biometricType = "fingerprint";
      else if (hasIris) biometricType = "iris";
    }
    cached = {
      available: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      biometricType,
    };
    return cached;
  } catch {
    cached = {
      available: false,
      hasHardware: false,
      isEnrolled: false,
      biometricType: null,
    };
    return cached;
  }
}

/**
 * Clear cached availability (e.g. after user may have changed device settings).
 */
export function clearBiometricsCache(): void {
  cached = null;
}

/**
 * Runs LocalAuthentication with optional policy.
 *
 * **Device passcode vs app PIN:** By default Expo uses a policy where, after biometric
 * failure/cancel flows, iOS/Android may prompt for the **device** unlock PIN/password — that only
 * proves device access, not your SmiPay transaction PIN. For checkout, pass
 * `{ disableDeviceFallback: true }` so failures yield your in-app transaction PIN sheet instead.
 */
export async function authenticate(
  options: {
    promptMessage?: string;
    /**
     * `true` = biometrics only (LAPolicy biometric-only on iOS); OS will not accept device passcode as success.
     * `false` (default) = OS may fall back to device PIN — appropriate for optional flows like enabling biometrics after sign-in.
     */
    disableDeviceFallback?: boolean;
  } = {},
): Promise<{ success: boolean; error?: string }> {
  try {
    const disableDeviceFallback = options.disableDeviceFallback ?? false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options.promptMessage ?? DEFAULT_PROMPT,
      disableDeviceFallback,
      // iOS: hide "Enter Passcode" / use-password path when biometric-only policy is enforced
      ...(Platform.OS === "ios" && disableDeviceFallback ? { fallbackLabel: "" } : {}),
    });
    return {
      success: result.success,
      error: !result.success && "error" in result ? String(result.error) : undefined,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Authentication failed",
    };
  }
}

/**
 * User-facing label for the biometric type (platform-specific; Face ID is iOS-only branding).
 */
export function getBiometricLabel(availability: BiometricsAvailability): string {
  if (!availability.available) return "Biometrics";
  const isIos = Platform.OS === "ios";
  switch (availability.biometricType) {
    case "face":
      return isIos ? "Face ID" : "Face unlock";
    case "fingerprint":
      return isIos ? "Touch ID" : "Fingerprint";
    case "iris":
      return "Iris";
    default:
      return "Biometrics";
  }
}
