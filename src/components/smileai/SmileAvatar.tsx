import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  size?: number;
  /** Render a thin halo ring around the orb (used in the chat header). */
  withHalo?: boolean;
};

/**
 * Smile brand avatar — the same gradient orb used on the home floating
 * action button, shrunk down for use beside the chat header title and any
 * other inline mention of Smile.
 */
export function SmileAvatar({ size = 32, withHalo = false }: Props) {
  const orb = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        shadowColor: "#F58220",
        shadowOpacity: 0.35,
        shadowRadius: size / 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
      }}
    >
      <LinearGradient
        colors={["#FBBF24", "#F58220", "#D946EF", "#6366F1"]}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: size * 0.12,
            left: size * 0.16,
            width: size * 0.42,
            height: size * 0.28,
            borderRadius: size * 0.42,
            backgroundColor: "rgba(255,255,255,0.32)",
            transform: [{ rotate: "-25deg" }],
          }}
        />
        <Ionicons name="sparkles" size={Math.round(size * 0.5)} color="#FFFFFF" />
      </LinearGradient>
    </View>
  );

  if (!withHalo) return orb;

  return (
    <View
      style={{
        width: size + 4,
        height: size + 4,
        borderRadius: (size + 4) / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(245,130,32,0.12)",
      }}
    >
      {orb}
    </View>
  );
}
