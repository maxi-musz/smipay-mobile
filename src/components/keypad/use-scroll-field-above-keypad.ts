import { useCallback, useEffect, useRef, type RefObject } from "react";
import { Dimensions, type ScrollView, type View } from "react-native";

const FIELD_CLEARANCE = 12;

export interface UseScrollFieldAboveKeypadOptions {
  active: boolean;
  scrollRef: RefObject<ScrollView | null>;
  fieldRef: RefObject<View | null>;
  keypadBlockHeight: number;
  /** Re-measure after padding / sibling layout changes settle. */
  layoutRevision?: unknown;
}

/**
 * Scrolls only when the active field would sit under an overlaid keypad.
 * If the field is already visible above the keys, the scroll position is left alone.
 */
export function useScrollFieldAboveKeypad({
  active,
  scrollRef,
  fieldRef,
  keypadBlockHeight,
  layoutRevision,
}: UseScrollFieldAboveKeypadOptions) {
  const scrollYRef = useRef(0);

  const onScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      scrollYRef.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  useEffect(() => {
    if (!active || keypadBlockHeight <= 0) return;

    const timer = setTimeout(() => {
      const field = fieldRef.current;
      const scroll = scrollRef.current;
      if (!field || !scroll) return;

      field.measureInWindow((_x, y, _width, height) => {
        const windowHeight = Dimensions.get("window").height;
        const keypadTop = windowHeight - keypadBlockHeight;
        const fieldBottom = y + height;

        if (fieldBottom + FIELD_CLEARANCE <= keypadTop) {
          return;
        }

        const overlap = fieldBottom + FIELD_CLEARANCE - keypadTop;
        scroll.scrollTo({
          y: scrollYRef.current + overlap,
          animated: true,
        });
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [active, fieldRef, keypadBlockHeight, layoutRevision, scrollRef]);

  return { onScroll };
}
