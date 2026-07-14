import Constants from "expo-constants";
import * as Application from "expo-application";

/**
 * Short marketing-style app version for auth footers, e.g. `"2.6.0"` → `"v2.6"`.
 * Prefer Expo config version; fall back to the native binary version.
 */
export function getAppVersionLabel(): string {
  const raw =
    Constants.expoConfig?.version ??
    Application.nativeApplicationVersion ??
    "";
  const short = raw.split(".").slice(0, 2).join(".");
  return short ? `v${short}` : "";
}
