import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { submitBvnLiveness } from "@/api";
import { ApiClientError } from "@/lib/api";
import { captureSelfie } from "./capture-selfie";

/**
 * The selfie step of BVN registration, as one drop-in component.
 *
 * Self-contained on purpose: plain React Native styles, no design-system
 * imports, no NativeWind. Drop it into a screen, give it a session and a BVN,
 * and it owns capture → submit → the retry conversation. Delete the folder and
 * nothing else breaks.
 *
 * It renders only when the SERVER asked for it (`next_step === "liveness"`).
 * When an admin turns the selfie check off, this component is simply never
 * mounted — the app needs no release and no flag of its own.
 */

/** Server ceiling is admin-tunable; this is a safe client-side pre-check. */
const MAX_BYTES = 4 * 1024 * 1024;

const ACCENT = "#F4831F";
const DANGER = "#DC2626";

type Phase = "intro" | "working" | "error";

export type LivenessCheckProps = {
  sessionToken: string;
  /**
   * The BVN this registration started with. Face-match modes need it so the
   * provider can pull the reference photo; the server re-hashes it against the
   * session, so it can never point the check at a different identity.
   */
  bvn: string;
  isDark?: boolean;
  /** Name from the verified BVN, used to make the ask feel personal. */
  fullName?: string | null;
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

export function LivenessCheck({
  sessionToken,
  bvn,
  isDark = false,
  fullName,
  onPassed,
  onRestart,
}: LivenessCheckProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [permissionBlocked, setPermissionBlocked] = useState(false);

  const subtle = isDark ? "#94A3B8" : "#6B7280";
  const cardBg = isDark ? "#1E293B" : "#F1F5F9";
  const fg = isDark ? "#F8FAFC" : "#0F172A";

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
        setError(e.message);
      } else {
        setError("That didn't work. Please try again.");
      }
      setPhase("error");
    }
  }, [phase, sessionToken, bvn, onPassed, onRestart]);

  const working = phase === "working";

  return (
    <View>
      <View style={styles.center}>
        <View style={[styles.badge, { backgroundColor: `${ACCENT}1A` }]}>
          <Ionicons name="scan-outline" size={30} color={ACCENT} />
        </View>
      </View>

      <Text style={[styles.title, { color: fg }]}>Quick face check</Text>

      {fullName ? (
        <Text style={[styles.lead, { color: subtle }]}>
          Confirming it&apos;s really you, {fullName}.
        </Text>
      ) : null}

      <Text style={[styles.lead, { color: subtle }]}>
        Take a selfie so we can confirm a real person is opening this account —
        and that it&apos;s the person this BVN belongs to.
      </Text>

      <View style={[styles.tips, { backgroundColor: cardBg }]}>
        <Tip color={subtle} text="Find good, even light — avoid backlight" />
        <Tip color={subtle} text="Hold the phone at eye level, face in frame" />
        <Tip color={subtle} text="No hats, sunglasses or face coverings" />
        <Tip color={subtle} text="Be on your own — one face only" />
      </View>

      {error ? (
        <Text style={styles.error}>
          {error}
          {remaining != null && remaining > 0
            ? ` ${remaining} ${remaining === 1 ? "try" : "tries"} left.`
            : ""}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={phase === "error" ? "Try again" : "Take selfie"}
        disabled={working}
        onPress={() => void run()}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: ACCENT, opacity: working ? 0.6 : pressed ? 0.85 : 1 },
        ]}
      >
        {working ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {phase === "error" ? "Try again" : "Take selfie"}
          </Text>
        )}
      </Pressable>

      {permissionBlocked ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void Linking.openSettings()}
          style={styles.linkButton}
        >
          <Text style={[styles.linkText, { color: ACCENT }]}>Open Settings</Text>
        </Pressable>
      ) : null}

      <Text style={[styles.footnote, { color: subtle }]}>
        Your photo is used once to verify you and is never stored on SmiPay.
      </Text>
    </View>
  );
}

function Tip({ text, color }: { text: string; color: string }) {
  return (
    <View style={styles.tipRow}>
      <Ionicons name="checkmark-circle" size={15} color={ACCENT} />
      <Text style={[styles.tipText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  badge: {
    height: 64,
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 32,
  },
  title: {
    marginTop: 24,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
  },
  lead: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  tips: { marginTop: 20, borderRadius: 12, padding: 14, gap: 9 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18 },
  error: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 17,
    color: DANGER,
  },
  button: {
    marginTop: 24,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  linkButton: { marginTop: 12, alignItems: "center", paddingVertical: 8 },
  linkText: { fontSize: 14, fontWeight: "600" },
  footnote: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16,
  },
});
