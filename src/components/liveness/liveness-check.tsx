import { useCallback, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { submitBvnLiveness } from "@/api";
import { ArrowButton } from "@/components/ui/arrow-button";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { ApiClientError } from "@/lib/api";
import { captureSelfie } from "./capture-selfie";

/**
 * The selfie step of BVN registration, as one drop-in component.
 *
 * It renders only when the SERVER asked for it (`next_step === "liveness"`).
 * When an admin turns the selfie check off, this component is simply never
 * mounted — the app needs no release and no flag of its own.
 */

/** Server ceiling is admin-tunable; this is a safe client-side pre-check. */
const MAX_BYTES = 4 * 1024 * 1024;

type Phase = "intro" | "working" | "error";

export type LivenessCheckProps = {
  sessionToken: string;
  /**
   * The BVN this registration started with. Face-match modes need it so the
   * provider can pull the reference photo; the server re-hashes it against the
   * session, so it can never point the check at a different identity.
   */
  bvn: string;
  /** Name from the verified BVN, used to make the ask feel personal. */
  fullName?: string | null;
  /** Set when the host screen already renders a title for this step. */
  hideHeading?: boolean;
  /** Called once the server confirms the check passed. */
  onPassed: () => void;
  /**
   * Called when the session can no longer be salvaged — attempts exhausted, or
   * the BVN no longer matches. The screen should send the user back to step 1.
   */
  onRestart: (message: string) => void;
};

/** Failures that no amount of retrying will fix. */
const FATAL_CODES = new Set([
  "liveness_attempts_exhausted",
  "liveness_bvn_mismatch",
  "liveness_bvn_required",
]);

const TIPS = [
  "Find good, even light — avoid backlight",
  "Hold the phone at eye level, face in frame",
  "No hats, sunglasses or face coverings",
  "Be on your own — one face only",
];

export function LivenessCheck({
  sessionToken,
  bvn,
  fullName,
  hideHeading = false,
  onPassed,
  onRestart,
}: LivenessCheckProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [permissionBlocked, setPermissionBlocked] = useState(false);

  const run = useCallback(async () => {
    if (phase === "working") return;
    setError(null);
    setPermissionBlocked(false);
    setPhase("working");

    const shot = await captureSelfie(MAX_BYTES);

    if (shot.status === "cancelled") return setPhase("intro");
    if (shot.status === "denied") {
      setPermissionBlocked(true);
      setError(
        "SmiPay needs camera access to confirm it's you. Enable it in Settings, then try again.",
      );
      return setPhase("error");
    }
    if (shot.status === "too_large") {
      setError("That photo was too large. Please take it again.");
      return setPhase("error");
    }
    if (shot.status === "failed") {
      setError("We couldn't open the camera. Please try again.");
      return setPhase("error");
    }

    try {
      const res = await submitBvnLiveness(sessionToken, shot.selfie.base64, bvn);
      if (res.success) return onPassed();
      setError(res.message || "That didn't work. Please try again.");
      setPhase("error");
    } catch (e) {
      if (e instanceof ApiClientError) {
        const body = (e.data ?? {}) as {
          code?: string;
          attempts_remaining?: number | null;
        };
        if (body.code && FATAL_CODES.has(body.code)) {
          return onRestart(e.message);
        }
        setRemaining(
          typeof body.attempts_remaining === "number"
            ? body.attempts_remaining
            : null,
        );
        setError(e.message || "That didn't work. Please try again.");
      } else {
        setError("That didn't work. Please try again.");
      }
      setPhase("error");
    }
  }, [phase, sessionToken, bvn, onPassed, onRestart]);

  const working = phase === "working";

  return (
    <View>
      {hideHeading ? null : (
        <>
          <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Ionicons name="scan-outline" size={28} color={colors.orange[500]} />
          </View>
          <Text className="mt-5 text-[22px] font-bold text-foreground">
            Quick face check
          </Text>
        </>
      )}

      {fullName ? (
        <Text className="text-[15px] leading-6 text-muted-foreground">
          Confirming it&apos;s really you, {fullName}.
        </Text>
      ) : null}

      <View className="mt-5 gap-2.5 rounded-xl border border-border bg-muted/40 p-4">
        {TIPS.map((tip) => (
          <View key={tip} className="flex-row items-center gap-2">
            <Ionicons
              name="checkmark-circle"
              size={15}
              color={colors.orange[500]}
            />
            <Text className="flex-1 text-[13px] leading-5 text-muted-foreground">
              {tip}
            </Text>
          </View>
        ))}
      </View>

      {error ? (
        <Text className="mt-4 text-sm font-medium text-destructive">
          {error}
          {remaining != null && remaining > 0
            ? ` ${remaining} ${remaining === 1 ? "try" : "tries"} left.`
            : ""}
        </Text>
      ) : null}

      {permissionBlocked ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Settings"
          onPress={() => void Linking.openSettings()}
          hitSlop={8}
          className="mt-3 active:opacity-70"
        >
          <Text className="text-sm font-semibold text-primary">
            Open Settings
          </Text>
        </Pressable>
      ) : null}

      <View className="mt-7 flex-row items-center justify-between">
        <Text className="flex-1 pr-4 text-xs leading-5 text-muted-foreground">
          Your photo is used once to verify you and is never stored on SmiPay.
        </Text>
        <ArrowButton
          label={phase === "error" ? "Try again" : "Take selfie"}
          onPress={() => void run()}
          disabled={working}
          loading={working}
          accessibilityLabel={phase === "error" ? "Try again" : "Take selfie"}
          testID="liveness-capture"
        />
      </View>
    </View>
  );
}
