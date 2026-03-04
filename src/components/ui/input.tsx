import React, { forwardRef, useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface InputProps extends React.ComponentProps<typeof TextInput> {
  label?: string;
  error?: string;
  /** Renders a show/hide toggle when secureTextEntry is true. */
  toggleable?: boolean;
  containerClassName?: string;
}

const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    toggleable = false,
    containerClassName,
    secureTextEntry,
    className,
    ...props
  },
  ref,
) {
  const [hidden, setHidden] = useState(true);
  const isSecure = secureTextEntry && hidden;

  return (
    <View className={cn("gap-1.5", containerClassName)}>
      {label && (
        <Text className="text-[15px] font-medium text-foreground">{label}</Text>
      )}

      <View
        className={cn(
          "flex-row items-center rounded-xl border bg-background px-4",
          error ? "border-destructive" : "border-input",
        )}
      >
        <TextInput
          ref={ref}
          className={cn(
            "h-14 flex-1 text-[17px] text-foreground",
            Platform.select({ web: "outline-none" }),
            className,
          )}
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={isSecure}
          {...props}
        />

        {secureTextEntry && toggleable && (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
          >
            <Ionicons
              name={hidden ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#9CA3AF"
            />
          </Pressable>
        )}
      </View>

      {error && (
        <Text className="text-sm text-destructive">{error}</Text>
      )}
    </View>
  );
});

export { Input };
export type { InputProps };
