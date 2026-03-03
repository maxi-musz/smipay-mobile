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

## Assets

| Path | File |
| --- | --- |
| `assets/images/smipay-logo.png` | Full logo with text |
| `assets/images/icon.png` | App icon (S with smile) |
| `assets/images/icon.png` | Store listing icon (replace with final) |
| `assets/images/splash-icon.png` | Splash screen image (replace with final) |
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
