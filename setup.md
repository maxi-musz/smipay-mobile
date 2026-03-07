# SmiPay Mobile - Project Setup

## Stack

| Technology | Version |
| --- | --- |
| Expo SDK | 54 |
| React Native | 0.81.5 |
| React | 19.1.0 |
| TypeScript | 5.9 |
| NativeWind | 4.2.2 |
| Tailwind CSS | 3.4 |

## Styling

- **NativeWind** is configured so all components use `className` (Tailwind utility classes) instead of `StyleSheet`.
- Dark mode uses the `dark:` prefix — e.g. `className="bg-white dark:bg-gray-950"`.
- Tailwind is set to `darkMode: "class"` so the theme is toggled programmatically, not tied to device settings.

## UI Components (React Native Reusables)

shadcn/ui equivalent for React Native. Copy-paste components, full control.

**Installed dependencies:**
- `class-variance-authority` — variant-based component styling
- `clsx` + `tailwind-merge` — class merging via `cn()` helper (`src/lib/utils.ts`)
- `tailwindcss-animate` — animation utilities
- `@rn-primitives/portal` — portal for dropdowns, modals, tooltips

**Configuration:**
- `global.css` — HSL CSS variables for light/dark themes, mapped to SmiPay brand colors
- `tailwind.config.js` — semantic tokens (`primary`, `secondary`, `accent`, `muted`, `card`, `destructive`, etc.) via CSS variables
- `metro.config.js` — `inlineRem: 16` for consistent rem-based sizing
- `PortalHost` — rendered as last child in root layout

**Adding components:**

```bash
npx @react-native-reusables/cli@latest add button
npx @react-native-reusables/cli@latest add input
npx @react-native-reusables/cli@latest add card
```

**Using `cn()` for conditional classes:**

```tsx
import { cn } from "@/lib/utils";

<View className={cn("rounded-lg p-4", isDark && "bg-card")} />
```

**Semantic color tokens (from CSS variables):**

| Token | Light | Dark | SmiPay mapping |
| --- | --- | --- | --- |
| `primary` | Orange 500 | Orange 500 | Brand orange |
| `accent` | Green 500 | Green 500 | Brand green |
| `background` | White | Gray 900 | Page background |
| `foreground` | Gray 950 | Gray 50 | Text color |
| `destructive` | Red 600 | Red 500 | Error/delete actions |
| `muted` | Gray 50 | Gray 800 | Subtle backgrounds |
| `card` | White | Gray 850 | Card surfaces |

## Design System

All tokens live in `src/constants/` and are the single source of truth.

| File | Contents |
| --- | --- |
| `colors.ts` | Brand palette (orange, green), neutral grays, semantic colors (success, error, warning, info) |
| `typography.ts` | Font families, font sizes, line heights, font weights |
| `spacing.ts` | 4-point spacing scale, border radius scale |
| `theme.ts` | Light & dark theme objects mapping semantic roles → concrete colors |
| `index.ts` | Barrel export for all constants |

### Brand Colors (from logo)

| Token | Hex | Usage |
| --- | --- | --- |
| `orange-500` | `#F58220` | Primary brand color ("Smi" in logo) |
| `green-500` | `#1B8C3D` | Secondary brand color ("Pay" in logo) |

Both have full 50–950 shade scales available in Tailwind and TypeScript.

## Theming

| File | Purpose |
| --- | --- |
| `src/context/theme-context.tsx` | React context that reads/writes `themeMode` from Zustand app store. Provides `toggle()`, `setMode()`, `isDark`. |
| `src/hooks/use-app-theme.ts` | Hook to consume theme — returns `{ theme, mode, isDark, setMode, toggle }` |
| `src/components/theme-toggle.tsx` | Reusable sun/moon icon button. Used in onboarding, auth layout, and dashboard. |
| `src/app/_layout.tsx` | Wraps the app in `<ThemeProvider>` and syncs NativeWind's color scheme |

**Theme is persisted.** The `themeMode` is stored in `app.store` via Zustand `persist` middleware (AsyncStorage). Survives app restarts.

### Usage

```tsx
const { isDark, toggle } = useAppTheme();
```

## Splash Screen

Two-layer splash (like OPay):
1. **Native splash** — white background + SmiPay icon. Shows while JS loads. Configured in `app.json`.
2. **Custom splash overlay** (`src/components/splash-overlay.tsx`) — animated icon + "SmiPay" text + tagline. Fades out after ~2.2s.

