import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Keyboard, Pressable, View } from "react-native";
import { Link, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  startBvnRegistration,
  sendBvnRegOtp,
  verifyBvnRegOtp,
  completeBvnRegistration,
  requestEmailVerification,
  verifyEmailForRegistration,
  type StartBvnRegData,
  type VerifyBvnRegData,
} from "@/api";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  CodeSlots,
  Keypad,
  KeypadDock,
  useNumericInput,
  type KeypadKey,
} from "@/components/keypad";
import { LivenessCheck } from "@/components/liveness";
import { ArrowButton } from "@/components/ui/arrow-button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast";
import { colors } from "@/constants/colors";
import { ApiClientError } from "@/lib/api";
import { getDeviceId } from "@/lib/device";
import { formatCountdown } from "@/lib/format-countdown";
import { setAnalyticsUser } from "@/lib/analytics";
import {
  AUTH_OTP_DIGITS,
  AUTH_PASSWORD_DIGITS,
  isAuthPasswordValid,
} from "@/lib/auth-password";
import {
  clearBvnRegDraft,
  loadBvnRegDraft,
  saveBvnRegDraft,
} from "@/lib/bvn-reg-draft";
import { handleApiError } from "@/lib/errors/error-handler";
import { useOtpTimings } from "@/features/app-bootstrap";
import { useAuthStore } from "@/store";

const EMAIL_RE = /\S+@\S+\.\S+/;

const OTP_LENGTH = 6;
const BVN_LENGTH = 11;
const PIN_DIGITS = 4;

type Step = "bvn" | "review" | "otp" | "liveness" | "details";

const STEP_LABELS: Record<Step, string> = {
  bvn: "BVN",
  review: "Confirm",
  otp: "Verify",
  liveness: "Selfie",
  details: "Finish",
};

function retryAfterSeconds(e: unknown): number | undefined {
  if (e instanceof ApiClientError) {
    const n = e.data?.retry_after_seconds;
    if (typeof n === "number" && n > 0) return Math.ceil(n);
  }
  return undefined;
}

