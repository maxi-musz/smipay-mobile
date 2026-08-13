import type { ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { cn } from "@/lib/utils";

export interface SecureNumericFieldProps {
  value: string;
  onPress: () => void;
  /** Long-press to paste — there is no system keyboard behind this field. */
  onLongPress?: () => void;
  focused?: boolean;
  placeholder?: string;
  /** e.g. group digits as `080 123 45678` */
  formatValue?: (raw: string) => string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  error?: boolean;
  className?: string;
  fieldClassName?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Tap-to-focus numeric display for use with `<Keypad />` — no system keyboard.
 */
export function SecureNumericField({
  value,
  onPress,
  onLongPress,
  focused = false,
  placeholder,
  formatValue,
  prefix,
  suffix,
  error = false,
  className,
  fieldClassName,
  style,
  accessibilityLabel,
  testID,
}: SecureNumericFieldProps) {
  const display = value
    ? formatValue
      ? formatValue(value)
      : value
    : "";
  const showPlaceholder = !display && placeholder;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? "Numeric field"}
      accessibilityState={{ selected: focused }}
      className={cn("min-h-[24px] flex-1 flex-row items-center", className)}
      style={style}
    >
      {prefix}
      <View
        className={cn("flex-1 flex-row items-center min-h-[24px] py-0", fieldClassName)}
        style={
          focused
            ? {
                borderBottomWidth: 2,
                borderBottomColor: error ? colors.error : colors.orange[500],
                marginBottom: -2,
              }
            : undefined
        }
      >
        {showPlaceholder ? (
          <Text
            className="flex-1 text-[15px] font-normal"
            style={{ color: colors.gray[400] }}
            maxFontSizeMultiplier={1.1}
          >
            {placeholder}
          </Text>
        ) : (
          <Text
            className={cn(
              "flex-1 text-base font-semibold",
              error ? "text-destructive" : "text-foreground",
            )}
            maxFontSizeMultiplier={1.15}
          >
            {display}
          </Text>
        )}
        {focused && !display ? (
          <View
            className="h-5 w-0.5 rounded-full"
            style={{ backgroundColor: colors.orange[500] }}
          />
        ) : null}
      </View>
      {suffix}
    </Pressable>
  );
}
