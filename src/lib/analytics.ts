// src/lib/analytics.ts
//
// Central analytics wrapper for SmiPay.
// - Never throws (analytics must never break a payment flow).
// - No PII: only allowlisted, non-identifying params are ever sent.
// - Environment-aware: tags every session with app_environment and can be
//   disabled per build profile via EXPO_PUBLIC_ANALYTICS_ENABLED.
// - No-ops in Expo Go (the native module is unavailable there).

import Constants, { ExecutionEnvironment } from 'expo-constants';

// --- Enablement ------------------------------------------------------------

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

// Enabled everywhere by default; set EXPO_PUBLIC_ANALYTICS_ENABLED="false"
// on any profile where you don't want events. Never runs in Expo Go.
const ANALYTICS_ENABLED =
  !isExpoGo && process.env.EXPO_PUBLIC_ANALYTICS_ENABLED !== 'false';

type AnalyticsModule = {
  setAnalyticsCollectionEnabled: (enabled: boolean) => Promise<void>;
  setUserProperty: (name: string, value: string) => Promise<void>;
  logEvent: (name: string, params?: Record<string, unknown>) => Promise<void>;
  setUserId: (userId: string | null) => Promise<void>;
};

// Lazy-load Firebase: a top-level import crashes Expo Go (RNFBAppModule not found).
let analyticsInstance: AnalyticsModule | null | undefined;

function getAnalytics(): AnalyticsModule | null {
  if (!ANALYTICS_ENABLED) return null;
  if (analyticsInstance !== undefined) return analyticsInstance;
  try {
    const instance = require('@react-native-firebase/analytics').default() as AnalyticsModule;
    analyticsInstance = instance;
    return instance;
  } catch {
    analyticsInstance = null;
    return null;
  }
}

let initialized = false;

async function ensureInit(): Promise<boolean> {
  if (!ANALYTICS_ENABLED) return false;
  const analytics = getAnalytics();
  if (!analytics) return false;
  if (initialized) return true;
  initialized = true;
  try {
    await analytics.setAnalyticsCollectionEnabled(true);
    // So production reports can exclude non-prod traffic via this dimension.
    await analytics.setUserProperty('app_environment', APP_ENV);
  } catch {
    // swallow
  }
  return true;
}

// --- PII-safe param handling (allowlist) -----------------------------------

// Only these keys are ever sent. Anything else is dropped. This is a hard
// backstop for a fintech app — raw amounts, phone numbers, account numbers,
// names, tokens, meter/smartcard numbers, etc. can never leak even by mistake.
const ALLOWED_KEYS = new Set<string>([
  'method',        // 'password' | 'biometric'
  'channel',       // 'dva' | 'paystack'
  'service',       // utility service name
  'provider',      // network/disco name e.g. 'MTN' (non-PII)
  'reason',        // short failure reason code/text
  'price_band',    // bucketed amount range (never a raw value)
  'quantity',      // integer count (e.g. WAEC PIN qty)
  'item_category', // optional grouping
  'screen_name',
  'screen_class',
]);

type ParamValue = string | number | boolean;
type Params = Record<string, ParamValue>;

function sanitize(params?: Params): Record<string, string | number> {
  const safe: Record<string, string | number> = {};
  if (!params) return safe;
  for (const [key, value] of Object.entries(params)) {
    if (!ALLOWED_KEYS.has(key)) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(`[analytics] dropped non-allowlisted param "${key}"`);
      }
      continue;
    }
    if (typeof value === 'string') safe[key] = value.slice(0, 100);
    else if (typeof value === 'number' && Number.isFinite(value)) safe[key] = value;
    else if (typeof value === 'boolean') safe[key] = value ? 'true' : 'false';
  }
  return safe;
}

// Bucket a NGN amount into a coarse band so no raw financial value is ever sent.
export function priceBand(amountNgn: number): string {
  if (!Number.isFinite(amountNgn) || amountNgn < 0) return 'unknown';
  if (amountNgn < 500) return '0-499';
  if (amountNgn < 1000) return '500-999';
  if (amountNgn < 2000) return '1000-1999';
  if (amountNgn < 5000) return '2000-4999';
  if (amountNgn < 10000) return '5000-9999';
  if (amountNgn < 20000) return '10000-19999';
  if (amountNgn < 50000) return '20000-49999';
  return '50000+';
}

// --- Core API --------------------------------------------------------------

export async function logEvent(name: string, params?: Params): Promise<void> {
  try {
    if (!(await ensureInit())) return;
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics.logEvent(name, sanitize(params));
  } catch {
    // never throw from analytics
  }
}

// Pass your internal user UUID only — NEVER email, phone, or any PII.
export async function setAnalyticsUser(userId: string | null): Promise<void> {
  try {
    if (!(await ensureInit())) return;
    const analytics = getAnalytics();
    if (!analytics) return;
    await analytics.setUserId(userId);
  } catch {
    // ignore
  }
}

export function clearAnalyticsUser(): Promise<void> {
  return setAnalyticsUser(null);
}

// --- Typed SmiPay helpers --------------------------------------------------

type UtilityService =
  | 'airtime'
  | 'data'
  | 'cable'
  | 'electricity'
  | 'education'
  | 'intl_airtime';

// Auth
export const logSignIn = (method: 'password' | 'biometric' = 'password') =>
  logEvent('login', { method });
export const logSignUpComplete = () => logEvent('sign_up', { method: 'password' });
export const logSignOut = () => logEvent('sign_out');

// Wallet funding
export const logFundingInitiated = (channel: 'dva' | 'paystack') =>
  logEvent('funding_initiated', { channel });
export const logFundingSuccess = (channel: 'dva' | 'paystack', amountNgn?: number) =>
  logEvent('funding_success', {
    channel,
    ...(amountNgn != null ? { price_band: priceBand(amountNgn) } : {}),
  });

// Utility purchases
export const logPurchaseSuccess = (
  service: UtilityService,
  amountNgn?: number,
  provider?: string,
) =>
  logEvent('purchase_success', {
    service,
    ...(provider ? { provider } : {}),
    ...(amountNgn != null ? { price_band: priceBand(amountNgn) } : {}),
  });

export const logPurchaseFailed = (service: UtilityService, reason?: string) =>
  logEvent('purchase_failed', {
    service,
    ...(reason ? { reason: reason.slice(0, 80) } : {}),
  });

// Optional. Only use if automatic screen reporting is turned OFF, otherwise
// screens are already auto-collected and this would double-count.
export const logScreenView = (screenName: string) =>
  logEvent('screen_view', { screen_name: screenName, screen_class: screenName });
