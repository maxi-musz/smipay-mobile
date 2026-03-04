import * as SecureStore from "expo-secure-store";

const KEY_PREFIX = "smipay";

function prefixed(key: string) {
  return `${KEY_PREFIX}.${key}`;
}

/**
 * Thin wrapper around expo-secure-store with consistent key prefixing
 * and JSON serialization. Use for sensitive data only (tokens, PINs, etc.).
 *
 * Non-sensitive data should use AsyncStorage via the zustand persist middleware.
 */
export const secureStorage = {
  async get<T = string>(key: string): Promise<T | null> {
    const raw = await SecureStore.getItemAsync(prefixed(key));
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  },

  async set(key: string, value: unknown): Promise<void> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    await SecureStore.setItemAsync(prefixed(key), serialized);
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
} as const;
