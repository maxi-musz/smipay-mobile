import { useEffect } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";

import { FullPageLoader } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useProfileStore } from "@/store";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString();
  } catch {
    return value;
  }
}

function Section({
  title,
  children,
  cardBg,
}: {
  title: string;
  children: React.ReactNode;
  cardBg: string;
}) {
  return (
    <View className="mt-4 overflow-hidden rounded-2xl" style={{ backgroundColor: cardBg }}>
      <Text className="px-4 pt-4 text-sm font-semibold text-muted-foreground">
        {title}
      </Text>
      <View className="px-4 pb-4 pt-2">{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3 flex-row border-b border-border/50 pb-2 last:mb-0 last:border-b-0 last:pb-0">
      <Text className="w-36 text-sm text-muted-foreground">{label}</Text>
      <Text className="flex-1 text-sm text-foreground" numberOfLines={2}>
        {value || "—"}
      </Text>
    </View>
  );
}

export default function BasicInformationScreen() {
  const { isDark } = useAppTheme();
  const profile = useProfileStore.use.data();
  const loading = useProfileStore.use.isLoading();
  const error = useProfileStore.use.error();
  const fetchProfile = useProfileStore.use.fetchProfile();

  const bg = isDark ? "#0F172A" : "#F8F9FB";
  const cardBg = isDark ? "#1E293B" : "#F5F6F8";

  useEffect(() => {
    if (!profile && !loading) {
      // Use cached profile data when available; otherwise fetch once via zustand store.
      fetchProfile();
    }
  }, [profile, loading, fetchProfile]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: bg }}>
        <View className="flex-row items-center justify-between px-5 pb-3 pt-14">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6" }}
          >
            <Ionicons name="chevron-back" size={20} color={isDark ? "#E5E7EB" : "#111827"} />
          </Pressable>
          <Text className="text-base font-semibold text-foreground">
            Basic Information
          </Text>
          <View className="h-9 w-9" />
        </View>

        {loading && !profile ? (
          <FullPageLoader message="Loading..." />
        ) : (error && !profile) || !profile ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-muted-foreground">
              {error ?? "Unable to load your profile."}
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pb-24"
            showsVerticalScrollIndicator={false}
          >
            <Section title="Personal" cardBg={cardBg}>
              <View className="mb-3 flex-row items-center">
                {profile.user.profile_image ? (
                  <Image
                    source={{ uri: profile.user.profile_image }}
                    className="h-14 w-14 rounded-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/20">
                    <Text className="text-lg font-semibold text-primary">
                      {(profile.user.first_name?.[0] ?? "") + (profile.user.last_name?.[0] ?? "")}
                    </Text>
                  </View>
                )}
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    {profile.user.first_name} {profile.user.last_name}
                  </Text>
                  {profile.user.email ? (
                    <Text className="mt-0.5 text-sm text-muted-foreground">{profile.user.email}</Text>
                  ) : null}
                </View>
              </View>
              {profile.user.name && (
                <Row label="Full name" value={profile.user.name} />
              )}
              {profile.user.email && (
                <Row label="Email" value={profile.user.email} />
              )}
              {profile.user.phone_number && (
                <Row label="Phone" value={profile.user.phone_number} />
              )}
              {profile.user.gender && (
                <Row label="Gender" value={profile.user.gender} />
              )}
              {profile.user.date_of_birth && (
                <Row label="Date of birth" value={formatDate(profile.user.date_of_birth)} />
              )}
              {profile.user.joined && (
                <Row label="Member since" value={profile.user.joined} />
              )}
            </Section>

            {profile.address && (
              (() => {
                const { house_address, city, state, country, postal_code } = profile.address;
                const hasAny =
                  !!house_address || !!city || !!state || !!country || !!postal_code;
                if (!hasAny) return null;
                return (
                  <Section title="Address" cardBg={cardBg}>
                    {house_address && <Row label="Address" value={house_address} />}
                    {city && <Row label="City" value={city} />}
                    {state && <Row label="State" value={state} />}
                    {country && <Row label="Country" value={country} />}
                    {postal_code && <Row label="Postal code" value={postal_code} />}
                  </Section>
                );
              })()
            )}

            {profile.kyc_verification && (
              (() => {
                const { status, id_type } = profile.kyc_verification;
                const hasAny = !!status || !!id_type;
                if (!hasAny) return null;
                return (
                  <Section title="KYC" cardBg={cardBg}>
                    {status && <Row label="Status" value={status} />}
                    {id_type && <Row label="ID type" value={id_type} />}
                  </Section>
                );
              })()
            )}

            <Section title="Wallet" cardBg={cardBg}>
              <Row label="Balance" value={profile.wallet_card.current_balance} />
              <Row label="All-time funded" value={profile.wallet_card.all_time_fuunding} />
              <Row label="All-time withdrawn" value={profile.wallet_card.all_time_withdrawn} />
            </Section>

            <Section title="Current tier" cardBg={cardBg}>
              <Text className="text-base font-semibold text-foreground">
                {profile.current_tier.name}
              </Text>
              <Text className="mt-1 text-sm text-muted-foreground">
                {profile.current_tier.description}
              </Text>
              {profile.current_tier.requirements?.length > 0 && (
                <View className="mt-2">
                  <Text className="text-xs font-medium text-muted-foreground">
                    Requirements
                  </Text>
                  {profile.current_tier.requirements.map((r, i) => (
                    <Text key={i} className="mt-0.5 text-sm text-foreground">
                      • {r}
                    </Text>
                  ))}
                </View>
              )}
            </Section>
          </ScrollView>
        )}
      </View>
    </>
  );
}
