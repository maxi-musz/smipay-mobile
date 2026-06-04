import { useLocalSearchParams, router } from "expo-router";

import { ChatScreen } from "@/components/smileai/ChatScreen";

export default function SmileaiChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id === "new" ? null : (id ?? null);

  return (
    <ChatScreen
      conversationId={conversationId}
      onConversationCreated={(newId) => {
        // `setParams` updates the URL in place without re-mounting the
        // screen — preserves the user's optimistic bubble and avoids the
        // visible navigation jump after the first send.
        router.setParams({ id: newId });
      }}
      showBackButton
      onSelectConversation={(selectedId) => {
        router.replace({
          pathname: "/(app)/smileai/chat/[id]",
          params: { id: selectedId },
        });
      }}
      onNewChat={
        conversationId
          ? () =>
              router.replace({
                pathname: "/(app)/smileai/chat/[id]",
                params: { id: "new" },
              })
          : undefined
      }
    />
  );
}
