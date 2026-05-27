import { useLocalSearchParams, router } from "expo-router";

import { ChatScreen } from "@/components/smileai/ChatScreen";

export default function SmileaiChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id === "new" ? null : (id ?? null);

  return (
    <ChatScreen
      conversationId={conversationId}
      onConversationCreated={(newId) => {
        router.replace({
          pathname: "/(app)/smileai/chat/[id]",
          params: { id: newId },
        });
      }}
    />
  );
}
