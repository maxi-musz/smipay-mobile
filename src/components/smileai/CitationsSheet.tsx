import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import type { SmileCitation } from "@/types/smileai";

type Props = {
  visible: boolean;
  citations: SmileCitation[];
  onClose: () => void;
};

export function CitationsSheet({ visible, citations, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const sheetBg = isDark ? "#1E293B" : "#FFFFFF";

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
            {citations.map((c) => (
              <View key={c.chunk_id} className="mb-4">
                <Text className="font-medium">{c.doc_slug}</Text>
                {c.heading ? (
                  <Text className="mt-1 text-sm text-muted-foreground">{c.heading}</Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
