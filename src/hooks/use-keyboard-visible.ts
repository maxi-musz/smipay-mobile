import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * True while the soft keyboard is visible. Uses will-* on iOS for earlier updates when
 * pairing with KeyboardAvoidingView / layout switches.
 */
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
