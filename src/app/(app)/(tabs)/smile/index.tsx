import { Redirect } from "expo-router";

/**
 * Legacy Smile tab route. Smile is no longer surfaced via the bottom tab
 * navigator — entry is the floating breathing orb on the Home screen
 * (`FloatingSmileButton`) and the in-flow `AskSmileCard` banner, both of
 * which push `/(app)/smileai`.
 *
 * This file is kept for deep-link safety so any stale internal links or
 * external push notifications targeting `(tabs)/smile` continue to resolve
 * to the Smile landing instead of 404'ing.
 */
export default function SmileTab() {
  return <Redirect href="/(app)/smileai" />;
}
