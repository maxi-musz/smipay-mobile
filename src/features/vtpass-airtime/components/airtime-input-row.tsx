import { useState } from "react";
import { Image, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { useAppTheme } from "@/hooks/use-app-theme";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { BottomSheetModal } from "@/components/ui/modals";
import { colors } from "@/constants/colors";
import { getNetworkProviderLogo } from "@/lib/network-provider-logo";
import { cn } from "@/lib/utils";
import type { AirtimeServiceItem } from "@/types/vtpass-airtime";

/** Network logo from local assets — no reliance on provider-returned URLs. */
function NetworkLogo({
  serviceID,
  size,
}: {
  serviceID: string;
  size: number;
}) {
  const source = getNetworkProviderLogo(serviceID);

  if (!source) {
    return (
      <View
        className="items-center justify-center rounded-lg bg-muted"
        style={{ width: size, height: size }}
      >
        <Ionicons
          name="cellular"
          size={size * 0.55}
          color={colors.gray[500]}
        />
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={{ width: size, height: size, borderRadius: 8 }}
      resizeMode="contain"
    />
  );
}

interface AirtimeInputRowProps {
  providers: AirtimeServiceItem[];
  selectedProvider: AirtimeServiceItem | null;
  onSelectProvider: (provider: AirtimeServiceItem) => void;
  phone: string;
  onPhoneChange: (text: string) => void;
  amount: number;
  purchasing: boolean;
  canSubmit: boolean;
  onPay: () => void;
  phoneError?: string;
  providerError: string | null;
  onRetryProviders: () => void;
}

export function AirtimeInputRow({
  providers,
  selectedProvider,
  onSelectProvider,
  phone,
  onPhoneChange,
  amount,
  purchasing,
  canSubmit,
  onPay,
  phoneError,
  providerError,
  onRetryProviders,
}: AirtimeInputRowProps) {
  const { isDark } = useAppTheme();
  const [pickerVisible, setPickerVisible] = useState(false);

  function handlePhoneChange(text: string) {
    const digits = text.replace(/\D/g, "").slice(0, 11);
    onPhoneChange(digits);
  }

  return (
    <>
      <View
        className={cn(
          "flex-row items-center gap-3 rounded-2xl border px-4 py-2",
          phoneError ? "border-destructive" : "border-border",
        )}
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
        }}
      >
        {/* Network dropdown - icon only */}
        <Pressable
          onPress={() => {
            if (providerError) {
              onRetryProviders();
            } else if (providers.length) {
              setPickerVisible(true);
            }
          }}
          className={cn(
            "flex-row items-center gap-1 rounded-xl px-2 py-2",
            isDark ? "bg-white/10" : "bg-white",
          )}
        >
          {providerError ? (
            <Ionicons name="refresh" size={22} color={colors.orange[500]} />
          ) : selectedProvider ? (
            <NetworkLogo
              serviceID={selectedProvider.serviceID}
              size={36}
            />
          ) : (
            <Ionicons name="cellular" size={22} color={colors.gray[400]} />
          )}
          <Ionicons name="chevron-down" size={16} color={colors.gray[500]} />
        </Pressable>

        {/* Phone input */}
        <TextInput
          className="flex-1 text-base text-foreground"
          placeholder="081 4669 4787"
          placeholderTextColor="#9CA3AF"
          value={phone}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          maxLength={11}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Pay button */}
        <Button
          size="default"
          className="h-11 min-w-[90px] rounded-xl"
          onPress={onPay}
          disabled={!canSubmit}
        >
          {purchasing ? (
            <Spinner color="#fff" size="small" />
          ) : (
            <Text className="text-sm font-semibold text-white">
              Pay ₦{amount > 0 ? amount.toLocaleString() : "0"}
            </Text>
          )}
        </Button>
      </View>

      {phoneError && (
        <Text className="mt-1.5 text-sm text-destructive">{phoneError}</Text>
      )}

      {/* Network picker bottom sheet */}
      <BottomSheetModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title="Select network"
        closeOnBackdrop
        showHandle
      >
        <View className="gap-2">
          {providers.map((p) => (
            <Pressable
              key={p.serviceID}
              onPress={() => {
                onSelectProvider(p);
                setPickerVisible(false);
              }}
              className={cn(
                "flex-row items-center gap-3 rounded-xl border p-3",
                selectedProvider?.serviceID === p.serviceID
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/30 active:bg-muted",
              )}
            >
              <NetworkLogo serviceID={p.serviceID} size={40} />
              <Text className="flex-1 text-base font-medium text-foreground">
                {p.name.replace(" Airtime", "")}
              </Text>
              {selectedProvider?.serviceID === p.serviceID && (
                <Ionicons name="checkmark-circle" size={22} color={colors.orange[500]} />
              )}
            </Pressable>
          ))}
        </View>
      </BottomSheetModal>
    </>
  );
}
