export { Keypad, type KeypadProps } from "./keypad";
export { KeypadDock, type KeypadDockProps } from "./keypad-dock";
export { CodeSlots, type CodeSlotsProps } from "./code-slots";
export { PinDots, type PinDotsProps } from "./pin-dots";
export { SecureNumericField, type SecureNumericFieldProps } from "./secure-numeric-field";
export { useSecureKeypadOverlay } from "./use-secure-keypad-overlay";
export {
  useScrollFieldAboveKeypad,
  type UseScrollFieldAboveKeypadOptions,
} from "./use-scroll-field-above-keypad";

export {
  useNumericInput,
  type NumericInputController,
  type UseNumericInputOptions,
} from "./use-numeric-input";

export {
  useKeypadMetrics,
  type KeypadMetrics,
  type KeypadMetricsOptions,
} from "./use-keypad-metrics";

export {
  useKeypadColors,
  keypadPalettes,
  type KeypadColors,
  type KeypadColorOverrides,
} from "./keypad-theme";

export {
  keypadHaptic,
  registerKeypadHaptics,
  setKeypadHapticsEnabled,
  isKeypadHapticsEnabled,
} from "./keypad-haptics";

export type {
  KeypadAppearance,
  KeypadBackspaceBehavior,
  KeypadHapticAdapter,
  KeypadHapticEvent,
  KeypadKey,
  KeypadLayout,
} from "./types";
