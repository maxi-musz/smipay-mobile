import { Platform, Vibration } from "react-native";

import type { KeypadHapticAdapter, KeypadHapticEvent } from "./types";

/**
 * Android exposes a real short-vibration primitive through RN core, and the app
 * already declares `android.permission.VIBRATE`, so key taps feel right out of
 * the box. iOS's `Vibration.vibrate()` is a ~400 ms alert buzz — far too heavy
 * for a keypad — so we stay silent there until a better adapter is registered.
 *
 * To get Taptic Engine feedback on iOS, install `expo-haptics` and register it
 * once at app start (see this folder's README):
 *
 *   registerKeypadHaptics((event) => {
 *     if (event === "reject") {
 *       void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
 *       return;
 *     }
 *     void Haptics.impactAsync(
 *       event === "delete"
 *         ? Haptics.ImpactFeedbackStyle.Medium
 *         : Haptics.ImpactFeedbackStyle.Light,
 *     );
 *   });
 */
const defaultAdapter: KeypadHapticAdapter = (event) => {
  if (Platform.OS !== "android") return;
  switch (event) {
    case "key":
      Vibration.vibrate(8);
      return;
    case "delete":
      Vibration.vibrate(12);
      return;
    case "reject":
      // Distinct double-tick so "you can't type more" is felt, not just seen.
      Vibration.vibrate([0, 16, 70, 16]);
      return;
  }
};

let adapter: KeypadHapticAdapter = defaultAdapter;
let enabled = true;

/**
 * Swap in a richer haptics implementation (e.g. `expo-haptics`). Pass `null` to
 * restore the built-in adapter. Safe to call at any time.
 */
export function registerKeypadHaptics(next: KeypadHapticAdapter | null): void {
  adapter = next ?? defaultAdapter;
}

/** Global kill switch — e.g. wire this to a user preference. */
export function setKeypadHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function isKeypadHapticsEnabled(): boolean {
  return enabled;
}

/**
 * Fire feedback for a keypad event. Never throws: a device with vibration
 * disabled (or a permission-stripped OEM ROM) must not break key entry.
 */
export function keypadHaptic(event: KeypadHapticEvent): void {
  if (!enabled) return;
  try {
    adapter(event);
  } catch {
    // Haptics are decoration — swallow anything the platform throws.
  }
}
