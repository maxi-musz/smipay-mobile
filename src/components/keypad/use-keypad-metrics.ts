import { useMemo } from "react";
import { PixelRatio, useWindowDimensions } from "react-native";

export interface KeypadMetricsOptions {
  columns?: number;
  rows?: number;
  /** Gap between keys, in dp. */
  gap?: number;
  /** Horizontal padding inside the keypad. */
  paddingHorizontal?: number;
  /** Grid never grows past this — keeps tablets and foldables sane. */
  maxWidth?: number;
  /** Minimum tap target height (accessibility floor). */
  minKeyHeight?: number;
  maxKeyHeight?: number;
  /**
   * Share of the window height the grid may occupy. This is the guard that
   * keeps the keypad from eating a short Android screen.
   */
  maxHeightRatio?: number;
  /** Preferred key height as a fraction of key width. */
  aspect?: number;
}

export interface KeypadMetrics {
  columns: number;
  rows: number;
  gap: number;
  paddingHorizontal: number;
  /** Width of the grid including padding — use for `width` + `alignSelf`. */
  width: number;
  keyWidth: number;
  keyHeight: number;
  /** Total height of the key grid (excludes dock chrome). */
  gridHeight: number;
  digitFontSize: number;
  labelFontSize: number;
  iconSize: number;
  radius: number;
  /** True on short/narrow screens — callers can drop optional chrome. */
  isCompact: boolean;
  isLandscape: boolean;
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

/** Snap to the device pixel grid so tiles don't show hairline seams. */
const px = (n: number) => PixelRatio.roundToNearestPixel(n);

/**
 * Derives every keypad dimension from the live window size.
 *
 * Nothing here is hard-coded to a device: the grid is sized from the available
 * width, then clamped against a share of the available height, so it stays
 * usable from a 320 dp Android budget phone up to a tablet in split-screen,
 * and re-computes on rotation, fold, and multi-window resize.
 */
export function useKeypadMetrics(
  options: KeypadMetricsOptions = {},
): KeypadMetrics {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const {
    columns = 3,
    rows = 4,
    maxWidth = 480,
    minKeyHeight = 44,
  } = options;

  const isLandscape = windowWidth > windowHeight;
  const isCompact = Math.min(windowWidth, windowHeight) < 360 || windowHeight < 740;
  // Even shorter phones (≈ ≤ 600 dp tall) need the tightest grid.
  const isTiny = windowHeight < 620;

  const gap = options.gap ?? (isCompact ? (isTiny ? 6 : 7) : 9);
  const paddingHorizontal = options.paddingHorizontal ?? (isCompact ? 12 : 16);
  const maxHeightRatio =
    options.maxHeightRatio ??
    (isLandscape ? 0.62 : isTiny ? 0.4 : isCompact ? 0.42 : 0.44);
  // Cap key height harder on short screens so four rows plus the value display
  // and the primary button all fit above the fold without scrolling.
  const maxKeyHeight = options.maxKeyHeight ?? (isTiny ? 50 : isCompact ? 56 : 68);
  const aspect = options.aspect ?? (isCompact ? 0.52 : 0.6);

  return useMemo<KeypadMetrics>(() => {
    const width = Math.min(windowWidth, maxWidth);
    const contentWidth = Math.max(width - paddingHorizontal * 2, columns * 40);
    // Floored, never rounded up: a row of fixed-width keys that totals even a
    // fraction of a dp more than its container overflows (RN children don't
    // shrink by default). `space-between` absorbs the ≤2 dp remainder.
    const keyWidth = Math.floor((contentWidth - gap * (columns - 1)) / columns);

    // Preferred height from the key's aspect, then trimmed to the vertical
    // budget so a tall grid can never push the value display off-screen.
    const heightBudget = windowHeight * maxHeightRatio;
    const maxByBudget = (heightBudget - gap * (rows - 1)) / rows;
    const keyHeight = Math.max(
      minKeyHeight,
      Math.min(keyWidth * aspect, maxByBudget, maxKeyHeight),
    );

    const digitFontSize = clamp(Math.round(keyHeight * 0.42), 18, 26);

    return {
      columns,
      rows,
      gap: px(gap),
      paddingHorizontal: px(paddingHorizontal),
      width: px(width),
      keyWidth,
      keyHeight: px(keyHeight),
      gridHeight: px(keyHeight * rows + gap * (rows - 1)),
      digitFontSize,
      labelFontSize: clamp(Math.round(keyHeight * 0.26), 12, 16),
      iconSize: clamp(Math.round(keyHeight * 0.4), 18, 26),
      radius: clamp(Math.round(keyHeight * 0.28), 10, 18),
      isCompact,
      isLandscape,
    };
  }, [
    windowWidth,
    windowHeight,
    columns,
    rows,
    gap,
    paddingHorizontal,
    maxWidth,
    minKeyHeight,
    maxKeyHeight,
    maxHeightRatio,
    aspect,
    isCompact,
    isLandscape,
  ]);
}