## Onboarding

All onboarding files live in `src/onboarding/`.

| File | Purpose |
| --- | --- |
| `constants.ts` | Slide content, icons, storage key |
| `onboarding-screen.tsx` | Full-screen pager UI with theme toggle in header |
| `use-onboarding-status.ts` | AsyncStorage persistence hook |
| `index.ts` | Barrel export |

- **3 slides:** Welcome, Utility Services (airtime/data/electricity/cable TV), Education Payments (JAMB/WAEC/NECO).
- **Shown once per device** — persisted via `AsyncStorage` (`@smipay/onboarding_completed`).
- **Skip** and **Next / Get Started** CTAs. Horizontal pager with dot indicators.

## Assets

| Path | File |
| --- | --- |
| `assets/images/smipay-logo.png` | Full logo with text |
| `assets/images/icon.png` | App icon (S with smile) |
| `assets/images/splash-icon.png` | Splash screen image |
| `assets/images/favicon.png` | Web favicon |

## Running

```bash
npm start          # Start Expo dev server
npm run ios        # iOS simulator
npm run android    # Android emulator
```

## Environment Variables

Create a `.env` file in the project root:

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:1500
EXPO_PUBLIC_API_VERSION=/api/v1

# Utility service providers (default: vtpass)
EXPO_PUBLIC_AIRTIME_PROVIDER=vtpass
EXPO_PUBLIC_DATA_PROVIDER=vtpass
```

The API client constructs its base URL as `${EXPO_PUBLIC_API_BASE_URL}${EXPO_PUBLIC_API_VERSION}`.

**Note:** `localhost` only works from the iOS Simulator (shares host network). For physical devices, use your machine's LAN IP (e.g. `http://192.168.x.x:1500`).

## Storage Strategy

Two-tier storage appropriate for a fintech app:

| Layer | Technology | Use case | Encrypted? |
| --- | --- | --- | --- |
| **Sensitive** | `expo-secure-store` (Keychain / Keystore) | Auth tokens, device ID, PINs, secrets | Yes (hardware-level) |
| **Non-sensitive** | `@react-native-async-storage/async-storage` | Onboarding status, theme pref, user profile cache | No |

### Secure storage (`src/lib/secure-storage.ts`)

Thin wrapper around `expo-secure-store` with key prefixing (`smipay.*`) and JSON serialization.

```ts
import { secureStorage, SECURE_KEYS } from "@/lib/secure-storage";

await secureStorage.set(SECURE_KEYS.ACCESS_TOKEN, "jwt...");
const token = await secureStorage.get<string>(SECURE_KEYS.ACCESS_TOKEN);
await secureStorage.remove(SECURE_KEYS.ACCESS_TOKEN);
```

## State Management (Zustand)

All global state lives in `src/store/`. Each store is a standalone zustand store — no providers required.

| File | Purpose |
| --- | --- |
| `middleware.ts` | `createPersistConfig()` — AsyncStorage persist adapter for **non-sensitive** state. Keys prefixed with `@smipay/`. |
| `create-selectors.ts` | `createSelectors()` — wraps any store with auto-generated `.use.*` selectors for zero-boilerplate access. |
| `auth.store.ts` | User & auth state. User profile persisted to AsyncStorage; tokens stored in SecureStore separately. |
| `app.store.ts` | App-wide state: hydration flag, global loading, notification count, **theme mode** (persisted). |
| `index.ts` | Barrel export for all stores and utilities. |

### Auth store token flow

Tokens are **never** written to AsyncStorage. The auth store handles them like this:

- **`login(user, tokens)`** — writes tokens to SecureStore, sets user in zustand (persisted to AsyncStorage).
- **`logout()`** — clears tokens from SecureStore, resets zustand state.
- **`hydrateTokens()`** — reads tokens from SecureStore back into zustand memory on app launch.
- **`setTokens(tokens)`** — overwrites tokens in SecureStore (e.g. after a refresh).

### App store

Persisted fields (AsyncStorage): `themeMode` only.

Non-persisted (in-memory): `isHydrated`, `isGlobalLoading`, `notificationCount`.

### Usage

```tsx
import { useAuthStore } from "@/store";

// Auto-selectors (preferred):
const user = useAuthStore.use.user();
const logout = useAuthStore.use.logout();

// Outside React:
const token = useAuthStore.getState().tokens?.accessToken;
```

