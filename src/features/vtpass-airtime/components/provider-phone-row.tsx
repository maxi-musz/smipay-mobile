import { useState } from "react";
import { Image, Pressable, TextInput, View } from "react-native";
import * as Contacts from "expo-contacts";
import { Ionicons } from "@expo/vector-icons";

import { BottomSheetModal } from "@/components/ui/modals";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { getNetworkProviderLogo } from "@/lib/network-provider-logo";
import { formatPhoneFromContact } from "../constants";
import { getServiceIdFromPhone, phoneMatchesProvider } from "../phone-network";
import { cn } from "@/lib/utils";
import type { AirtimeServiceItem } from "@/types/vtpass-airtime";

function findProviderByServiceId(
  providers: AirtimeServiceItem[],
  serviceId: string,
): AirtimeServiceItem | null {
  const id = serviceId.toLowerCase();
  const aliases = id === "9mobile" ? ["9mobile", "etisalat"] : [id];
  return (
    providers.find((p) => {
      const sid = p.serviceID.toLowerCase().trim();
      return aliases.some(
        (a) => sid === a || sid.startsWith(a) || sid.includes(a),
      );
    }) ?? null
  );
}

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

interface ProviderPhoneRowProps {
  providers: AirtimeServiceItem[];
  selectedProvider: AirtimeServiceItem | null;
  onSelectProvider: (provider: AirtimeServiceItem) => void;
  phone: string;
  onPhoneChange: (text: string) => void;
  onClearPhone?: () => void;
  /** Called when provider was auto-selected from contact picker (show disclaimer). */
  onProviderAutoSelectedFromContact?: () => void;
  /** When true, show "confirm number and provider" disclaimer (e.g. after contact pick). */
  showContactMatchDisclaimer?: boolean;
  phoneError?: string;
  providerError: string | null;
  onRetryProviders: () => void;
}

export function ProviderPhoneRow({
  providers,
  selectedProvider,
  onSelectProvider,
  phone,
  onPhoneChange,
  onClearPhone,
  onProviderAutoSelectedFromContact,
  showContactMatchDisclaimer = false,
  phoneError,
  providerError,
  onRetryProviders,
}: ProviderPhoneRowProps) {
  const [pickerVisible, setPickerVisible] = useState(false);

  const phoneDigits = phone.replace(/\D/g, "");
  const possibleMismatch =
    phoneDigits.length >= 10 &&
    selectedProvider !== null &&
    !phoneMatchesProvider(phone, selectedProvider.serviceID);
  const showDisclaimer = possibleMismatch || showContactMatchDisclaimer;

  function handlePhoneChange(text: string) {
    const digits = text.replace(/\D/g, "").slice(0, 11);
    onPhoneChange(digits);
  }

  function formatDisplayPhone(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  async function handlePickContact() {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      const contact = await Contacts.presentContactPickerAsync();
      const firstNumber = contact?.phoneNumbers?.[0]?.number;
      if (!firstNumber) return;

      const formatted = formatPhoneFromContact(firstNumber);
      if (!formatted) return;

      onPhoneChange(formatted);

      const resolvedServiceId = getServiceIdFromPhone(formatted);
      if (resolvedServiceId && providers.length > 0) {
        const provider = findProviderByServiceId(providers, resolvedServiceId);
        if (provider) {
          onSelectProvider(provider);
          onProviderAutoSelectedFromContact?.();
        }
      }
    } catch {
      // User cancelled, permission denied, or expo-contacts not available
    }
  }

  return (
    <>
      <View className="flex-row items-center gap-2">
        {/* Network dropdown */}
        <Pressable
          onPress={() => {
            if (providerError) {
              onRetryProviders();
            } else if (providers.length) {
              setPickerVisible(true);
            }
          }}
          className="flex-row items-center gap-1"
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

        {/* Minimal phone input - almost invisible line */}
        <View
          className={cn(
            "flex-1 flex-row items-center border-b py-2",
            phoneError ? "border-destructive" : "border-border",
          )}
        >
          <TextInput
            className="flex-1 text-base font-medium text-foreground min-h-[24px] py-0"
            placeholder="Phone number"
            placeholderTextColor="#9CA3AF"
            value={formatDisplayPhone(phone)}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={13}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {phone.length > 0 && onClearPhone ? (
            <Pressable
              onPress={onClearPhone}
              hitSlop={8}
              className="mr-1 p-1"
              accessibilityRole="button"
              accessibilityLabel="Clear number"
            >
              <Ionicons name="close-circle" size={22} color={colors.gray[400]} />
            </Pressable>
          ) : (
            <Ionicons name="chevron-down" size={16} color={colors.gray[400]} />
          )}
        </View>

        {/* Contact picker icon */}
        <Pressable
          onPress={handlePickContact}
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.green[500] }}
        >
          <Ionicons name="person" size={20} color="#fff" />
        </Pressable>
      </View>

      {phoneError && (
        <Text className="mt-1.5 text-sm text-destructive">{phoneError}</Text>
      )}

      {showDisclaimer && selectedProvider && phoneDigits.length >= 10 && (
        <Text className="mt-2 text-xs text-muted-foreground">
          Please confirm the number and network match before paying.
        </Text>
      )}

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

ProviderPhoneRow.displayName = "ProviderPhoneRow";
