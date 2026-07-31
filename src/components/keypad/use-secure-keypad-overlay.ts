import { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCompactScreen } from "@/hooks/use-compact-screen";

import { useKeypadMetrics, type KeypadMetricsOptions } from "./use-keypad-metrics";

/** Dock header (secure label + Done) excluding the key grid. */
const DOCK_CHROME_COMPACT = 36;
const DOCK_CHROME_DEFAULT = 44;

/**
 * Height of an overlaid `KeypadDock`. Extra bottom padding is optional — use it
 * only when the active field may need room to scroll above the keys.
 */
export function useSecureKeypadOverlay(
  active: boolean,
  reserveScrollRoom = true,
) {
  const compact = useCompactScreen();
  const insets = useSafeAreaInsets();

  const metricsOptions = useMemo<KeypadMetricsOptions>(
    () =>
      compact
        ? { maxHeightRatio: 0.34, maxKeyHeight: 46, gap: 6, paddingHorizontal: 12 }
        : {},
    [compact],
  );

  const metrics = useKeypadMetrics(metricsOptions);

  const blockHeight = useMemo(() => {
    const chrome = compact ? DOCK_CHROME_COMPACT : DOCK_CHROME_DEFAULT;
    return metrics.gridHeight + chrome + Math.max(insets.bottom, compact ? 6 : 10);
  }, [compact, insets.bottom, metrics.gridHeight]);

  const scrollPaddingBottom =
    active && reserveScrollRoom ? blockHeight + 20 : 16;

  return { compact, metricsOptions, blockHeight, scrollPaddingBottom };
}
