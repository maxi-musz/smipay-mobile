import { ActivityIndicator, type ColorValue } from "react-native";

interface SpinnerProps {
  size?: "small" | "large";
  color?: ColorValue;
  className?: string;
}

export function Spinner({
  size = "small",
  color,
  className,
}: SpinnerProps) {
  return (
    <ActivityIndicator
      size={size}
      color={color ?? "currentColor"}
      className={className}
    />
  );
}
