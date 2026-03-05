import * as LocalAuthentication from "expo-local-authentication";

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
    const biometricType =
      types?.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ? "face"
      : types?.includes(LocalAuthentication.AuthenticationType.FINGERPRINT) ? "fingerprint"
      : types?.includes(LocalAuthentication.AuthenticationType.IRIS) ? "iris"
      : null;
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
 * Run biometric authentication. Resolves to true if user authenticated successfully.
 */
export async function authenticate(
  options: { promptMessage?: string } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options.promptMessage ?? DEFAULT_PROMPT,
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
 * User-facing label for the biometric type (Face ID, Touch ID, or fingerprint).
 */
export function getBiometricLabel(availability: BiometricsAvailability): string {
  if (!availability.available) return "Biometrics";
  switch (availability.biometricType) {
    case "face":
      return "Face ID";
    case "fingerprint":
      return "Touch ID / Fingerprint";
    case "iris":
      return "Iris";
    default:
      return "Biometrics";
  }
}
