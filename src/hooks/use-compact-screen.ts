import { useWindowDimensions } from "react-native";

/**
 * True on short / small screens — small Android phones, split-screen, landscape.
 *
 * Auth shells and the numeric keypad use this to shrink their chrome (brand,
 * title size, margins, key height) so on a compact device the keypad never
 * covers the primary action and the page fits without scrolling.
 *
 * `threshold` is the window-height (dp) below which we treat the screen as
 * compact; 740 catches the common 320–360 × 640 budget Androids while leaving
 * taller phones at full size. Also compact when the short edge is < 360 dp.
 */
export function useCompactScreen(threshold = 740): boolean {
  const { width, height } = useWindowDimensions();
  return Math.min(width, height) < 360 || height < threshold;
}
