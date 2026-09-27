import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import {
  NG_PHONE_INPUT_MAX_LENGTH,
  formatNgSubscriber,
  toNgSubscriberDigits,
} from "@/lib/ng-phone-input";
import { cn } from "@/lib/utils";

const NG_GREEN = "#008751";

function NigeriaFlag() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="h-4 w-[22px] flex-row overflow-hidden rounded-[3px] border border-black/10"
    >
      <View className="flex-1" style={{ backgroundColor: NG_GREEN }} />
      <View className="flex-1 bg-white" />
      <View className="flex-1" style={{ backgroundColor: NG_GREEN }} />
    </View>
  );
}

interface NgPhoneFieldProps {
  /** The 10 subscriber digits after +234, e.g. "8146694787". */
  value: string;
  onChangeText: (subscriberDigits: string) => void;
  label?: string;
  error?: string;
  autoFocus?: boolean;
  editable?: boolean;
  containerClassName?: string;
}

export const NgPhoneField = forwardRef<TextInput | null, NgPhoneFieldProps>(
  function NgPhoneField(
    { value, onChangeText, label, error, autoFocus, editable = true, containerClassName },
    ref,
  ) {
    const inputRef = useRef<TextInput>(null);
    useImperativeHandle(ref, () => inputRef.current as TextInput);
    const [focused, setFocused] = useState(false);

    return (
      <View className={cn("gap-1.5", containerClassName)}>
        {label ? (
          <Text className="text-[15px] font-medium text-foreground">{label}</Text>
        ) : null}

        <Pressable
          onPress={() => inputRef.current?.focus()}
          disabled={!editable}
          className={cn(
            "h-14 flex-row items-center rounded-xl border bg-background",
            error ? "border-destructive" : focused ? "border-primary" : "border-input",
            !editable && "opacity-60",
          )}
        >
          <View className="h-full flex-row items-center gap-2 pl-4 pr-3">
            <NigeriaFlag />
            <Text className="text-[17px] font-medium text-foreground">+234</Text>
          </View>
          <View className="h-7 w-px bg-input" />

          <TextInput
            ref={inputRef}
            value={formatNgSubscriber(value)}
            onChangeText={(text) => onChangeText(toNgSubscriberDigits(text))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="801 234 5678"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            autoCorrect={false}
            autoFocus={autoFocus}
            editable={editable}
            maxLength={NG_PHONE_INPUT_MAX_LENGTH}
            accessibilityLabel={label ?? "Phone number"}
            accessibilityHint="Nigerian mobile number after +234"
            className={cn(
              "h-14 flex-1 pl-3 text-[17px] tracking-[0.5px] text-foreground",
              Platform.select({ web: "outline-none" }),
            )}
          />

          {value.length > 0 && editable ? (
            <Pressable
              onPress={() => {
                onChangeText("");
                inputRef.current?.focus();
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear phone number"
              className="pl-2 pr-4"
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          ) : (
            <View className="w-4" />
          )}
        </Pressable>

        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
      </View>
    );
  },
);
