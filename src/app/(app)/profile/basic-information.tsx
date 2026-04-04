import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";

import { updateDisplayPicture } from "@/api";
import {
  ProfilePhotoPickMode,
  ProfilePhotoPreviewModal,
  ProfilePhotoSourceSheet,
} from "@/components/profile";
import { FullPageLoader } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import { formatTierRequirement } from "@/lib/format-tier-requirement";
import { ApiClientError } from "@/lib/api";
import {
  pickFromCamera,
  pickFromFile,
  pickFromLibrary,
  rejectIfProfileImageTooLarge,
  type PickedProfileImage,
} from "@/lib/pick-profile-image";
import { useHomepageStore, useProfileStore } from "@/store";

type Ion = React.ComponentProps<typeof Ionicons>["name"];

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString();
  } catch {
    return value;
  }
}

function IconField({
  icon,
  label,
  value,
  isDark,
}: {
  icon: Ion;
  label: string;
  value: string;
  isDark: boolean;
}) {
  return (
    <View
      className="flex-row items-start gap-3.5 rounded-2xl px-3.5 py-3.5"
      style={{
        backgroundColor: isDark ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.025)",
        borderWidth: 1,
        borderColor: isDark ? "rgba(148,163,184,0.1)" : "rgba(0,0,0,0.05)",
      }}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{
          backgroundColor: isDark ? "rgba(245,130,32,0.14)" : colors.orange[50],
        }}
      >
        <Ionicons name={icon} size={20} color={colors.orange[500]} />
      </View>
      <View className="min-w-0 flex-1 pt-0.5">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </Text>
        <Text className="mt-1.5 text-[15px] font-medium leading-[22px] text-foreground" numberOfLines={4}>
          {value || "—"}
        </Text>
      </View>
    </View>
  );
}

function WalletMetric({
  icon,
  label,
  value,
  isDark,
  accent,
}: {
  icon: Ion;
  label: string;
  value: string;
  isDark: boolean;
  accent: "orange" | "green" | "slate";
}) {
  const accentIcon =
    accent === "green"
      ? colors.green[500]
      : accent === "orange"
        ? colors.orange[500]
        : isDark
          ? "#94A3B8"
          : colors.gray[500];
  const iconBg =
    accent === "green"
      ? isDark
        ? "rgba(27,140,61,0.18)"
        : colors.green[50]
      : accent === "orange"
        ? isDark
          ? "rgba(245,130,32,0.14)"
          : colors.orange[50]
        : isDark
          ? "rgba(148,163,184,0.12)"
          : colors.gray[100];

  return (
    <View
      className="min-w-0 flex-1 rounded-2xl px-3 py-3.5"
      style={{
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FAFAFA",
        borderWidth: 1,
        borderColor: isDark ? "rgba(148,163,184,0.12)" : "rgba(0,0,0,0.06)",
      }}
    >
      <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: iconBg }}>
        <Ionicons name={icon} size={17} color={accentIcon} />
      </View>
      <Text
        className="mt-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground"
        numberOfLines={2}
      >
        {label}
      </Text>
      <Text className="mt-1 text-[14px] font-semibold leading-tight text-foreground" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function SectionShell({
  children,
  isDark,
  padded = true,
}: {
  children: React.ReactNode;
  isDark: boolean;
  padded?: boolean;
}) {
  return (
    <View
      className="overflow-hidden rounded-[22px]"
      style={{
        borderWidth: 1,
        borderColor: isDark ? "rgba(148,163,184,0.14)" : "rgba(0,0,0,0.07)",
        backgroundColor: isDark ? "#1A2332" : "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: isDark ? 0 : 10 },
        shadowOpacity: isDark ? 0 : 0.06,
        shadowRadius: isDark ? 0 : 20,
        elevation: isDark ? 0 : 3,
      }}
    >
      <View className={padded ? "p-5" : ""}>{children}</View>
    </View>
  );
}

