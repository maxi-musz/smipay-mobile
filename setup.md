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
| `background` | White | Gray 950 | Page background |
| `foreground` | Gray 950 | Gray 50 | Text color |
| `destructive` | Red 600 | Red 500 | Error/delete actions |
| `muted` | Gray 50 | Gray 800 | Subtle backgrounds |
| `card` | White | Gray 900 | Card surfaces |

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
| `src/context/theme-context.tsx` | React context that holds current mode (light / dark / system) and provides `toggle()` |
| `src/hooks/use-app-theme.ts` | Hook to consume theme — returns `{ theme, mode, isDark, setMode, toggle }` |
| `src/app/_layout.tsx` | Wraps the app in `<ThemeProvider>` and syncs NativeWind's color scheme |

### Usage

```tsx
const { isDark, toggle } = useAppTheme();
```

In any component's className:

```tsx
<View className="bg-white dark:bg-gray-950" />
```

For imperative style (when you need the actual hex value):

```tsx
const { theme } = useAppTheme();
<View style={{ backgroundColor: theme.background }} />
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
| `onboarding-screen.tsx` | Full-screen pager UI |
| `use-onboarding-status.ts` | AsyncStorage persistence hook |
| `index.ts` | Barrel export |

- **3 slides:** Welcome, Utility Services (airtime/data/electricity/cable TV), Education Payments (JAMB/WAEC/NECO).
- **Shown once per device** — persisted via `AsyncStorage` (`@smipay/onboarding_completed`).
- **Skip** and **Next / Get Started** CTAs. Horizontal pager with dot indicators.
- **Dev only:** "Clear app data" button on home screen (with confirmation) to reset onboarding.

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

## Storage Strategy

The app uses a **two-tier storage** approach appropriate for a fintech app:

| Layer | Technology | Use case | Encrypted? |
| --- | --- | --- | --- |
| **Sensitive** | `expo-secure-store` (Keychain / Keystore) | Auth tokens, PINs, secrets | Yes (hardware-level) |
| **Non-sensitive** | `@react-native-async-storage/async-storage` | Onboarding status, theme pref, cached UI state | No |

### Secure storage (`src/lib/secure-storage.ts`)

Thin wrapper around `expo-secure-store` with key prefixing (`smipay.*`) and JSON serialization.

```ts
import { secureStorage, SECURE_KEYS } from "@/lib/secure-storage";

await secureStorage.set(SECURE_KEYS.ACCESS_TOKEN, "jwt...");
const token = await secureStorage.get<string>(SECURE_KEYS.ACCESS_TOKEN);
await secureStorage.remove(SECURE_KEYS.ACCESS_TOKEN);
```

Add new key names to `SECURE_KEYS` in `secure-storage.ts` as needed.

## State Management (Zustand)

All global state lives in `src/store/`. Each store is a standalone zustand store — no providers required.

| File | Purpose |
| --- | --- |
| `middleware.ts` | `createPersistConfig()` — AsyncStorage persist adapter for **non-sensitive** state. Keys prefixed with `@smipay/`. |
| `create-selectors.ts` | `createSelectors()` — wraps any store with auto-generated `.use.*` selectors for zero-boilerplate access. |
| `auth.store.ts` | User & auth state. User profile persisted to AsyncStorage; tokens stored in SecureStore separately. |
| `app.store.ts` | App-wide state: hydration flag, global loading overlay, notification badge count. Not persisted. |
| `index.ts` | Barrel export for all stores and utilities. |

### Auth store token flow

Tokens are **never** written to AsyncStorage. The auth store handles them like this:

- **`login(user, tokens)`** — writes tokens to SecureStore, sets user in zustand (persisted to AsyncStorage).
- **`logout()`** — clears tokens from SecureStore, resets zustand state.
- **`hydrateTokens()`** — reads tokens from SecureStore back into zustand memory on app launch.
- **`setTokens(tokens)`** — overwrites tokens in SecureStore (e.g. after a refresh).

### Usage

**Option A — selector function (standard):**

```tsx
import { useAuthStore } from "@/store";

const user = useAuthStore((s) => s.user);
const logout = useAuthStore((s) => s.logout);
```

**Option B — auto-selectors (preferred, less boilerplate):**

```tsx
import { useAuthStore } from "@/store";

const user = useAuthStore.use.user();
const logout = useAuthStore.use.logout();
```

Both approaches only re-render when the selected value changes.

**Outside React (in utils, interceptors, etc.):**

```ts
import { useAuthStore } from "@/store";

const token = useAuthStore.getState().tokens?.accessToken;
useAuthStore.getState().logout();
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

1. **Request interceptor** — automatically attaches:
   - Device metadata headers (`x-device-id`, `x-device-model`, etc.) from `src/lib/device.ts`
   - Location headers (`x-latitude`, `x-longitude`) if permission was granted (from `src/lib/location.ts`)
   - `Authorization: Bearer <token>` if the user is authenticated
2. **Response interceptor** — normalizes errors into `ApiClientError` with human-readable messages.

**Base URL** is set via the `EXPO_PUBLIC_API_URL` env variable. Create a `.env` file:

```
EXPO_PUBLIC_API_URL=https://your-api.com/api/v1
```

### Device metadata (`src/lib/device.ts`)

| What | How | Compliance note |
| --- | --- | --- |
| Device ID | App-generated UUID v4 stored in SecureStore | Not a hardware ID — fully compliant with Apple ATT and Google Play policies |
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

## Auth API (`src/api/auth.ts`)

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

## Authentication Screens

All auth screens live in `src/app/(auth)/`.

| Screen | Route | Flow |
| --- | --- | --- |
| Sign In | `/(auth)/sign-in` | Email + password → auto-navigate to dashboard |
| Sign Up | `/(auth)/sign-up` | 3-step: email verification → OTP → full profile form → auto sign-in |
| Forgot Password | `/(auth)/forgot-password` | 3-step: email → OTP → new password → redirect to sign-in |

### Routing logic (`src/app/index.tsx`)

1. Show pre-auth onboarding if not completed (persisted locally via AsyncStorage)
2. If not authenticated → `<Redirect>` to `/(auth)/sign-in`
3. If authenticated → show dashboard (placeholder for now)

## What to do next

- Replace placeholder `icon.png`, `splash-icon.png`, and `favicon.png` with SmiPay branded versions.
- Load custom fonts via `expo-font` and update `src/constants/typography.ts` + `tailwind.config.js`.
- Add async-storage persistence to theme preference if needed.
- Build the dashboard / tab navigation for authenticated users.
- Call `requestLocationPermission()` after first sign-in with a pre-permission explainer.
- Implement token refresh logic in the API interceptor.
