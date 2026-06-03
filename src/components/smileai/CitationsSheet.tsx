import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import type { SmileCitation } from "@/types/smileai";
import { formatCitationTitle, formatCitationTopic, filterDisplayCitations } from "./citation-display";

type Props = {
  visible: boolean;
  citations: SmileCitation[];
  onClose: () => void;
};

export function CitationsSheet({ visible, citations, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const sheetBg = isDark ? "#1E293B" : "#FFFFFF";
  const items = filterDisplayCitations(citations);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: sheetBg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: insets.bottom + 16,
            maxHeight: "70%",
          }}
        >
          <View className="items-center py-3">
            <View className="h-1 w-10 rounded-full bg-muted" />
          </View>
          <Text className="px-5 pb-3 text-lg font-semibold">Sources</Text>
          <ScrollView className="px-5">
            {items.map((c) => {
              const title = formatCitationTitle(c);
              const topic = formatCitationTopic(c);
              return (
                <View
                  key={c.chunk_id}
                  className="mb-3 flex-row items-start"
                  style={{ gap: 12 }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: isDark ? "rgba(245,130,32,0.18)" : "#FFF7ED",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color={isDark ? "#FB923C" : "#EA580C"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="text-base font-semibold">{title}</Text>
                    {topic ? (
                      <Text className="mt-1 text-sm text-muted-foreground">{topic}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
