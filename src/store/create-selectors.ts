import type { StoreApi, UseBoundStore } from "zustand";

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never;

/**
 * Wraps a zustand store with auto-generated property selectors.
 *
 * Instead of `useAuthStore((s) => s.user)` you can write `useAuthStore.use.user()`.
 * Each selector is stable and only triggers re-renders when that specific
 * property changes — zero boilerplate, maximum performance.
 */
export function createSelectors<S extends UseBoundStore<StoreApi<object>>>(
  _store: S,
) {
  const store = _store as WithSelectors<typeof _store>;
  store.use = {} as Record<string, () => unknown>;

  for (const key of Object.keys(store.getState())) {
    (store.use as Record<string, () => unknown>)[key] = () =>
      store((s) => s[key as keyof typeof s]);
  }

  return store;
}