export function BvnLivenessSignUp() {
  const showToast = useToastStore((s) => s.show);
  const login = useAuthStore.use.login();
  const storeCredentials = useAuthStore.use.storeCredentials();
  const { resend_cooldown_seconds: otpResendCooldownSeconds } = useOtpTimings();

  const [step, setStep] = useState<Step>("bvn");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [needsLiveness, setNeedsLiveness] = useState(false);

  const [bvn, setBvn] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [identity, setIdentity] = useState<VerifyBvnRegData["identity"] | null>(null);

  const [email, setEmail] = useState("");
  const [emailStage, setEmailStage] = useState<
    "unverified" | "code_sent" | "verified"
  >("unverified");
  const [emailCode, setEmailCode] = useState("");
  const [emailBusy, setEmailBusy] = useState<"off" | "send" | "confirm">("off");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [agree, setAgree] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const cooldownEndsAtRef = useRef<number | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flag = (m: string) => {
    setError(m);
    setShakeKey((k) => k + 1);
  };

  const clearCooldownTimer = useCallback(() => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  }, []);

  const startCooldown = useCallback(
    (seconds?: number) => {
      const fallback =
        otpResendCooldownSeconds > 0 ? otpResendCooldownSeconds : 60;
      const total = seconds && seconds > 0 ? Math.ceil(seconds) : fallback;
      cooldownEndsAtRef.current = Date.now() + total * 1000;
      setCooldown(total);
      clearCooldownTimer();
      cooldownTimerRef.current = setInterval(() => {
        const ends = cooldownEndsAtRef.current;
        const left = ends ? Math.max(0, Math.ceil((ends - Date.now()) / 1000)) : 0;
        if (left <= 0) {
          clearCooldownTimer();
          cooldownEndsAtRef.current = null;
        }
        setCooldown(left);
      }, 1000);
    },
    [clearCooldownTimer, otpResendCooldownSeconds],
  );

  useEffect(() => clearCooldownTimer, [clearCooldownTimer]);

  const persistDraft = useCallback(
    (extra?: { email?: string; emailVerified?: boolean }) => {
      if (!sessionToken || !bvn) return;
      void saveBvnRegDraft({
        sessionToken,
        bvn: bvn.replace(/\D/g, ""),
        maskedPhone,
        email: extra?.email ?? email,
        emailVerified: extra?.emailVerified ?? emailStage === "verified",
      });
    },
    [sessionToken, bvn, maskedPhone, email, emailStage],
  );

  const otp = useNumericInput({
    length: OTP_LENGTH,
    onComplete: (v) => void handleVerify(v),
    onChange: () => error && setError(null),
  });

  const applyStart = useCallback(
    (data: StartBvnRegData) => {
      setSessionToken(data.session_token);
      setMaskedPhone(data.masked_phone);
      if (data.identity) setIdentity(data.identity);
      if (data.next_step === "details") {
        setNeedsLiveness(false);
        setStep("details");
      } else if (data.next_step === "liveness") {
        setNeedsLiveness(true);
        setStep("liveness");
      } else if (data.next_step === "otp") {
        setStep("otp");
      } else {
        setStep("review");
      }
    },
    [],
  );

  const handleStart = useCallback(async () => {
    if (busy) return;
    const digits = bvn.replace(/\D/g, "");
    if (digits.length !== BVN_LENGTH) return flag("Enter your 11-digit BVN.");
    setBusy(true);
    setError(null);
    try {
      const deviceId = await getDeviceId().catch(() => undefined);
      const res = await startBvnRegistration(digits, deviceId ?? undefined);
      if (res.success && res.data) {
        applyStart(res.data);
        void saveBvnRegDraft({
          sessionToken: res.data.session_token,
          bvn: digits,
          maskedPhone: res.data.masked_phone,
          email,
          emailVerified: emailStage === "verified",
        });
      } else {
        flag(res.message || "Could not check that BVN. Try again.");
      }
    } catch (e) {
      flag(
        e instanceof ApiClientError ? e.message : "Could not check that BVN. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }, [bvn, busy, applyStart, email, emailStage]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const draft = await loadBvnRegDraft();
      if (!draft || cancelled) return;
      setBvn(draft.bvn);
      setMaskedPhone(draft.maskedPhone);
      setSessionToken(draft.sessionToken);
      if (draft.email) setEmail(draft.email);
      if (draft.emailVerified) setEmailStage("verified");
      try {
        const deviceId = await getDeviceId().catch(() => undefined);
        const res = await startBvnRegistration(draft.bvn, deviceId ?? undefined);
        if (cancelled || !res.success || !res.data) return;
        applyStart(res.data);
        await saveBvnRegDraft({
          ...draft,
          sessionToken: res.data.session_token,
          maskedPhone: res.data.masked_phone,
        });
      } catch {
        /* keep draft; user can tap proceed */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyStart]);

  const handleSendOtp = useCallback(
    async (isResend = false) => {
      if (!sessionToken || busy || cooldown > 0) return;
      setBusy(true);
      setError(null);
      try {
        const res = await sendBvnRegOtp(sessionToken);
        if (res.success && res.data) {
          setMaskedPhone(res.data.masked_phone);
          otp.clear();
          startCooldown(res.data.resend_cooldown_seconds);
          setStep("otp");
          if (isResend) {
            showToast({
              variant: "success",
              title: "Code sent",
              message: `A new code is on its way to ${res.data.masked_phone}.`,
            });
          }
        } else {
          flag(res.message || "We couldn't send the code. Try again shortly.");
        }
      } catch (e) {
        startCooldown(retryAfterSeconds(e));
        flag(
          e instanceof ApiClientError
            ? e.message
            : "We couldn't send the code. Try again shortly.",
        );
      } finally {
        setBusy(false);
      }
    },
    [sessionToken, busy, cooldown, otp, startCooldown, showToast],
  );

  const handleVerify = useCallback(
    async (value: string) => {
      if (!sessionToken || busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await verifyBvnRegOtp(sessionToken, value);
        if (res.success && res.data) {
          setIdentity(res.data.identity);
          const liveness = res.data.next_step === "liveness";
          setNeedsLiveness(liveness);
          setStep(liveness ? "liveness" : "details");
          persistDraft();
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
    [sessionToken, busy, otp, persistDraft],
  );

  const restartFromLiveness = useCallback(
    (message: string) => {
      showToast({ variant: "error", title: message });
      setSessionToken(null);
      setIdentity(null);
      setNeedsLiveness(false);
      setMaskedPhone("");
      otp.clear();
      setError(null);
      setStep("bvn");
      void clearBvnRegDraft();
    },
    [otp, showToast],
  );

  const handleComplete = useCallback(async () => {
    if (!sessionToken || busy) return;
    if (!email.trim()) return flag("Enter your email.");
    if (emailStage !== "verified") return flag("Verify your email first.");
    if (!isAuthPasswordValid(password))
      return flag(`Login PIN must be exactly ${AUTH_PASSWORD_DIGITS} digits.`);
    if (!agree) return flag("Please accept the terms to continue.");
    setBusy(true);
    setError(null);
    try {
      const res = await completeBvnRegistration({
        session_token: sessionToken,
        email: email.trim().toLowerCase(),
        password,
        transaction_pin: pin.length === PIN_DIGITS ? pin : undefined,
        agree_to_terms: agree,
      });
      if (res.success && res.data) {
        await login(res.data.user, {
          accessToken: res.data.access_token,
          refreshToken: res.data.refresh_token,
        });
        await storeCredentials(email.trim().toLowerCase(), password);
        void setAnalyticsUser(res.data.user.id);
        await clearBvnRegDraft();
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
  }, [sessionToken, busy, email, emailStage, password, pin, agree, login, storeCredentials, showToast]);

  const handleSendEmailCode = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed) || emailBusy !== "off" || cooldown > 0) return;
    setEmailBusy("send");
    setError(null);
    try {
      const res = await requestEmailVerification(trimmed);
      if (res.data?.already_verified) {
        setEmailStage("verified");
        persistDraft({ email: trimmed, emailVerified: true });
        showToast({ variant: "success", title: "Email verified" });
        return;
      }
      setEmailCode("");
      setEmailStage("code_sent");
      startCooldown();
      persistDraft({ email: trimmed, emailVerified: false });
      showToast({
        variant: "success",
        title: "Code sent",
        message: `Check ${trimmed} for a 6-digit code.`,
      });
    } catch (e) {
      startCooldown(retryAfterSeconds(e));
      handleApiError(e);
    } finally {
      setEmailBusy("off");
    }
  }, [email, emailBusy, cooldown, persistDraft, startCooldown, showToast]);

  const handleConfirmEmailCode = useCallback(async () => {
    if (emailCode.length !== AUTH_OTP_DIGITS || emailBusy !== "off") return;
    setEmailBusy("confirm");
    setError(null);
    try {
      await verifyEmailForRegistration(email.trim().toLowerCase(), emailCode);
      setEmailStage("verified");
      persistDraft({ email: email.trim().toLowerCase(), emailVerified: true });
      showToast({ variant: "success", title: "Email verified" });
    } catch (e) {
      setEmailCode("");
      flag(e instanceof ApiClientError ? e.message : "That code didn't work.");
    } finally {
      setEmailBusy("off");
    }
  }, [email, emailCode, emailBusy, persistDraft, showToast]);

  const handleBack = useCallback(() => {
    if (busy) return;
    if (step === "review") {
      setSessionToken(null);
      setMaskedPhone("");
      setError(null);
      setStep("bvn");
      void clearBvnRegDraft();
      return;
    }
    if (step === "otp") {
      otp.clear();
      setError(null);
      setStep("review");
      return;
    }
    if (step === "liveness") {
      setSessionToken(null);
      setIdentity(null);
      setNeedsLiveness(false);
      setMaskedPhone("");
      otp.clear();
      setError(null);
      setStep("bvn");
      return;
    }
    router.back();
  }, [busy, step, otp]);

  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        if (step === "details") return true;
        handleBack();
        return true;
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", onHardwareBack);
      return () => sub.remove();
    }, [handleBack, step]),
  );

  const fullName = [identity?.first_name, identity?.last_name]
    .filter(Boolean)
    .join(" ");

  const flowSteps: Step[] = needsLiveness
    ? ["bvn", "review", "otp", "liveness", "details"]
    : ["bvn", "review", "otp", "details"];

  const title =
    step === "bvn"
      ? "Verify your BVN"
      : step === "review"
        ? "Confirm your number"
        : step === "otp"
          ? "Enter the code"
          : step === "liveness"
            ? "Quick face check"
            : "Almost done";

  const subtitle =
    step === "bvn"
      ? "We'll look up the phone number registered to your BVN."
      : step === "review"
        ? "This is the number on your BVN. Check it before we send your code."
        : step === "otp"
          ? `We sent a ${OTP_LENGTH}-digit code to ${maskedPhone}, the number on your BVN.`
          : step === "liveness"
            ? "One selfie confirms a real person is opening this account."
            : "Just your email and a login PIN to finish.";

  const canSubmitBvn = bvn.length === BVN_LENGTH && !busy;
  const canSubmitDetails =
    Boolean(email.trim()) &&
    emailStage === "verified" &&
    isAuthPasswordValid(password) &&
    agree &&
    !busy;

  const resendKey: KeypadKey = {
    type: "action",
    id: "resend",
    label: cooldown > 0 ? formatCountdown(cooldown) : "Resend",
    ghost: true,
    disabled: cooldown > 0 || busy,
    accessibilityLabel:
      cooldown > 0
        ? `Resend available in ${formatCountdown(cooldown)}`
        : "Resend verification code",
    onPress: () => void handleSendOtp(true),
  };

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      onBack={step === "details" ? undefined : handleBack}
      backDisabled={busy}
      showVersion={step === "bvn"}
      footer={
        step === "details" ? (
          <View className="gap-2">
            {error ? (
              <Text className="text-sm font-medium text-destructive">{error}</Text>
            ) : null}
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 pr-4 text-sm text-muted-foreground">
                Create your SmiPay account
              </Text>
              <ArrowButton
                label="Create account"
                onPress={() => void handleComplete()}
                disabled={!canSubmitDetails}
                loading={busy}
                accessibilityLabel="Create account"
                testID="bvn-sign-up-submit"
              />
            </View>
          </View>
        ) : undefined
      }
      bottom={
        step === "otp" ? (
          <KeypadDock secure title="SmiPay Secure Keypad">
            <Keypad
              controller={otp}
              disabled={busy}
              leftKey={resendKey}
              backspaceBehavior="clear"
            />
          </KeypadDock>
        ) : undefined
      }
    >
      <StepProgress steps={flowSteps} current={step} />

      {step === "bvn" ? (
        <View className="mt-8">
          <Input
            label="Bank Verification Number"
            placeholder="12345678901"
            value={bvn}
            onChangeText={(t) => {
              setBvn(t.replace(/\D/g, "").slice(0, BVN_LENGTH));
              if (error) setError(null);
            }}
            error={error ?? undefined}
            keyboardType="number-pad"
            maxLength={BVN_LENGTH}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={canSubmitBvn ? () => void handleStart() : undefined}
          />
          {!error ? (
            <Text className="mt-1.5 text-xs text-muted-foreground">
              Don&apos;t know your BVN? Dial *565*0# on your registered line.
            </Text>
          ) : null}

          <View className="mt-7 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1">
              <Text className="text-sm text-muted-foreground">Have an account?</Text>
              <Link href="/(auth)/sign-in" asChild>
                <Text className="text-sm font-semibold text-primary">Sign in</Text>
              </Link>
            </View>

            <ArrowButton
              onPress={() => void handleStart()}
              disabled={!canSubmitBvn}
              loading={busy}
              accessibilityLabel="Look up BVN"
              testID="bvn-sign-up-lookup"
            />
          </View>
        </View>
      ) : step === "review" ? (
        <View className="mt-8">
          <View className="rounded-2xl border border-border bg-muted/30 p-4">
            <View className="flex-row items-center gap-1.5">
              <Ionicons
                name="shield-checkmark"
                size={15}
                color={colors.orange[500]}
              />
              <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                BVN confirmed
              </Text>
            </View>

            <Text className="mt-4 text-xs text-muted-foreground">
              Phone number registered to this BVN
            </Text>
            <Text className="mt-1 text-2xl font-semibold tracking-wider">
              {maskedPhone}
            </Text>

            <Text className="mt-4 text-xs leading-5 text-muted-foreground">
              We&apos;ll text a {OTP_LENGTH}-digit code to this number. If you no longer
              use it, update it at your bank before continuing.
            </Text>
          </View>

          {error ? (
            <Text className="mt-4 text-sm font-medium text-destructive">{error}</Text>
          ) : null}

          <View className="mt-7 flex-row items-center justify-between">
            <Pressable onPress={handleBack} hitSlop={8} className="active:opacity-70">
              <Text className="text-sm text-muted-foreground">Use a different BVN</Text>
            </Pressable>

            <ArrowButton
              label="Send code"
              onPress={() => void handleSendOtp()}
              disabled={busy || cooldown > 0}
              loading={busy}
              accessibilityLabel="Send verification code"
              testID="bvn-sign-up-send-code"
            />
          </View>

          {cooldown > 0 ? (
            <Text className="mt-3 text-right text-xs text-muted-foreground">
              You can request another code in {formatCountdown(cooldown)}
            </Text>
          ) : null}
        </View>
      ) : step === "otp" ? (
        <View className="mt-8">
          <CodeSlots
            value={otp.value}
            length={OTP_LENGTH}
            variant="underline"
            focused={!busy}
            error={Boolean(error)}
            shakeKey={shakeKey}
            slotHeight={54}
            accessibilityLabel="BVN verification code"
          />

          {error ? (
            <Text className="mt-4 text-sm font-medium text-destructive">{error}</Text>
          ) : null}

          <View className="mt-7 flex-row items-center justify-between">
            <Text className="flex-1 pr-4 text-sm text-muted-foreground">
              Didn&apos;t get it?{" "}
              <Text
                className={
                  cooldown > 0
                    ? "text-sm text-muted-foreground"
                    : "text-sm font-semibold text-primary"
                }
                onPress={cooldown > 0 ? undefined : () => void handleSendOtp(true)}
              >
                {cooldown > 0
                  ? `Resend in ${formatCountdown(cooldown)}`
                  : "Resend code"}
              </Text>
            </Text>

            <ArrowButton
              onPress={() => void handleVerify(otp.value)}
              disabled={otp.value.length !== OTP_LENGTH || busy}
              loading={busy}
              accessibilityLabel="Verify code"
              testID="bvn-sign-up-verify"
            />
          </View>
        </View>
      ) : step === "liveness" && sessionToken ? (
        <View className="mt-6">
          <LivenessCheck
            sessionToken={sessionToken}
            bvn={bvn.replace(/\D/g, "")}
            fullName={fullName}
            hideHeading
            onPassed={() => setStep("details")}
            onRestart={restartFromLiveness}
          />
        </View>
      ) : (
        <View className="mt-6 gap-5">
          {fullName ? (
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              Opening as{" "}
              <Text className="font-medium text-foreground">{fullName}</Text>
            </Text>
          ) : null}

          <View>
            <Input
              label="Email address"
              placeholder="you@example.com"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (error) setError(null);
                if (emailStage !== "unverified") {
                  setEmailStage("unverified");
                  setEmailCode("");
                }
              }}
              editable={emailStage !== "verified"}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="done"
              onSubmitEditing={() => void handleSendEmailCode()}
            />
            <View className="mt-2 flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-xs text-muted-foreground">
                {emailBusy === "send"
                  ? "Sending your code. This can take a few seconds."
                  : emailStage === "verified"
                    ? "This email is verified."
                    : emailStage === "code_sent"
                      ? "Enter the 6-digit code we sent."
                      : "We'll send a code to confirm this address."}
              </Text>
              {emailStage === "verified" ? (
                <View className="flex-row items-center gap-1">
                  <Ionicons
                    name="checkmark-circle"
                    size={15}
                    color={colors.orange[500]}
                  />
                  <Text className="text-xs font-semibold text-primary">Verified</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => void handleSendEmailCode()}
                  disabled={
                    emailBusy !== "off" || cooldown > 0 || !EMAIL_RE.test(email.trim())
                  }
                  accessibilityRole="button"
                  accessibilityLabel={
                    emailStage === "code_sent" ? "Resend email code" : "Send email code"
                  }
                  className="min-w-[72px] flex-row items-center justify-center gap-1.5 py-1"
                >
                  {emailBusy === "send" ? (
                    <ActivityIndicator size="small" color={colors.orange[500]} />
                  ) : null}
                  <Text
                    className={`text-xs font-semibold ${
                      emailBusy !== "off" || cooldown > 0 || !EMAIL_RE.test(email.trim())
                        ? "text-muted-foreground"
                        : "text-primary"
                    }`}
                  >
                    {emailBusy === "send"
                      ? "Sending…"
                      : cooldown > 0
                        ? formatCountdown(cooldown)
                        : emailStage === "code_sent"
                          ? "Resend"
                          : "Send code"}
                  </Text>
                </Pressable>
              )}
            </View>
            {emailStage === "code_sent" ? (
              <View className="mt-4">
                <Input
                  label="Email code"
                  placeholder={`${AUTH_OTP_DIGITS}-digit code`}
                  value={emailCode}
                  onChangeText={(v) =>
                    setEmailCode(v.replace(/\D/g, "").slice(0, AUTH_OTP_DIGITS))
                  }
                  keyboardType="number-pad"
                  maxLength={AUTH_OTP_DIGITS}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleConfirmEmailCode()}
                />
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-xs text-muted-foreground">
                    {emailBusy === "confirm" ? "Checking the code…" : "From the email we just sent."}
                  </Text>
                  <Pressable
                    onPress={() => void handleConfirmEmailCode()}
                    disabled={emailCode.length !== AUTH_OTP_DIGITS || emailBusy !== "off"}
                    accessibilityRole="button"
                    accessibilityLabel="Confirm email code"
                    className="min-w-[72px] flex-row items-center justify-center gap-1.5 py-1"
                  >
                    {emailBusy === "confirm" ? (
                      <ActivityIndicator size="small" color={colors.orange[500]} />
                    ) : null}
                    <Text
                      className={`text-xs font-semibold ${
                        emailCode.length !== AUTH_OTP_DIGITS || emailBusy !== "off"
                          ? "text-muted-foreground"
                          : "text-primary"
                      }`}
                    >
                      {emailBusy === "confirm" ? "Checking…" : "Confirm"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>

          {emailStage === "verified" ? (
            <>
              <Input
                label="Login PIN"
                placeholder={`${AUTH_PASSWORD_DIGITS} digits`}
                value={password}
                onChangeText={(v) => {
                  setPassword(v.replace(/\D/g, "").slice(0, AUTH_PASSWORD_DIGITS));
                  if (error) setError(null);
                }}
                secureTextEntry
                toggleable
                keyboardType="number-pad"
                maxLength={AUTH_PASSWORD_DIGITS}
                returnKeyType="done"
                blurOnSubmit
              />

              <View>
                <Input
                  label="Transaction PIN (optional)"
                  placeholder={`${PIN_DIGITS} digits`}
                  value={pin}
                  onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, PIN_DIGITS))}
                  keyboardType="number-pad"
                  maxLength={PIN_DIGITS}
                  secureTextEntry
                  toggleable
                  returnKeyType="done"
                  blurOnSubmit
                />
                <Text className="mt-1.5 text-xs text-muted-foreground">
                  For payments. You can set this later in Settings.
                </Text>
              </View>

              <Pressable
                className="flex-row items-start gap-3"
                onPress={() => {
                  Keyboard.dismiss();
                  setAgree((a) => !a);
                  if (error) setError(null);
                }}
              >
                <Checkbox checked={agree} />
                <Text className="flex-1 text-sm text-muted-foreground">
                  I agree to the <Text className="text-sm text-primary">Terms of Service</Text> and{" "}
                  <Text className="text-sm text-primary">Privacy Policy</Text>
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      )}
    </AuthShell>
  );
}

function StepProgress({ steps, current }: { steps: Step[]; current: Step }) {
  const currentIdx = steps.indexOf(current);

  return (
    <View className="mt-6 flex-row items-center gap-2">
      {steps.map((s, i) => {
        const active = i === currentIdx;
        const done = i < currentIdx;
        return (
          <View key={s} className="flex-row items-center gap-2">
            <View
              className={`h-1.5 rounded-full ${
                active ? "w-6 bg-primary" : done ? "w-4 bg-primary/50" : "w-4 bg-muted"
              }`}
            />
            {active ? (
              <Text className="text-xs font-medium text-muted-foreground">
                {STEP_LABELS[s]}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View
      className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
        checked ? "border-primary bg-primary" : "border-input bg-background"
      }`}
    >
      {checked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
    </View>
  );
}
