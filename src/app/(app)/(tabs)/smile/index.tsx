import { Redirect } from "expo-router";

/**
 * Smile tab — actual launch is handled by the `tabPress` listener in the
 * parent `(tabs)/_layout.tsx`, which pushes `/(app)/smileai` onto the
 * parent stack (the landing screen where the user can start a new chat
 * or resume a non-closed one). That keeps the chat surface *outside* the
 * tab navigator so the bottom tab bar is hidden during a chat, matching
 * the home banner flow.
 *
 * This file only renders if someone navigates to the route directly
 * (e.g. via deep link); we redirect to the landing in that case.
 */
export default function SmileTab() {
  return <Redirect href="/(app)/smileai" />;
}