function SectionTitleRow({
  icon,
  title,
  subtitle,
  isDark,
}: {
  icon: Ion;
  title: string;
  subtitle?: string;
  isDark: boolean;
}) {
  return (
    <View className="mb-5 flex-row items-start gap-3">
      <LinearGradient
        colors={
          isDark
            ? ["rgba(245,130,32,0.35)", "rgba(245,130,32,0.08)"]
            : [colors.orange[100], colors.orange[50]]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 14,
          padding: 10,
        }}
      >
        <Ionicons name={icon} size={22} color={colors.orange[600]} />
      </LinearGradient>
      <View className="min-w-0 flex-1 pt-0.5">
        <Text className="text-lg font-bold tracking-tight text-foreground">{title}</Text>
        {subtitle ? (
          <Text className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function BasicInformationScreen() {
  const { isDark } = useAppTheme();
  const profile = useProfileStore.use.data();
  const loading = useProfileStore.use.isLoading();
  const error = useProfileStore.use.error();
  const fetchProfile = useProfileStore.use.fetchProfile();
  const refreshHomepageSilently = useHomepageStore.use.refreshHomepageSilently();

  const [sourceSheetOpen, setSourceSheetOpen] = useState(false);
  const [previewPicked, setPreviewPicked] = useState<PickedProfileImage | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const bg = isDark ? "#080C14" : "#F4F6F9";

  useEffect(() => {
    if (!profile && !loading) {
      fetchProfile();
    }
  }, [profile, loading, fetchProfile]);

  const handlePhotoSource = useCallback((mode: ProfilePhotoPickMode) => {
    void (async () => {
      let picked: PickedProfileImage | null = null;
      if (mode === "camera") picked = await pickFromCamera();
      else if (mode === "library") picked = await pickFromLibrary();
      else picked = await pickFromFile();
      const ok = picked ? rejectIfProfileImageTooLarge(picked) : null;
      if (ok) {
        setPreviewPicked(ok);
        setUploadError(null);
      }
    })();
  }, []);

  const handleConfirmPhoto = useCallback(async () => {
    if (!previewPicked) return;
    setUploadingPhoto(true);
    setUploadError(null);
    try {
      await updateDisplayPicture(
        {
          uri: previewPicked.uri,
          name: previewPicked.fileName,
          type: previewPicked.mimeType,
        },
        previewPicked.fileSize,
      );
      setPreviewPicked(null);
      await Promise.all([fetchProfile(), refreshHomepageSilently()]);
      useToastStore.getState().show({
        variant: "success",
        title: "Profile photo updated",
        message: "Your new picture is live across SmiPay.",
      });
    } catch (e) {
      const msg =
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not upload your photo. Please try again.";
      setUploadError(msg);
    } finally {
      setUploadingPhoto(false);
    }
  }, [previewPicked, fetchProfile, refreshHomepageSilently]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: bg }}>
        {/* Ambient wash */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 280,
            opacity: isDark ? 0.55 : 0.9,
          }}
        >
          <LinearGradient
            colors={
              isDark
                ? ["rgba(245,130,32,0.12)", "rgba(124,58,237,0.06)", "transparent"]
                : [colors.orange[100], "#EEF2FF", "transparent"]
            }
            locations={[0, 0.45, 1]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>

        <View className="flex-row items-center justify-between px-5 pb-3 pt-14">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.85)",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
            }}
          >
            <Ionicons name="chevron-back" size={22} color={isDark ? "#F1F5F9" : "#0F172A"} />
          </Pressable>
          <View className="items-center">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Profile
            </Text>
            <Text className="mt-0.5 text-lg font-bold text-foreground">Account details</Text>
          </View>
          <View className="h-10 w-10" />
        </View>

        {loading && !profile ? (
          <FullPageLoader message="Loading..." />
        ) : (error && !profile) || !profile ? (
          <View className="flex-1 items-center justify-center px-8">
            <View
              className="mb-4 h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: isDark ? "rgba(245,130,32,0.12)" : colors.orange[50] }}
            >
              <Ionicons name="cloud-offline-outline" size={32} color={colors.orange[500]} />
            </View>
            <Text className="text-center text-base text-muted-foreground">
              {error ?? "Unable to load your profile."}
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pb-36 pt-2"
            showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <LinearGradient
              colors={
                isDark
                  ? ["#1E293B", "#162032", "#121a28"]
                  : ["#FFFFFF", "#F8FAFC", "#F1F5F9"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 26,
                padding: 1,
                marginBottom: 22,
              }}
            >
              <View
                style={{
                  borderRadius: 25,
                  overflow: "hidden",
                  backgroundColor: isDark ? "#151d2e" : "#FAFBFC",
                }}
              >
                <LinearGradient
                  colors={["rgba(245,130,32,0.15)", "transparent"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: 3, width: "100%" }}
                />
                <View className="items-center px-6 pb-7 pt-8">
                  <LinearGradient
                    colors={[colors.orange[400], colors.orange[700], "#9A3412"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: 999,
                      padding: 3,
                      marginBottom: 16,
                    }}
                  >
                    <Pressable
                      onPress={() => setSourceSheetOpen(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Change profile photo"
                      style={{ position: "relative" }}
                    >
                      <View
                        style={{
                          borderRadius: 999,
                          overflow: "hidden",
                          backgroundColor: isDark ? "#1E293B" : "#fff",
                          borderWidth: 3,
                          borderColor: isDark ? "#151d2e" : "#FAFBFC",
                        }}
                      >
                        {profile.user.profile_image ? (
                          <Image
                            source={{ uri: profile.user.profile_image }}
                            className="h-[88px] w-[88px]"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="h-[88px] w-[88px] items-center justify-center bg-primary/15">
                            <Text className="text-[28px] font-bold text-primary">
                              {(profile.user.first_name?.[0] ?? "") + (profile.user.last_name?.[0] ?? "")}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View
                        className="absolute -bottom-0.5 -right-0.5 h-[30px] w-[30px] items-center justify-center rounded-full border-2"
                        style={{
                          borderColor: isDark ? "#151d2e" : "#FAFBFC",
                          backgroundColor: colors.orange[500],
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.25,
                          shadowRadius: 3,
                          elevation: 4,
                        }}
                        pointerEvents="none"
                      >
                        <Ionicons name="camera" size={16} color="#FFFFFF" />
                      </View>
                    </Pressable>
                  </LinearGradient>

                  <View className="flex-row items-center gap-2">
                    <Text className="text-center text-[22px] font-bold tracking-tight text-foreground">
                      {profile.user.first_name} {profile.user.last_name}
                    </Text>
                    {profile.user.is_verified ? (
                      <View className="rounded-full bg-green-500/15 px-2 py-0.5">
                        <Ionicons name="checkmark-circle" size={16} color={colors.green[500]} />
                      </View>
                    ) : null}
                  </View>
                  {profile.user.email ? (
                    <Text className="mt-2 text-center text-[14px] text-muted-foreground">
                      {profile.user.email}
                    </Text>
                  ) : null}
                  {profile.user.joined ? (
                    <View className="mt-5 flex-row items-center gap-2 rounded-full border border-border/60 px-4 py-2">
                      <Ionicons name="calendar-outline" size={15} color={colors.orange[500]} />
                      <Text className="text-[12px] font-medium text-muted-foreground">
                        Member since{" "}
                        <Text className="font-semibold text-foreground">{profile.user.joined}</Text>
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </LinearGradient>

            {/* Personal details */}
            <View className="mb-6">
              <SectionShell isDark={isDark}>
                <SectionTitleRow
                  icon="person-outline"
                  title="Identity"
                  subtitle="How we reach you and verify your account"
                  isDark={isDark}
                />
                <View className="gap-3">
                  {profile.user.name ? (
                    <IconField icon="id-card-outline" label="Full name" value={profile.user.name} isDark={isDark} />
                  ) : null}
                  {profile.user.email ? (
                    <IconField icon="mail-outline" label="Email" value={profile.user.email} isDark={isDark} />
                  ) : null}
                  {profile.user.phone_number ? (
                    <IconField
                      icon="call-outline"
                      label="Phone"
                      value={profile.user.phone_number}
                      isDark={isDark}
                    />
                  ) : null}
                  {profile.user.gender ? (
                    <IconField icon="people-outline" label="Gender" value={profile.user.gender} isDark={isDark} />
                  ) : null}
                  {profile.user.date_of_birth ? (
                    <IconField
                      icon="gift-outline"
                      label="Date of birth"
                      value={formatDate(profile.user.date_of_birth)}
                      isDark={isDark}
                    />
                  ) : null}
                </View>
              </SectionShell>
            </View>

            {profile.address &&
              (() => {
                const { house_address, city, state, country, postal_code } = profile.address;
                const hasAny =
                  !!house_address || !!city || !!state || !!country || !!postal_code;
                if (!hasAny) return null;
                return (
                  <View className="mb-6">
                    <SectionShell isDark={isDark}>
                      <SectionTitleRow
                        icon="location-outline"
                        title="Address"
                        subtitle="Billing & delivery on file"
                        isDark={isDark}
                      />
                      <View className="gap-3">
                        {house_address ? (
                          <IconField icon="home-outline" label="Street" value={house_address} isDark={isDark} />
                        ) : null}
                        {city ? <IconField icon="business-outline" label="City" value={city} isDark={isDark} /> : null}
                        {state ? (
                          <IconField icon="map-outline" label="State" value={state} isDark={isDark} />
                        ) : null}
                        {country ? (
                          <IconField icon="earth-outline" label="Country" value={country} isDark={isDark} />
                        ) : null}
                        {postal_code ? (
                          <IconField icon="mail-unread-outline" label="Postal code" value={postal_code} isDark={isDark} />
                        ) : null}
                      </View>
                    </SectionShell>
                  </View>
                );
              })()}

            {profile.kyc_verification &&
              (() => {
                const { status, id_type } = profile.kyc_verification;
                const hasAny = !!status || !!id_type;
                if (!hasAny) return null;
                return (
                  <View className="mb-6">
                    <SectionShell isDark={isDark}>
                      <SectionTitleRow
                        icon="shield-checkmark-outline"
                        title="Verification"
                        subtitle="KYC status on your account"
                        isDark={isDark}
                      />
                      <View className="gap-3">
                        {status ? (
                          <IconField icon="ribbon-outline" label="Status" value={status} isDark={isDark} />
                        ) : null}
                        {id_type ? (
                          <IconField icon="document-text-outline" label="ID type" value={id_type} isDark={isDark} />
                        ) : null}
                      </View>
                    </SectionShell>
                  </View>
                );
              })()}

            {/* Wallet */}
            <View className="mb-6">
              <SectionShell isDark={isDark}>
                <SectionTitleRow
                  icon="wallet-outline"
                  title="Wallet"
                  subtitle="Balances & lifetime movement"
                  isDark={isDark}
                />
                <View className="flex-row gap-2.5">
                  <WalletMetric
                    icon="wallet-outline"
                    label="Available"
                    value={profile.wallet_card.current_balance}
                    isDark={isDark}
                    accent="orange"
                  />
                  <WalletMetric
                    icon="trending-up"
                    label="All-time funded"
                    value={profile.wallet_card.all_time_fuunding}
                    isDark={isDark}
                    accent="green"
                  />
                  <WalletMetric
                    icon="trending-down"
                    label="Withdrawn"
                    value={profile.wallet_card.all_time_withdrawn}
                    isDark={isDark}
                    accent="slate"
                  />
                </View>
              </SectionShell>
            </View>

            {/* Tier */}
            <LinearGradient
              colors={
                isDark
                  ? ["rgba(245,130,32,0.12)", "#1A2332", "#151d2e"]
                  : [colors.orange[50], "#FFFFFF", "#F8FAFC"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 22,
                padding: 1,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  borderRadius: 21,
                  overflow: "hidden",
                  backgroundColor: isDark ? "#1A2332" : "#FFFFFF",
                }}
              >
                <View className="p-5">
                  <View className="mb-4 flex-row items-start justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="text-2xl font-bold tracking-tight text-foreground">
                          {profile.current_tier.name}
                        </Text>
                        <View
                          className="rounded-full px-2.5 py-1"
                          style={{ backgroundColor: isDark ? "rgba(245,130,32,0.2)" : colors.orange[100] }}
                        >
                          <Text
                            className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: colors.orange[600] }}
                          >
                            Current tier
                          </Text>
                        </View>
                      </View>
                      {profile.current_tier.description ? (
                        <Text className="mt-2 text-[14px] leading-[22px] text-muted-foreground">
                          {profile.current_tier.description}
                        </Text>
                      ) : null}
                    </View>
                    <LinearGradient
                      colors={[colors.orange[500], "#EA580C"]}
                      style={{
                        borderRadius: 14,
                        padding: 10,
                      }}
                    >
                      <Ionicons name="ribbon" size={22} color="#fff" />
                    </LinearGradient>
                  </View>

                  {profile.current_tier.requirements?.length > 0 ? (
                    <View>
                      <Text className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        Requirements
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {profile.current_tier.requirements.map((r, i) => (
                          <View
                            key={`${r}-${i}`}
                            className="rounded-full border px-3.5 py-2"
                            style={{
                              borderColor: isDark ? "rgba(148,163,184,0.25)" : colors.gray[200],
                              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : colors.gray[50],
                            }}
                          >
                            <Text className="text-[13px] font-medium text-foreground">
                              {formatTierRequirement(r)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            </LinearGradient>
          </ScrollView>
        )}
      </View>

      <ProfilePhotoSourceSheet
        visible={sourceSheetOpen}
        onClose={() => setSourceSheetOpen(false)}
        onSelect={handlePhotoSource}
      />
      <ProfilePhotoPreviewModal
        visible={previewPicked !== null}
        imageUri={previewPicked?.uri ?? ""}
        onCancel={() => {
          if (!uploadingPhoto) {
            setPreviewPicked(null);
            setUploadError(null);
          }
        }}
        onConfirm={handleConfirmPhoto}
        isSubmitting={uploadingPhoto}
        errorText={uploadError}
      />
    </>
  );
}
