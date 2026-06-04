import { ScrollView, type ScrollViewProps } from "react-native";
import { cssInterop } from "nativewind";

let KCScrollView: typeof ScrollView | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("react-native-keyboard-controller");
  if (mod?.KeyboardAwareScrollView) {
    KCScrollView = cssInterop(mod.KeyboardAwareScrollView, {
      className: "style",
      contentContainerClassName: "contentContainerStyle",
    }) as typeof ScrollView;
  }
} catch {
  // Native module not linked yet — fall back to plain ScrollView.
}

const StyledScrollView = cssInterop(ScrollView, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
}) as typeof ScrollView;

const BaseComponent = KCScrollView ?? StyledScrollView;

export function KeyboardAwareScrollView(props: ScrollViewProps & { bottomOffset?: number }) {
  const { bottomOffset: _bottomOffset, ...rest } = props;

  return (
    <BaseComponent
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...(KCScrollView ? { bottomOffset: _bottomOffset ?? 24 } : {})}
      {...rest}
    />
  );
}
