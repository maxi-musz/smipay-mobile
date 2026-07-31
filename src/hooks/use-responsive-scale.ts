import { useWindowDimensions } from "react-native";

/** Base width for scale = 1 (e.g. iPhone 13). */
export const BASE_WIDTH = 390;

/** Max scale cap so tablets don't get oversized UI. */
const MAX_SCALE = 1.25;
/**
 * Min scale so small / budget phones (e.g. 320–360 dp wide) shrink fonts and
 * spacing proportionally instead of rendering at full 390 dp size. Floored for
 * legibility. Phones at/above BASE_WIDTH are unaffected (their ratio is ≥ 1).
 */
const MIN_SCALE = 0.85;

/**
 * Returns a scale factor and helper to make sizes responsive to screen width.
 * Larger devices scale up (to MAX_SCALE); small devices scale down (to
 * MIN_SCALE) so a 320 dp Android doesn't get a UI sized for a 390 dp phone.
 */
export function useResponsiveScale() {
  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / BASE_WIDTH, MIN_SCALE), MAX_SCALE);
  /** Scale a pixel value (font size, padding, icon size, etc.). */
  const s = (n: number) => Math.round(n * scale);
  return { scale, s };
}
