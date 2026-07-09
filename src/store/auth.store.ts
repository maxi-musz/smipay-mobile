import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AuthTokens, User } from "@/types";
import { secureStorage, SECURE_KEYS } from "@/lib/secure-storage";
import { useAppStore } from "./app.store";
import { createPersistConfig } from "./middleware";
import { createSelectors } from "./create-selectors";

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  /** True when the app is locked due to inactivity. */
  isLocked: boolean;
}

interface AuthActions {
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => Promise<void>;
  login: (user: User, tokens: AuthTokens) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
  /** Rehydrate tokens from SecureStore into memory on app launch. */
  hydrateTokens: () => Promise<void>;
  /** Store email + password in SecureStore for lock screen re-auth. Options.requireAuthentication (e.g. iOS) gates password behind biometrics. */
  storeCredentials: (email: string, password: string, options?: { requireAuthentication?: boolean }) => Promise<void>;
  /** Lock the app (show lock screen overlay). */
  lock: () => void;
  /** Unlock the app after successful re-auth. */
  unlock: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLocked: false,
};

async function writeTokens(tokens: AuthTokens) {
  await Promise.all([
    secureStorage.set(SECURE_KEYS.ACCESS_TOKEN, tokens.accessToken),
    secureStorage.set(SECURE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
  ]);
}

async function clearAllSecureData() {
  await secureStorage.clear([
    SECURE_KEYS.ACCESS_TOKEN,
    SECURE_KEYS.REFRESH_TOKEN,
    SECURE_KEYS.USER_EMAIL,
    SECURE_KEYS.USER_PASSWORD,
    SECURE_KEYS.SIGN_IN_IDENTIFIER,
  ]);
}

const _useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => set({ user, isAuthenticated: true }),

      setTokens: async (tokens) => {
        await writeTokens(tokens);
        set({ tokens });
      },

      login: async (user, tokens) => {
        await writeTokens(tokens);
        set({ user, tokens, isAuthenticated: true, isLocked: false });
      },

      logout: async () => {
        await clearAllSecureData();
        useAppStore.getState().setBiometricsEnabled(false);
        const { useHomepageStore } = await import("./homepage.store");
        const { useProfileStore } = await import("./profile.store");
        const { useInboxStore } = await import("./inbox.store");
        const { clearPendingNotificationNavigation } = await import("@/lib/push-notifications");
        useHomepageStore.getState().reset();
        useProfileStore.getState().reset();
        useInboxStore.getState().reset();
        clearPendingNotificationNavigation();
        set(initialState);
      },

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      hydrateTokens: async () => {
        const { tokens: existing } = get();
        if (existing?.accessToken && existing?.refreshToken) {
          return;
        }
        const [accessToken, refreshToken] = await Promise.all([
          secureStorage.get<string>(SECURE_KEYS.ACCESS_TOKEN),
          secureStorage.get<string>(SECURE_KEYS.REFRESH_TOKEN),
        ]);

        if (accessToken && refreshToken) {
          set({ tokens: { accessToken, refreshToken } });
        }
      },

      storeCredentials: async (email, password, options?: { requireAuthentication?: boolean }) => {
        await Promise.all([
          secureStorage.set(SECURE_KEYS.USER_EMAIL, email),
          secureStorage.set(SECURE_KEYS.USER_PASSWORD, password, options),
        ]);
      },

      lock: () => set({ isLocked: true }),

      unlock: () => set({ isLocked: false }),
    }),
    createPersistConfig<AuthStore>("auth", {
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isLocked: state.isLocked,
      }),
      onRehydrateStorage: () => () => {
        useAppStore.getState().setHydrated(true);
      },
    }),
  ),
);

export const useAuthStore = createSelectors(_useAuthStore);
