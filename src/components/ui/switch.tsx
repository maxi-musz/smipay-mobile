import { Switch as RNSwitch } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function Switch({ value, onValueChange, disabled }: SwitchProps) {
  const { theme, isDark } = useAppTheme();
  const primary = theme.primary;
  const trackOn = isDark ? "rgba(245, 131, 31, 0.5)" : "rgba(245, 131, 31, 0.4)";
  const trackOff = isDark ? theme.borderStrong : theme.border;

  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: trackOff, true: trackOn }}
      thumbColor={value ? primary : isDark ? theme.textTertiary : theme.backgroundTertiary}
      ios_backgroundColor={trackOff}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    />
  );
}