### Adding a new store

1. Create `src/store/<name>.store.ts`.
2. Define `State`, `Actions`, and `Store = State & Actions` interfaces.
3. Use `create<Store>()()` with `persist()` middleware if the store should survive app restarts. **Never persist sensitive data with the AsyncStorage adapter** — use `secureStorage` directly.
4. Wrap with `createSelectors()` for auto-generated `.use.*` hooks.
5. Export from `src/store/index.ts`.

### Types

All shared types live in `src/types/`.

| File | Contents |
| --- | --- |
| `user.ts` | `User` (matches backend snake_case), `AuthTokens` |
| `api.ts` | `ApiResponse<T>`, `ApiError`, `AuthResponse`, `RegisterPayload`, `SignInPayload`, `ResetPasswordPayload` |
| `store.ts` | `AsyncState<T>`, `createAsyncState()` — generic wrapper for loading/error/data patterns |
| `index.ts` | Barrel export |

## API Client (`src/lib/api.ts`)

Pre-configured Axios instance with two interceptors:

1. **Request interceptor:**
   - Logs `→ METHOD url` in dev
   - Attaches device metadata headers (wrapped in try/catch — non-blocking)
   - Attaches location headers if permission granted (wrapped in try/catch — non-blocking)
   - Attaches `Authorization: Bearer <token>` if authenticated
2. **Response interceptor:**
   - Logs `← STATUS METHOD url` in dev
   - Normalizes errors into `ApiClientError(message, statusCode)`

On startup, logs `[API] Base URL: ...` so you can confirm the resolved URL.

### Device metadata (`src/lib/device.ts`)

| What | How | Compliance note |
| --- | --- | --- |
| Device ID | App-generated UUID via `expo-crypto` stored in SecureStore | Not a hardware ID — fully compliant with Apple ATT and Google Play policies |
| Device model/name | `expo-device` | Standard system API, no permissions needed |
| OS name/version | `Platform` API | Standard |
| App version | `expo-application` | Standard |

### Location (`src/lib/location.ts`)

| Function | What it does |
| --- | --- |
| `getLocation()` | Returns cached coords if permission was already granted. **Never triggers a permission dialog.** |
| `requestLocationPermission()` | Requests foreground-only permission. Call explicitly from UI context (e.g. after first sign-in). |

**Compliance approach:**
- Foreground only — no background tracking.
- Balanced accuracy (~100m) — not precise.
- Permission requested contextually, not on cold start.
- If denied, app works normally; backend falls back to IP geolocation.
- See `DATA_COLLECTION_DISCLOSURE.md` for store form guidance and privacy policy text.

## Error Handling (`src/lib/errors/`)

Centralized system that ensures users never see raw error messages.

| File | Purpose |
| --- | --- |
| `error-handler.ts` | `classifyError()` — maps any error to a safe `{ title, message, variant }`. `handleApiError()` — classifies + shows toast + handles 401 logout. |
| `index.ts` | Barrel export |

