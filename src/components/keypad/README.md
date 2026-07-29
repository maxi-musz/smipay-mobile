# Keypad

A self-contained, in-app numeric keypad for SmiPay. It replaces the system
keyboard for OTP, PIN, and amount entry.

```tsx
import { Keypad, KeypadDock, CodeSlots, useNumericInput } from "@/components/keypad";
```

Nothing outside this folder is modified by adding it, and it has no dependency on
NativeWind classes — only on packages the app already ships (`react-native`,
`react-native-reanimated`, `react-native-safe-area-context`, `@expo/vector-icons`).

## Why a custom keypad

Replacing the system keyboard removes the biggest source of Android
fragmentation bugs in numeric entry: third-party IMEs that ignore
`keyboardType="number-pad"`, layouts with no visible delete key, autocorrect
injecting characters into a PIN, and the keyboard resizing the screen mid-entry
on OEMs that ignore `windowSoftInputMode`. What you lay out is what every user
gets, on every device.

The trade-off is that SMS/OTP autofill no longer applies — see
[Paste key](#paste-key) for the replacement.

## Quick start

```tsx
const code = useNumericInput({
  length: 6,
  onComplete: (value) => void verify(value),
});

return (
  <View className="flex-1">
    <ScrollView className="flex-1">
      <CodeSlots value={code.value} length={6} error={Boolean(error)} />
    </ScrollView>

    <KeypadDock secure title="SmiPay Secure Keypad">
      <Keypad controller={code} disabled={busy} backspaceBehavior="clear" />
    </KeypadDock>
  </View>
);
```

Put `KeypadDock` as the **last flex child** of the screen, as a sibling of the
scroll view — not absolutely positioned. The dock then reserves its own space,
content above can never hide behind it, and its bottom padding follows the
safe-area inset (iPhone home indicator, Android gesture pill).

## Components

| Export | What it is |
| --- | --- |
| `Keypad` | The 3×4 key grid. |
| `KeypadDock` | Bottom container: surface, hairline, optional secure header, safe-area padding. |
| `CodeSlots` | OTP display — one slot per digit, blinking caret, error shake. |
| `PinDots` | Masked dot display for PIN entry. |
| `useNumericInput` | Owns the value: push / backspace / clear / complete. |
| `useKeypadMetrics` | The responsive sizing math, if you need it standalone. |
| `useKeypadColors` | The palette, if you're building a custom key. |
| `registerKeypadHaptics` | Swaps in a richer haptics backend. |

### `useNumericInput(options)`

| Option | Default | Notes |
| --- | --- | --- |
| `length` | – | Fixed length. Enables `isComplete` and `onComplete`. |
| `maxLength` | – | Cap for free-length entry (amounts). Ignored when `length` is set. |
| `onComplete` | – | Fires once, on the keystroke that fills the last slot. |
| `onChange` | – | Every value change. |
| `onOverflow` | – | A digit was pressed while already full. |
| `haptics` | `true` | Buzz on overflow. |

Returns `{ value, digits, isComplete, isEmpty, isFull, push, backspace, clear, setValue }`.

State is mirrored into a ref, so a burst of fast taps reads the true current
value instead of a batched, stale render value — the bug that shows up as "the
last digit sometimes doesn't register".

### `Keypad` props

| Prop | Default | Notes |
| --- | --- | --- |
| `controller` | – | A `useNumericInput` result. Handles digits/backspace/clear for you. |
| `onDigitPress` / `onBackspace` / `onClear` | – | Manual wiring; overrides the controller. |
| `leftKey` / `rightKey` | empty / backspace | Bottom-row cells. See [Custom keys](#custom-keys). |
| `layout` | – | Full manual grid; overrides `leftKey`/`rightKey` and `shuffle`. |
| `appearance` | `"tiles"` | `"flat"` drops the tile background (dialer look). |
| `shuffle` / `shuffleSeed` | `false` | Randomises digit positions for PIN entry. |
| `commitOn` | `"press-in"` | Press-in is what makes it feel instant. |
| `backspaceBehavior` | `"repeat"` | `"repeat"` holds to delete, `"clear"` holds to wipe, `"none"`. |
| `haptics` | `true` | |
| `colors` | theme | Partial `KeypadColors` override. |
| `scheme` | app theme | Pin to `"light"` / `"dark"`. |
| `metrics` | – | `KeypadMetricsOptions` — gaps, max width, height budget. |

### Custom keys

The bottom-left and bottom-right cells take any key definition:

```tsx
<Keypad
  controller={pin}
  leftKey={{
    type: "action",
    id: "biometrics",
    icon: <Ionicons name="scan-outline" size={26} color={colors.orange[500]} />,
    accessibilityLabel: "Unlock with Face ID",
    onPress: unlockWithBiometrics,
  }}
/>
```

`ghost: true` renders a label with no tile (a plain text button, like "Sign out").
`tint` overrides the label colour.

## Cross-platform behaviour

Everything below is handled by the package — you don't configure it.

- **Sizing is derived, not hard-coded.** Every dimension comes from the live
  window size, so the grid works from a 320 dp budget Android phone to a tablet
  in split-screen, and recomputes on rotation, fold, and multi-window resize.
  Key height is clamped against a share of the screen height (44% portrait), so
  a short screen can never let the keypad push the value display off-screen.
  A 44 dp minimum tap target is enforced at the bottom end.
- **Multi-touch double entry is blocked.** Two fingers landing on adjacent keys
  fire both `onPressIn` handlers. Only the first claim wins until it's released,
  the same as a real keyboard.
- **Digitizer bounce is debounced.** Cheap panels occasionally report one tap
  twice within a few milliseconds; commits under 40 ms apart are dropped.
- **Presses commit on press-in**, matching the iOS and Android system keyboards.
- **The highlight runs on the UI thread** via Reanimated, so it doesn't stutter
  behind a busy JS thread.
- **Android ripple is disabled on purpose.** The shared scale + tint animation
  gives every device identical feedback instead of a per-OEM ripple.
- **Font scaling is capped** at 1.15× on key glyphs, so a user with maximum
  system font size doesn't blow out the grid.
- **Touch targets extend into the gutters** by half the gap, so the space
  between keys isn't dead.
- **A stuck press self-heals.** A claim never released (component unmounted
  mid-press, gesture swallowed by a parent) expires after 1.5 s, so the keypad
  can't deadlock.

## Haptics

Android gets short vibration taps out of the box — the app already declares
`android.permission.VIBRATE`. iOS stays silent by default, because RN core's
`Vibration.vibrate()` there is a ~400 ms alert buzz, which is far too heavy for
a keypad.

To get Taptic Engine feedback on iOS, install `expo-haptics` and register it
once at app start (e.g. in `src/app/_layout.tsx`):

```ts
import * as Haptics from "expo-haptics";
import { registerKeypadHaptics } from "@/components/keypad";

registerKeypadHaptics((event) => {
  if (event === "reject") {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    return;
  }
  void Haptics.impactAsync(
    event === "delete"
      ? Haptics.ImpactFeedbackStyle.Medium
      : Haptics.ImpactFeedbackStyle.Light,
  );
});
```

That's the only change needed — every keypad in the app picks it up. Adding the
dependency requires a new native build; it will not take effect over OTA.

`setKeypadHapticsEnabled(false)` is a global kill switch, e.g. for a user
preference.

## Paste key

A custom keypad means the OS never sees a focused text field, so SMS/OTP
autofill doesn't fire. The replacement is an explicit paste key — see
`src/app/(app)/profile/phone-verification.tsx`:

```tsx
const [clipboardHasText, setClipboardHasText] = useState(false);
// Clipboard.hasStringAsync() never triggers the iOS paste prompt; only the
// read on tap does, and that one is user-initiated.
```

## Accessibility

Each key is a `button` with a spoken label; backspace announces "Delete digit"
(or "Delete digit. Hold to clear."). `CodeSlots` and `PinDots` announce
"N of M digits entered". Disabled keys report `accessibilityState.disabled`.

## Not to be confused with

`src/components/ui/numeric-keypad` is an older presentational grid that was
never wired to a screen. This package supersedes it.
