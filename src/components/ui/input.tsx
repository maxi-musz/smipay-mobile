import React, { forwardRef, useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";

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
        <Text className="text-sm font-medium text-foreground">{label}</Text>
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
            "h-12 flex-1 text-base text-foreground",
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
            <Text className="text-sm text-muted-foreground">
              {hidden ? "Show" : "Hide"}
            </Text>
          </Pressable>
        )}
      </View>

      {error && (
        <Text className="text-xs text-destructive">{error}</Text>
      )}
    </View>
  );
});

export { Input };
export type { InputProps };
