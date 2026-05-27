import { Redirect } from "expo-router";

/** Smile tab — conversations list lives at `/smileai`. */
export default function SmileTab() {
  return <Redirect href="/(app)/smileai" />;
}
