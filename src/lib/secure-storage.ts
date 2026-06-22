import Constants, { ExecutionEnvironment } from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY_PREFIX = "smipay";

/**
 * In Expo Go on iOS, the host app's Info.plist does not include our NSFaceIDUsageDescription,
 * so SecureStore's requireAuthentication option throws. On Android it works in Expo Go.
 */
export function canUseRequireAuthentication(): boolean {
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (isExpoGo && Platform.OS === "ios") return false;
  return true;
}

function prefixed(key: string) {
  return `${KEY_PREFIX}.${key}`;
}

export type SecureStorageOptions = {
  requireAuthentication?: boolean;
  authenticationPrompt?: string;
};

/**
 * Thin wrapper around expo-secure-store with consistent key prefixing
 * and JSON serialization. Use for sensitive data only (tokens, PINs, etc.).
 *
 * Non-sensitive data should use AsyncStorage via the zustand persist middleware.
 * Pass options.requireAuthentication: true (e.g. on iOS) to gate access behind biometrics.
 */
export const secureStorage = {
  async get<T = string>(key: string, options?: SecureStorageOptions): Promise<T | null> {
    const raw = await SecureStore.getItemAsync(prefixed(key), options ?? undefined);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  },

  async set(key: string, value: unknown, options?: SecureStorageOptions): Promise<void> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    await SecureStore.setItemAsync(prefixed(key), serialized, options ?? undefined);
  },

  async remove(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(prefixed(key));
  },

  async clear(keys: string[]): Promise<void> {
    await Promise.all(keys.map((k) => SecureStore.deleteItemAsync(prefixed(k))));
  },
} as const;

export const SECURE_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  USER_EMAIL: "user_email",
  USER_PASSWORD: "user_password",
  /** Transient identifier (email or phone) between sign-in steps. Cleared after login or back. */
  SIGN_IN_IDENTIFIER: "sign_in_identifier",
} as const;
