import { Redirect } from "expo-router";

/**
 * Smile tab — actual launch is handled by the `tabPress` listener in the
 * parent `(tabs)/_layout.tsx`, which pushes `/(app)/smileai/chat/new`
 * onto the parent stack (so the chat opens *outside* the tab navigator
 * and the bottom tab bar is hidden, matching the home banner flow).
 *
 * This file only renders if someone navigates to the route directly
 * (e.g. via deep link), in which case we redirect to a fresh chat.
 */
export default function SmileTab() {
  return <Redirect href="/(app)/smileai/chat/new" />;
}
