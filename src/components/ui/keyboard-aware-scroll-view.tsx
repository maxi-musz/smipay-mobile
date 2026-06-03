import { cssInterop } from "nativewind";
import {
  KeyboardAwareScrollView as KCScrollView,
  type KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";

/**
 * Drop-in replacement for `ScrollView` on screens with text inputs.
 *
 * Powered by react-native-keyboard-controller, it scrolls the focused field
 * just above the keyboard (consistently on iOS + Android) with a small,
 * centrally-tunable gap. NativeWind `className` / `contentContainerClassName`
 * keep working via the interop registration below, so swapping a screen's
 * `ScrollView` for this is just an import + tag-name change.
 */
const StyledKeyboardAwareScrollView = cssInterop(KCScrollView, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
}) as typeof KCScrollView;

export function KeyboardAwareScrollView(props: KeyboardAwareScrollViewProps) {
  return (
    <StyledKeyboardAwareScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      // Small gap between the focused input and the keyboard top. Tweak here to
      // adjust spacing for every purchase screen at once.
      bottomOffset={24}
      {...props}
    />
  );
}
