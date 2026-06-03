/**
 * Silent, sequential prefetch of utility provider lists.
 *
 * Called once after the homepage finishes loading. Each step reuses the
 * service's existing store fetch, which is TTL-guarded — so a fresh cache makes
 * the call an instant no-op and only stale/missing caches hit the network.
 * Steps run strictly one after another (never in parallel) so we don't flood
 * the backend, and each is isolated so one failure can't break the chain.
 */
import { useAirtimeStore } from "@/store/airtime.store";
import { useDataStore } from "@/features/vtpass-data/lib/store";
import { useCableStore } from "@/features/vtpass-cable/lib/store";
import { useElectricityStore } from "@/features/vtpass-electricity/lib/store";
import { useIntlAirtimeStore } from "@/features/vtpass-intl-airtime/lib/store";
import { useEducationStore } from "@/features/vtpass-education/lib/store";
import { EDUCATION_PRODUCTS } from "@/features/vtpass-education/lib/constants";

type PersistApi = {
  persist?: {
    hasHydrated: () => boolean;
    onFinishHydration: (cb: () => void) => () => void;
  };
};

/** Resolve once a persisted store has finished rehydrating from AsyncStorage. */
function waitForHydration(store: PersistApi): Promise<void> {
  const persist = store.persist;
  if (!persist || persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = persist.onFinishHydration(() => {
      unsub?.();
      resolve();
    });
    // Guard against the store hydrating between the check above and subscribing.
    if (persist.hasHydrated()) {
      unsub?.();
      resolve();
    }
  });
}

/** Run a single prefetch step, swallowing errors so the chain continues. */
async function step(
  store: PersistApi,
  fetcher: () => Promise<void>,
): Promise<void> {
  try {
    await waitForHydration(store);
    await fetcher();
  } catch {
    // Silent: a failed prefetch just means the screen fetches on demand later.
  }
}

let isRunning = false;

/**
 * Prefetch every service's first/provider endpoint, one after another.
 * Safe to call repeatedly: it is a no-op while a run is in flight, and each
 * underlying fetch short-circuits when its cache is still fresh.
 */
export async function prefetchProviders(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    await step(useAirtimeStore, () =>
      useAirtimeStore.getState().fetchAirtimeProviders(),
    );
    await step(useDataStore, () => useDataStore.getState().fetchProviders());
    await step(useCableStore, () => useCableStore.getState().fetchProviders());
    await step(useElectricityStore, () =>
      useElectricityStore.getState().fetchProviders(),
    );
    await step(useIntlAirtimeStore, () =>
      useIntlAirtimeStore.getState().fetchCountries(),
    );

    const defaultEducationProduct = EDUCATION_PRODUCTS[0]?.serviceID;
    if (defaultEducationProduct) {
      await step(useEducationStore, () =>
        useEducationStore.getState().fetchVariations(defaultEducationProduct),
      );
    }
  } finally {
    isRunning = false;
  }
}
