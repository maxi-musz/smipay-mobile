import {
  KeyboardAwareScrollView as KCScrollView,
  type KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";
import { cssInterop } from "nativewind";

const KeyboardAwareScrollViewBase = cssInterop(KCScrollView, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
});

export function KeyboardAwareScrollView(props: KeyboardAwareScrollViewProps) {
  const { bottomOffset = 24, ...rest } = props;

  return (
    <KeyboardAwareScrollViewBase
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bottomOffset={bottomOffset}
      {...rest}
    />
  );
}
