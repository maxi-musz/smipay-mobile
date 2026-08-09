import AsyncStorage from "@react-native-async-storage/async-storage";

import type { BootstrapData } from "./types";

const CACHE_KEY = "@smipay/app_bootstrap";

/**
 * How old a cached payload may be and still be worth showing at boot. Past
 * this we still boot from it (a stale hint beats a blank screen) but treat it
 * as expired for anything the user would notice being wrong.
 */
export const BOOTSTRAP_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

interface CachedBootstrap {
  data: BootstrapData;
  fetched_at: number;
}

/**
 * Read the last good payload so a cold start with no network is not a blank
 * screen. A cached copy is a **hint, never permission** — the backend re-checks
 * every rule at the moment it matters.
 */
export async function readCachedBootstrap(): Promise<CachedBootstrap | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedBootstrap;
    if (!parsed?.data || typeof parsed.fetched_at !== "number") return null;
    return parsed;
  } catch {
    return null; // Best-effort. A corrupt cache is the same as no cache.
  }
}

export async function writeCachedBootstrap(data: BootstrapData): Promise<void> {
  try {
    const payload: CachedBootstrap = { data, fetched_at: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Best-effort — a failed write only costs us the next cold start.
  }
}

export async function clearCachedBootstrap(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
