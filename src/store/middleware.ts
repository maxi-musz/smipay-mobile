import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PersistOptions } from "zustand/middleware";

const STORE_PREFIX = "@smipay";
const isSSR = Platform.OS === "web" && typeof window === "undefined";

/**
 * Pre-configured AsyncStorage adapter for zustand persist middleware.
 * All keys are automatically prefixed with `@smipay/`.
 *
 * WARNING: AsyncStorage is unencrypted. Never persist sensitive data
 * (tokens, PINs, etc.) with this adapter — use `secureStorage` instead.
 */
export function createPersistConfig<T>(
  name: string,
  options?: Partial<PersistOptions<T, Partial<T>>>,
): PersistOptions<T, Partial<T>> {
  return {
    name: `${STORE_PREFIX}/${name}`,
    storage: {
      getItem: async (key) => {
        if (isSSR) return null;
        const value = await AsyncStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      },
      setItem: async (key, value) => {
        if (isSSR) return;
        await AsyncStorage.setItem(key, JSON.stringify(value));
      },
      removeItem: async (key) => {
        if (isSSR) return;
        await AsyncStorage.removeItem(key);
      },
    },
    ...options,
  };
}
