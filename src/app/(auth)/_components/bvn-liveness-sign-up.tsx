import { useCallback, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import {
  startBvnRegistration,
  verifyBvnRegOtp,
  completeBvnRegistration,
  type VerifyBvnRegData,
} from "@/api";
import { CodeSlots, Keypad, KeypadDock, useNumericInput } from "@/components/keypad";
import { LivenessCheck } from "@/components/liveness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import { ApiClientError } from "@/lib/api";
import { getDeviceId } from "@/lib/device";
import { setAnalyticsUser } from "@/lib/analytics";
import { useAuthStore } from "@/store";

const OTP_LENGTH = 6;
type Step = "bvn" | "otp" | "liveness" | "details";

export function BvnLivenessSignUp() {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.show);
  const login = useAuthStore.use.login();
  const storeCredentials = useAuthStore.use.storeCredentials();

  const subtle = isDark ? "#94A3B8" : "#6B7280";
  const border = "#CBD5E1";

  const [step, setStep] = useState<Step>("bvn");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const [bvn, setBvn] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [identity, setIdentity] = useState<VerifyBvnRegData["identity"] | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [agree, setAgree] = useState(false);

  const flag = (m: string) => {
    setError(m);
    setShakeKey((k) => k + 1);
  };

  const otp = useNumericInput({
    length: OTP_LENGTH,
    onComplete: (v) => void handleVerify(v),
    onChange: () => error && setError(null),
  });

  const handleStart = useCallback(async () => {
    if (busy) return;
    const digits = bvn.replace(/\D/g, "");
    if (digits.length !== 11) return flag("Enter your 11-digit BVN.");
    setBusy(true);
    setError(null);
    try {
      const deviceId = await getDeviceId().catch(() => undefined);
      const res = await startBvnRegistration(digits, deviceId ?? undefined);
      if (res.success && res.data) {
        setSessionToken(res.data.session_token);
        setMaskedPhone(res.data.masked_phone);
        otp.clear();
        setStep("otp");
      } else {
        flag(res.message || "Could not start. Try again.");
      }
    } catch (e) {
      flag(e instanceof ApiClientError ? e.message : "Could not start. Try again.");
    } finally {
      setBusy(false);
    }
  }, [bvn, busy, otp]);

  const handleVerify = useCallback(
    async (value: string) => {
      if (!sessionToken || busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await verifyBvnRegOtp(sessionToken, value);
        if (res.success && res.data) {
          setIdentity(res.data.identity);
          setStep(res.data.next_step === "liveness" ? "liveness" : "details");
        } else {
          otp.clear();
          flag(res.message || "Invalid or expired code.");
        }
      } catch (e) {
        otp.clear();
        flag(e instanceof ApiClientError ? e.message : "Invalid or expired code.");
      } finally {
        setBusy(false);
      }
    },
    [sessionToken, busy, otp],
  );

  /** Sends the user back to step 1 when a session can no longer be salvaged. */
  const restartFromLiveness = useCallback(
    (message: string) => {
      showToast({ variant: "error", title: message });
      setSessionToken(null);
      setIdentity(null);
      otp.clear();
      setStep("bvn");
    },
    [otp, showToast],
  );

  const handleComplete = useCallback(async () => {
    if (!sessionToken || busy) return;
    if (!email.trim()) return flag("Enter your email.");
    if (password.length < 6) return flag("Password must be at least 6 characters.");
    if (!agree) return flag("Please accept the terms to continue.");
    setBusy(true);
    setError(null);
    try {
      const res = await completeBvnRegistration({
        session_token: sessionToken,
        email: email.trim().toLowerCase(),
        password,
        transaction_pin: pin.length === 4 ? pin : undefined,
        agree_to_terms: agree,
      });
      if (res.success && res.data) {
        await login(res.data.user, {
          accessToken: res.data.access_token,
          refreshToken: res.data.refresh_token,
        });
        await storeCredentials(email.trim().toLowerCase(), password);
        void setAnalyticsUser(res.data.user.id);
        showToast({ variant: "success", title: "Welcome to SmiPay" });
        router.replace("/(app)/(tabs)");
      } else {
        flag(res.message || "Could not complete registration.");
      }
    } catch (e) {
      flag(e instanceof ApiClientError ? e.message : "Could not complete registration.");
    } finally {
      setBusy(false);
    }
  }, [sessionToken, busy, email, password, pin, agree, login, storeCredentials, showToast]);

  const fullName = [identity?.first_name, identity?.last_name]
    .filter(Boolean)
    .join(" ");
  const showKeypad = step === "otp";

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingBottom: showKeypad ? 24 : Math.max(insets.bottom, 24) + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} hitSlop={8} className="mb-4">
          <Ionicons name="chevron-back" size={24} color={isDark ? "#E2E8F0" : "#0F172A"} />
        </Pressable>

        {step === "bvn" && (
          <Animated.View entering={FadeInDown.duration(200)}>
            <Text className="text-2xl font-bold text-foreground">Verify your BVN</Text>
            <Text className="mt-2 text-sm leading-5" style={{ color: subtle }}>
              Enter your 11-digit BVN. We&apos;ll send a code to the phone number
              registered to it.
            </Text>
            <TextInput
              value={bvn}
              onChangeText={(t) => {
                setBvn(t.replace(/\D/g, "").slice(0, 11));
                error && setError(null);
              }}
              keyboardType="number-pad"
              maxLength={11}
              placeholder="12345678901"
              placeholderTextColor={subtle}
              className="mt-8 border-b pb-3 text-lg font-medium tracking-[2px] text-foreground"
              style={{ borderColor: error ? "#DC2626" : border }}
            />
            {error ? (
              <Text className="mt-3 text-xs" style={{ color: "#DC2626" }}>{error}</Text>
            ) : null}
            <Button className="mt-8" disabled={busy || bvn.length !== 11} onPress={() => void handleStart()}>
              {busy ? <Spinner size="small" color="#fff" /> : <Text className="font-semibold text-white">Send code</Text>}
            </Button>
          </Animated.View>
        )}

        {step === "otp" && (
          <Animated.View entering={FadeInDown.duration(200)}>
            <Text className="text-2xl font-bold text-foreground">Enter the code</Text>
            <Text className="mt-2 text-sm leading-5" style={{ color: subtle }}>
              We sent a 6-digit code to {maskedPhone}, the number on your BVN.
            </Text>
            <View className="mt-8">
              <CodeSlots
                value={otp.value}
                length={OTP_LENGTH}
                variant="underline"
                focused={!busy}
                error={Boolean(error)}
                shakeKey={shakeKey}
                slotHeight={52}
                accessibilityLabel="BVN code"
              />
            </View>
            {error ? (
              <Text className="mt-4 text-xs" style={{ color: "#DC2626" }}>{error}</Text>
            ) : null}
          </Animated.View>
        )}

        {step === "liveness" && sessionToken && (
          <Animated.View entering={FadeInDown.duration(200)}>
            {/*
              Rendered only because the server answered `next_step: "liveness"`.
              When an admin turns the selfie check off, this branch never runs
              and the user goes straight from the OTP to their details — no app
              release needed.
            */}
            <LivenessCheck
              sessionToken={sessionToken}
              bvn={bvn.replace(/\D/g, "")}
              isDark={isDark}
              fullName={fullName}
              onPassed={() => setStep("details")}
              onRestart={restartFromLiveness}
            />
          </Animated.View>
        )}

        {step === "details" && (
          <Animated.View entering={FadeInDown.duration(200)}>
            <Text className="text-2xl font-bold text-foreground">Almost done</Text>
            {fullName ? (
              <View className="mt-4 rounded-xl p-3" style={{ backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }}>
                <Text className="text-xs" style={{ color: subtle }}>Verified identity</Text>
                <Text className="mt-0.5 text-base font-semibold text-foreground">{fullName}</Text>
              </View>
            ) : null}
            <Text className="mt-6 text-sm" style={{ color: subtle }}>
              Just your email and a password to finish.
            </Text>

            <View className="mt-4 gap-3">
              <Input
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                placeholder="Password (min 6 characters)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <Input
                placeholder="4-digit transaction PIN (optional)"
                value={pin}
                onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />
            </View>

            <Pressable onPress={() => setAgree((a) => !a)} className="mt-4 flex-row items-center gap-2">
              <View
                className="h-5 w-5 items-center justify-center rounded border"
                style={{ borderColor: agree ? colors.orange[500] : border, backgroundColor: agree ? colors.orange[500] : "transparent" }}
              >
                {agree ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              </View>
              <Text className="flex-1 text-xs" style={{ color: subtle }}>
                I agree to the Terms of Service and Privacy Policy.
              </Text>
            </Pressable>

            {error ? (
              <Text className="mt-3 text-xs" style={{ color: "#DC2626" }}>{error}</Text>
            ) : null}

            <Button className="mt-6" disabled={busy} onPress={() => void handleComplete()}>
              {busy ? <Spinner size="small" color="#fff" /> : <Text className="font-semibold text-white">Create account</Text>}
            </Button>
          </Animated.View>
        )}
      </ScrollView>

      {showKeypad ? (
        <KeypadDock secure title="SmiPay Secure Keypad">
          <Keypad controller={otp} disabled={busy} backspaceBehavior="clear" />
        </KeypadDock>
      ) : null}
    </View>
  );
}
