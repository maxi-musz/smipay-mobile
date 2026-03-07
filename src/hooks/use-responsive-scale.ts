import { useWindowDimensions } from "react-native";

/** Base width for scale = 1 (e.g. iPhone 13). Larger screens scale up. */
export const BASE_WIDTH = 390;

/** Max scale cap so tablets don't get oversized UI. */
const MAX_SCALE = 1.25;

/**
 * Returns a scale factor and helper to make sizes responsive to screen width.
 * On larger devices (e.g. iPhone 15 Pro Max) scale > 1 so fonts and spacing grow.
 */
export function useResponsiveScale() {
  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / BASE_WIDTH, 1), MAX_SCALE);
  /** Scale a pixel value (font size, padding, icon size, etc.). */
  const s = (n: number) => Math.round(n * scale);
  return { scale, s };
}
