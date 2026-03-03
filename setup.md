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

## What to do next

- Replace placeholder `icon.png`, `splash-icon.png`, and `favicon.png` with SmiPay branded versions.
- Load custom fonts via `expo-font` and update `src/constants/typography.ts` + `tailwind.config.js`.
- Add async-storage persistence to theme preference if needed.
