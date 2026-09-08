import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { fetchBvnStatus, requestBvnOtp, verifyBvnOtp } from "@/api";
import {
  CodeSlots,
  Keypad,
  KeypadDock,
  useNumericInput,
} from "@/components/keypad";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import { ApiClientError } from "@/lib/api";
import { formatCountdown } from "@/lib/format-countdown";
import type {
  BvnVerificationStatusData,
  RequestBvnOtpData,
} from "@/types/bvn-verification";

const OTP_LENGTH = 6;

type Step = "loading" | "enter_bvn" | "enter_otp" | "verified" | "disabled";

export default function BvnVerificationScreen() {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.show);

  const bg = isDark ? "#020617" : "#F8FAFC";
  const subtleText = isDark ? "#94A3B8" : "#6B7280";

  const [step, setStep] = useState<Step>("loading");
  const [status, setStatus] = useState<BvnVerificationStatusData | null>(null);
  const [bvn, setBvn] = useState("");
  const [otpMeta, setOtpMeta] = useState<RequestBvnOtpData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorShakeKey, setErrorShakeKey] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    tick.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, []);

  const cooldownLeft = cooldownUntil
    ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
    : 0;
  const lockLeft = lockedUntil
    ? Math.max(0, Math.ceil((lockedUntil - now) / 1000))
    : 0;

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetchBvnStatus();
      const data = res.data;
      if (!res.success || !data) {
        setStep("disabled");
        return;
      }
      setStatus(data);
      if (data.locked_seconds_left > 0) {
        setLockedUntil(Date.now() + data.locked_seconds_left * 1000);
      }
      if (!data.enabled) setStep("disabled");
      else if (data.is_verified) setStep("verified");
      else setStep("enter_bvn");
    } catch {
      setStep("disabled");
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const flagError = useCallback((message: string) => {
    setError(message);
    setErrorShakeKey((k) => k + 1);
  }, []);

  const otp = useNumericInput({
    length: OTP_LENGTH,
    onComplete: (value) => void handleVerify(value),
    onChange: () => {
      if (error) setError(null);
    },
  });

  const handleRequest = useCallback(async () => {
    if (requesting) return;
    if (lockLeft > 0) {
      flagError(
        `Too many failed attempts. Try again in ${formatCountdown(lockLeft)}.`,
      );
      return;
    }
    const digits = bvn.replace(/\D/g, "");
    if (digits.length !== 11) {
      flagError("Enter your 11-digit BVN.");
      return;
    }
    setRequesting(true);
    setError(null);
    try {
      const res = await requestBvnOtp(digits);
      if (res.success && res.data) {
        setOtpMeta(res.data);
        setCooldownUntil(Date.now() + res.data.resend_cooldown_seconds * 1000);
        otp.clear();
        setStep("enter_otp");
      } else {
        flagError(res.message || "Could not send the code. Try again.");
      }
    } catch (e) {
      flagError(
        e instanceof ApiClientError
          ? e.message
          : "Could not send the code. Try again.",
      );
    } finally {
      setRequesting(false);
    }
  }, [bvn, requesting, flagError, otp, lockLeft]);

  const handleVerify = useCallback(
    async (value: string) => {
      if (verifying) return;
      setVerifying(true);
      setError(null);
      try {
        const res = await verifyBvnOtp(value);
        if (res.success && res.data?.is_verified) {
          showToast({
            variant: "success",
            title: "BVN verified",
            message: res.data.phone_updated
              ? "Your SmiPay number was updated to match your BVN."
              : undefined,
          });
          setStatus((s) =>
            s ? { ...s, is_verified: true, status: "verified" } : s,
          );
          setStep("verified");
        } else {
          otp.clear();
          flagError(res.message || "Invalid or expired code.");
        }
      } catch (e) {
        otp.clear();
        flagError(
          e instanceof ApiClientError ? e.message : "Invalid or expired code.",
        );
      } finally {
        setVerifying(false);
      }
    },
    [verifying, showToast, otp, flagError],
  );

  const headerRight = useCallback(
    function HeaderClose() {
      return (
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons
            name="close"
            size={24}
            color={isDark ? "#E2E8F0" : "#0F172A"}
          />
        </Pressable>
      );
    },
    [isDark],
  );

  const showKeypad = step === "enter_otp";

  return (
    <View className="flex-1" style={{ backgroundColor: bg }}>
      <Stack.Screen
        options={{
          title: "BVN Verification",
          headerRight,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 24,
          paddingBottom: showKeypad ? 24 : Math.max(insets.bottom, 24) + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Ionicons name="finger-print" size={26} color={colors.orange[500]} />
        </View>

        {step === "loading" && (
          <View className="mt-16 items-center">
            <Spinner />
          </View>
        )}

        {step === "disabled" && (
          <Animated.View entering={FadeInDown.duration(200)} className="mt-4">
            <Text className="text-xl font-semibold text-foreground">
              Not available
            </Text>
            <Text className="mt-2 text-sm leading-5" style={{ color: subtleText }}>
              BVN verification isn&apos;t available right now. Please check back
              later.
            </Text>
            <Button className="mt-8" onPress={() => router.back()}>
              <Text className="font-semibold text-white">Go back</Text>
            </Button>
          </Animated.View>
        )}

        {step === "verified" && (
          <Animated.View entering={FadeInDown.duration(200)} className="mt-4">
            <Text className="text-xl font-semibold text-foreground">
              BVN verified
            </Text>
            <Text className="mt-2 text-sm leading-5" style={{ color: subtleText }}>
              Your BVN
              {status?.bvn_last4 ? ` ending ${status.bvn_last4}` : ""} is
              verified. You&apos;re all set.
            </Text>
            <Button className="mt-8" onPress={() => router.back()}>
              <Text className="font-semibold text-white">Done</Text>
            </Button>
          </Animated.View>
        )}

        {step === "enter_bvn" && (
          <Animated.View entering={FadeInDown.duration(200)} className="mt-4">
            <Text className="text-xl font-semibold text-foreground">
              Verify your BVN
            </Text>
            <Text className="mt-2 text-sm leading-5" style={{ color: subtleText }}>
              Enter your 11-digit Bank Verification Number. We&apos;ll send a
              code to the phone number registered to it.
            </Text>

            <TextInput
              value={bvn}
              onChangeText={(t) => {
                setBvn(t.replace(/\D/g, "").slice(0, 11));
                if (error) setError(null);
              }}
              keyboardType="number-pad"
              maxLength={11}
              placeholder="12345678901"
              placeholderTextColor={subtleText}
              className="mt-8 border-b pb-3 text-lg font-medium tracking-[2px] text-foreground"
              style={{ borderColor: error ? "#DC2626" : "#CBD5E1" }}
            />
            {status?.max_bvn_attempts ? (
              <Text className="mt-2 text-xs" style={{ color: subtleText }}>
                Attempts used: {status.bvn_attempts_used} /{" "}
                {status.max_bvn_attempts}
              </Text>
            ) : null}

            {error ? (
              <Text className="mt-3 text-xs" style={{ color: "#DC2626" }}>
                {error}
              </Text>
            ) : null}

            {lockLeft > 0 ? (
              <View
                className="mt-6 rounded-xl p-3"
                style={{ backgroundColor: isDark ? "#3F1D1D" : "#FEF2F2" }}
              >
                <Text className="text-xs" style={{ color: "#DC2626" }}>
                  BVN verification is locked after repeated failed attempts. Try
                  again in {formatCountdown(lockLeft)}.
                </Text>
              </View>
            ) : null}
            <Button
              className="mt-8"
              disabled={requesting || bvn.length !== 11 || lockLeft > 0}
              onPress={() => void handleRequest()}
            >
              {requesting ? (
                <Spinner size="small" color="#fff" />
              ) : (
                <Text className="font-semibold text-white">Send code</Text>
              )}
            </Button>
          </Animated.View>
        )}

        {step === "enter_otp" && otpMeta && (
          <Animated.View entering={FadeInDown.duration(220)} className="mt-4">
            <Text className="text-xl font-semibold text-foreground">
              Enter the code
            </Text>
            <Text className="mt-2 text-sm leading-5" style={{ color: subtleText }}>
              We sent a 6-digit code to {otpMeta.masked_phone}, the number on
              your BVN.
            </Text>

            {otpMeta.will_update_phone ? (
              <View
                className="mt-4 flex-row items-start gap-2 rounded-xl p-3"
                style={{ backgroundColor: isDark ? "#1E293B" : "#FEF3C7" }}
              >
                <Ionicons
                  name="information-circle"
                  size={18}
                  color={colors.orange[500]}
                />
                <Text
                  className="flex-1 text-xs leading-5"
                  style={{ color: isDark ? "#FCD34D" : "#92400E" }}
                >
                  This number is different from your current SmiPay number.
                  Confirming this code will set it as your SmiPay number.
                </Text>
              </View>
            ) : null}

            <View className="mt-8">
              <CodeSlots
                value={otp.value}
                length={OTP_LENGTH}
                variant="underline"
                focused={!verifying}
                error={Boolean(error)}
                shakeKey={errorShakeKey}
                slotHeight={52}
                accessibilityLabel="BVN verification code"
              />
            </View>

            {error ? (
              <Text className="mt-4 text-xs" style={{ color: "#DC2626" }}>
                {error}
              </Text>
            ) : null}

            <View className="mt-5 flex-row items-center justify-between">
              {verifying ? (
                <View className="flex-row items-center gap-1.5">
                  <Spinner size="small" color={colors.orange[500]} />
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: colors.orange[500] }}
                  >
                    Verifying…
                  </Text>
                </View>
              ) : (
                <View />
              )}

              <Pressable
                onPress={() => void handleRequest()}
                disabled={requesting || cooldownLeft > 0}
                hitSlop={8}
                className="active:opacity-70"
              >
                <Text
                  className="text-xs font-semibold"
                  style={{
                    color:
                      cooldownLeft > 0 ? subtleText : colors.orange[500],
                  }}
                >
                  {cooldownLeft > 0
                    ? `Resend in ${formatCountdown(cooldownLeft)}`
                    : "Resend code"}
                </Text>
              </Pressable>
            </View>

            <Pressable
              className="mt-8 active:opacity-70"
              onPress={() => {
                setStep("enter_bvn");
                setError(null);
                otp.clear();
              }}
            >
              <Text className="text-center text-xs" style={{ color: subtleText }}>
                Wrong BVN? Go back
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      {showKeypad ? (
        <KeypadDock secure title="SmiPay Secure Keypad">
          <Keypad controller={otp} disabled={verifying} backspaceBehavior="clear" />
        </KeypadDock>
      ) : null}
    </View>
  );
}
