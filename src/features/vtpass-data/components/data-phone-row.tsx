import { Pressable, TextInput, View } from "react-native";
import * as Contacts from "expo-contacts";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import { formatPhoneFromContact } from "@/features/vtpass-airtime/constants";
import { phoneMatchesProvider } from "@/features/vtpass-airtime/phone-network";
import { cn } from "@/lib/utils";
import type { DataServiceItem } from "@/types/vtpass-data";

/** Faint placeholder so it doesn’t look like typed text on real devices. */
const PLACEHOLDER_LIGHT = "rgba(107, 114, 128, 0.38)";
const PLACEHOLDER_DARK = "rgba(255, 255, 255, 0.15)";

export interface DataPhoneRowProps {
  provider: DataServiceItem;
  phone: string;
  onPhoneChange: (text: string) => void;
  onClearPhone?: () => void;
  /** When true, show "confirm number and network match" disclaimer (e.g. after contact pick). */
  showContactMatchDisclaimer?: boolean;
  /** Called when user picks a number from contacts (parent may set disclaimer). */
  onContactPicked?: () => void;
  phoneError?: string;
}

export function DataPhoneRow({
  provider,
  phone,
  onPhoneChange,
  onClearPhone,
  showContactMatchDisclaimer = false,
  onContactPicked,
  phoneError,
}: DataPhoneRowProps) {
  const { isDark } = useAppTheme();
  const phoneDigits = phone.replace(/\D/g, "");
  const possibleMismatch =
    phoneDigits.length >= 10 &&
    !phoneMatchesProvider(phone, provider.serviceID);
  const showDisclaimer = possibleMismatch || showContactMatchDisclaimer;

  function handlePhoneChange(text: string) {
    const digits = text.replace(/\D/g, "").slice(0, 11);
    const normalized =
      digits.length === 10 && !digits.startsWith("0")
        ? "0" + digits
        : digits;
    onPhoneChange(normalized);
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
      if (status !== "granted") return;

      const contact = await Contacts.presentContactPickerAsync();
      const firstNumber = contact?.phoneNumbers?.[0]?.number;
      if (!firstNumber) return;

      const formatted = formatPhoneFromContact(firstNumber);
      if (!formatted) return;

      onPhoneChange(formatted);
      onContactPicked?.();
    } catch {
      // User cancelled or permission denied
    }
  }

  const providerLabel = provider.name?.replace(/\s*data\s*/i, "").trim() || provider.serviceID;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-medium text-muted-foreground">
          Network: {providerLabel}
        </Text>
      </View>

      <View
        className={cn(
          "flex-row items-center rounded-2xl border bg-card overflow-hidden",
          phoneError ? "border-destructive" : "border-border",
        )}
      >
        <View className="pl-4 flex-row items-center flex-1 min-w-0 py-1">
          <Text className="text-[15px] text-muted-foreground mr-1">+234</Text>
          <TextInput
            className="flex-1 text-[15px] font-normal text-foreground min-h-[48px] py-3"
            placeholder="801 234 5678"
            placeholderTextColor={isDark ? PLACEHOLDER_DARK : PLACEHOLDER_LIGHT}
            value={formatDisplayPhone(phone)}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={13}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {phone.length > 0 && onClearPhone ? (
          <Pressable
            onPress={onClearPhone}
            hitSlop={8}
            className="p-2 mr-1"
            accessibilityRole="button"
            accessibilityLabel="Clear number"
          >
            <Ionicons name="close-circle" size={20} color={colors.gray[400]} />
          </Pressable>
        ) : null}
        <View className="h-8 w-px bg-border" />
        <Pressable
          onPress={handlePickContact}
          className="h-12 w-12 items-center justify-center"
          style={{ backgroundColor: colors.green[500] }}
          accessibilityRole="button"
          accessibilityLabel="Choose from contacts"
        >
          <Ionicons name="person" size={20} color="#fff" />
        </Pressable>
      </View>

      {phoneError && (
        <Text className="text-sm text-destructive">{phoneError}</Text>
      )}

      {showDisclaimer && phoneDigits.length >= 10 && (
        <View
          className="flex-row items-center gap-2.5 rounded-xl bg-muted/60 pl-3 pr-3 py-2.5"
          style={{ borderLeftWidth: 4, borderLeftColor: colors.warning }}
        >
          <Ionicons name="information-circle" size={18} color={colors.gray[600]} />
          <Text className="flex-1 text-[13px] text-muted-foreground leading-snug">
            This number may be on a different network. Confirm it matches {providerLabel} before paying.
          </Text>
        </View>
      )}
    </View>
  );
}