**Error classification logic:**
- Network errors (pattern matching on message) → "Check your internet connection"
- 400, 409 → backend message passed through (they're user-friendly per API spec)
- 401 → auto-logout + redirect to sign-in + toast
- 403, 404, 408, 429, 5xx → safe substitute messages
- Unknown → "An unexpected error occurred"

**Usage in any screen:**

```tsx
import { handleApiError } from "@/lib/errors";

try {
  await someApiCall();
} catch (e) {
  handleApiError(e); // shows toast, handles 401
}
```

## Toast System (`src/components/ui/toast/`)

Global toast notifications displayed at the top of the screen.

| File | Purpose |
| --- | --- |
| `toast-store.ts` | Zustand store managing a queue of toasts. `useToastStore.getState().show({ variant, title, message })` |
| `toast-container.tsx` | Animated `<ToastContainer />` rendered in root layout. Auto-dismisses after timeout. |
| `index.ts` | Barrel export |

Variants: `success`, `error`, `warning`, `info`.

Wired into `_layout.tsx` — no setup needed per screen.

## Loader Components (`src/components/ui/loaders/`)

| File | Purpose |
| --- | --- |
| `full-page-loader.tsx` | Full-screen overlay with app icon breathing animation (Reanimated). Grey background. |
| `spinner.tsx` | Wraps `ActivityIndicator`. Used inline on buttons during API calls. |
| `index.ts` | Barrel export |

## Modal Components (`src/components/ui/modals/`)

| File | Purpose |
| --- | --- |
| `alert-modal.tsx` | Success / error / warning alerts with icon, title, message, and CTA button. |
| `confirm-modal.tsx` | Confirmation dialog with cancel + confirm actions. |
| `index.ts` | Barrel export |

## Auth API (`src/api/services/auth.ts`)

Thin functions wrapping each backend auth endpoint:

| Function | Endpoint |
| --- | --- |
| `requestEmailVerification(email)` | `POST /new-auth/request-email-verification` |
| `verifyEmailForRegistration(email, otp)` | `POST /new-auth/verify-email-for-registration` |
| `register(payload)` | `POST /new-auth/register` |
| `signIn(payload)` | `POST /new-auth/signin` |
| `forgotPassword(email)` | `POST /new-auth/forgot-password` |
| `verifyPasswordResetOtp(email, otp)` | `POST /new-auth/verify-password-reset-otp` |
| `resetPassword(payload)` | `POST /new-auth/reset-password` |
| `logout()` | `POST /new-auth/logout` |
| `completeOnboarding()` | `POST /new-auth/complete-onboarding` |

Barrel-exported from `src/api/index.ts`.

## Authentication Screens (`src/app/(auth)/`)

| Screen | Route | Flow |
| --- | --- | --- |
| Sign In | `/(auth)/sign-in` | Email + password → dashboard |
| Sign Up | `/(auth)/sign-up` | 3-step: email → OTP → profile form → auto sign-in → dashboard |
| Forgot Password | `/(auth)/forgot-password` | 3-step: email → OTP → new password → sign-in |

**Auth layout** (`(auth)/_layout.tsx`): Renders a `ThemeToggle` absolutely positioned on all auth screens.

**Features across all auth screens:**
- Form validation with computed `canSubmit` states — buttons disabled until all fields are valid
- Inline error messages that clear as user types
- `Spinner` on buttons during API loading (not text)
- All API errors handled via `handleApiError()` → toast

**Sign-up profile step layout:**
- First Name + Last Name side by side in one row
- Labeled divider separating personal info from password section
- Numbered step indicator (1 → 2 → 3) with labels and connector lines

## Routing (`src/app/`)

| Route | File | Purpose |
| --- | --- | --- |
| `/` | `index.tsx` | Entry point: onboarding → auth redirect → dashboard redirect |
| `/(auth)/*` | `(auth)/_layout.tsx` | Auth screens (sign-in, sign-up, forgot-password). Theme toggle in layout. |
| `/(app)/*` | `(app)/_layout.tsx` | Authenticated route group. Redirects to sign-in if not authenticated. |
| `/(app)/dashboard` | `(app)/dashboard.tsx` | Dashboard placeholder. Shows welcome message + user's first name. |

**Flow:**
1. `index.tsx` checks onboarding status → if not completed, shows onboarding
2. If onboarding done + not authenticated → `<Redirect href="/(auth)/sign-in" />`
3. If authenticated → `<Redirect href="/(app)/dashboard" />`
4. `(app)/_layout.tsx` guards all child routes — redirects to sign-in if session lost

## App Store / Play Store Compliance

**Audited and safe.** See `DATA_COLLECTION_DISCLOSURE.md` for full details.

| Concern | Status |
| --- | --- |
| No hardware IDs (IMEI, MAC, IDFA) | ✅ App-generated UUID only |
| No background location | ✅ Foreground only, balanced accuracy |
| No auto-prompted permissions | ✅ Location requested explicitly from UI context |
| Tokens encrypted | ✅ SecureStore (Keychain / Keystore) |
| No tracking / advertising SDKs | ✅ ATT not required |
| Permission strings in app.json | ✅ Clear purpose descriptions |
| Dev logging stripped from prod | ✅ `__DEV__` guarded |

## What to do next

- Replace placeholder `icon.png`, `splash-icon.png`, and `favicon.png` with SmiPay branded versions.
- Load custom fonts via `expo-font` and update `src/constants/typography.ts` + `tailwind.config.js`.
- Call `requestLocationPermission()` after first sign-in with a pre-permission explainer UI.
- Implement token refresh logic in the API response interceptor (on 401, try refresh before logout).
- Build tab navigation inside `(app)/` for dashboard, wallet, services, profile, etc.
