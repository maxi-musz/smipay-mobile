import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AuthTokens, User } from "@/types";
import { secureStorage, SECURE_KEYS } from "@/lib/secure-storage";
import { createPersistConfig } from "./middleware";
import { createSelectors } from "./create-selectors";

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => Promise<void>;
  login: (user: User, tokens: AuthTokens) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
  /** Rehydrate tokens from SecureStore into memory on app launch. */
  hydrateTokens: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
};

async function writeTokens(tokens: AuthTokens) {
  await Promise.all([
    secureStorage.set(SECURE_KEYS.ACCESS_TOKEN, tokens.accessToken),
    secureStorage.set(SECURE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
  ]);
}

async function clearTokens() {
  await secureStorage.clear([
    SECURE_KEYS.ACCESS_TOKEN,
    SECURE_KEYS.REFRESH_TOKEN,
  ]);
}

const _useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user) => set({ user, isAuthenticated: true }),

      setTokens: async (tokens) => {
        await writeTokens(tokens);
        set({ tokens });
      },

      login: async (user, tokens) => {
        await writeTokens(tokens);
        set({ user, tokens, isAuthenticated: true });
      },

      logout: async () => {
        await clearTokens();
        set(initialState);
      },

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      hydrateTokens: async () => {
        const [accessToken, refreshToken] = await Promise.all([
          secureStorage.get<string>(SECURE_KEYS.ACCESS_TOKEN),
          secureStorage.get<string>(SECURE_KEYS.REFRESH_TOKEN),
        ]);

        if (accessToken && refreshToken) {
          set({ tokens: { accessToken, refreshToken } });
        }
      },
    }),
    createPersistConfig<AuthStore>("auth", {
      // Only persist non-sensitive state to AsyncStorage.
      // Tokens are stored separately in SecureStore.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }),
  ),
);

export const useAuthStore = createSelectors(_useAuthStore);
