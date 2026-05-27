import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import * as Crypto from "expo-crypto";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  backfillSmileMessages,
  fetchSmileConversation,
  requestSmileStepUp,
  submitSmileRating,
} from "@/api/services/smileai";
import { PaymentAuthorizationModal } from "@/features/payment-authorization/payment-authorization-modal";
import { SmileaiSocketContext } from "@/context/smileai-socket";
import { Text } from "@/components/ui/text";
import { FullPageLoader } from "@/components/ui/loaders";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useToastStore } from "@/components/ui/toast";
import { useAuthStore, useSmileaiStore } from "@/store";
import type { SmileCitation, SmileMessage } from "@/types/smileai";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";
import { ConfirmActionCard } from "./ConfirmActionCard";
import { HandoffBanner } from "./HandoffBanner";
import { WelcomeCard } from "./WelcomeCard";
import { CitationsSheet } from "./CitationsSheet";
import { RatingSheet } from "./RatingSheet";
import { ConversationsDrawer } from "./ConversationsDrawer";

const TOOL_LABELS: Record<string, string> = {
  list_recent_transactions: "Looking up your recent transactions…",
  get_transaction_by_reference: "Finding that transaction…",
  escalate_to_human: "Connecting you to support…",
};

type Props = {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
  /** Show a back chevron in the header (defaults to true). */
  showBackButton?: boolean;
  /**
   * Called when the user selects another conversation from the right-side
   * drawer. Parent decides how to navigate (e.g. `router.replace`). If
   * omitted, the history icon is hidden.
   */
  onSelectConversation?: (id: string) => void;
  /** Render a "new chat" icon in the header right group when provided. */
  onNewChat?: () => void;
};

export function ChatScreen({
  conversationId,
  onConversationCreated,
  showBackButton = true,
  onSelectConversation,
  onNewChat,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const showToast = useToastStore((s) => s.show);
  const user = useAuthStore.use.user();
  const {
    socket,
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage: emitSend,
    respondConfirm,
    requestHandoff: emitHandoff,
    setHandlers,
    startConversation,
  } = useContext(SmileaiSocketContext);

  const messagesByConversation = useSmileaiStore.use.messagesByConversation();
  const streamingByConv = useSmileaiStore.use.streamingText();
  const statusByConv = useSmileaiStore.use.statusByConversation();
  const pendingByConv = useSmileaiStore.use.pendingConfirmation();
  const supportByConv = useSmileaiStore.use.supportConversationId();
  const suggestionsByConv = useSmileaiStore.use.suggestions();
  const toolBadgeByConv = useSmileaiStore.use.toolBadge();
  const ui = useSmileaiStore.use.ui();

  const convKey = conversationId ?? "";
  const messages = messagesByConversation[convKey] ?? [];
  const streamingText = streamingByConv[convKey] ?? "";
  const status = statusByConv[convKey] ?? "active";
  const pendingConfirmation = pendingByConv[convKey] ?? null;
  const supportId = supportByConv[convKey] ?? null;
  const suggestions = suggestionsByConv[convKey] ?? [];
  const toolBadge = toolBadgeByConv[convKey] ?? null;
  const draftText = ui.draftText;

  const setMessages = useSmileaiStore.use.setMessages();
  const appendUserMessage = useSmileaiStore.use.appendUserMessage();
  const appendDelta = useSmileaiStore.use.appendDelta();
  const finalizeAssistant = useSmileaiStore.use.finalizeAssistant();
  const setSuggestions = useSmileaiStore.use.setSuggestions();
  const setPendingConfirmation = useSmileaiStore.use.setPendingConfirmation();
  const setSupportConversationId = useSmileaiStore.use.setSupportConversationId();
  const setStatus = useSmileaiStore.use.setStatus();
  const setToolBadge = useSmileaiStore.use.setToolBadge();
  const setDraftText = useSmileaiStore.use.setDraftText();
  const setLastOpenConversationId = useSmileaiStore.use.setLastOpenConversationId();

  const [loading, setLoading] = useState(!!conversationId);
  const [error, setError] = useState<string | null>(null);
  const [citationSheet, setCitationSheet] = useState<SmileCitation[] | null>(null);
  const [ratingVisible, setRatingVisible] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const pendingCitationsRef = useRef<SmileCitation[]>([]);

  const isHandedOff = status === "handed_off" || status === "handoff_pending";
  const showWelcome = !conversationId && messages.length === 0 && !loading;

  const loadConversation = useCallback(async () => {
    if (!conversationId) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const res = await fetchSmileConversation(conversationId);
      const data = res.data;
      setMessages(conversationId, data.messages ?? []);
      setStatus(conversationId, data.status);
      if (data.support_conversation_id) {
        setSupportConversationId(conversationId, data.support_conversation_id);
      }
      const last = data.messages?.[data.messages.length - 1];
      lastMessageIdRef.current = last?.id ?? null;
      setLastOpenConversationId(conversationId);
      joinConversation(conversationId);
    } catch {
      setError("Smile is offline. Try again or talk to a human.");
    } finally {
      setLoading(false);
    }
  }, [
    conversationId,
    joinConversation,
    setMessages,
    setStatus,
    setSupportConversationId,
    setLastOpenConversationId,
  ]);

  useEffect(() => {
    loadConversation();
    return () => {
      if (conversationId) leaveConversation(conversationId);
    };
  }, [conversationId, loadConversation, leaveConversation]);

  useEffect(() => {
    if (!conversationId) return;

    setHandlers({
      onDelta: ({ conversation_id, message_id, text }) => {
        if (conversation_id !== conversationId) return;
        setIsStreaming(true);
        appendDelta(conversation_id, message_id, text);
      },
      onCitations: ({ conversation_id, citations }) => {
        if (conversation_id !== conversationId) return;
        pendingCitationsRef.current = citations;
      },
      onComplete: ({ conversation_id, message_id, suggestions: sug }) => {
        if (conversation_id !== conversationId) return;
        setIsStreaming(false);
        const streamContent =
          useSmileaiStore.getState().streamingText[conversation_id] ?? "";
        if (streamContent) {
          finalizeAssistant(
            conversation_id,
            message_id,
            streamContent,
            pendingCitationsRef.current.length > 0
              ? pendingCitationsRef.current
              : undefined,
          );
          pendingCitationsRef.current = [];
        }
        if (sug?.length) setSuggestions(conversation_id, sug);
        lastMessageIdRef.current = message_id;
      },
      onToolRequested: ({ conversation_id, action }) => {
        if (conversation_id !== conversationId) return;
        setToolBadge(conversation_id, TOOL_LABELS[action] ?? `Running ${action}…`);
      },
      onToolCompleted: ({ conversation_id }) => {
        if (conversation_id !== conversationId) return;
        setToolBadge(conversation_id, null);
      },
      onConfirmRequested: ({
        conversation_id,
        confirmation_id,
        action,
        copy,
        safety,
      }) => {
        if (conversation_id !== conversationId) return;
        setPendingConfirmation(conversation_id, {
          confirmation_id,
          action,
          copy,
          safety,
        });
      },
      onHandoffCompleted: ({ conversation_id, support_conversation_id }) => {
        if (conversation_id !== conversationId) return;
        setStatus(conversation_id, "handed_off");
        setSupportConversationId(conversation_id, support_conversation_id);
      },
      onConversationClosed: ({ conversation_id }) => {
        if (conversation_id !== conversationId) return;
        setStatus(conversation_id, "closed");
        setRatingVisible(true);
      },
      onError: ({ message }) => {
        showToast({ variant: "error", title: message });
      },
    });

    return () => setHandlers(null);
  }, [
    conversationId,
    setHandlers,
    appendDelta,
    finalizeAssistant,
    setSuggestions,
    setToolBadge,
    setPendingConfirmation,
    setSupportConversationId,
    setStatus,
    showToast,
  ]);

  useEffect(() => {
    if (!isConnected || !conversationId) return;
    const reconnectBackfill = async () => {
      if (!lastMessageIdRef.current) return;
      try {
        const res = await backfillSmileMessages(conversationId, {
          after: lastMessageIdRef.current,
        });
        const items = res.data?.items ?? [];
        if (items.length > 0) {
          const current = useSmileaiStore.getState().messagesByConversation[conversationId] ?? [];
          setMessages(conversationId, [...current, ...items]);
          lastMessageIdRef.current = items[items.length - 1]?.id ?? lastMessageIdRef.current;
        }
      } catch {
        /* ignore */
      }
    };
    reconnectBackfill();
  }, [isConnected, conversationId, setMessages]);

  const sendUserText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      let convId = conversationId;
      if (!convId) {
        const created = await startConversation({ initial_text: trimmed });
        if (!created) {
          showToast({ variant: "error", title: "Could not start chat. Try again." });
          return;
        }
        convId = created;
        onConversationCreated(created);
      }

      const clientMessageId = Crypto.randomUUID();
      const optimistic: SmileMessage = {
        id: clientMessageId,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      appendUserMessage(convId, optimistic);
      setDraftText("");
      setIsStreaming(true);

      let attempts = 0;
      const trySend = () => {
        if (socket?.connected) {
          emitSend(convId!, clientMessageId, trimmed);
        } else if (attempts < 3) {
          attempts += 1;
          setTimeout(trySend, 800);
        } else {
          showToast({ variant: "error", title: "Connection lost. Pull to refresh." });
          setIsStreaming(false);
        }
      };
      trySend();
    },
    [
      conversationId,
      startConversation,
      onConversationCreated,
      appendUserMessage,
      setDraftText,
      emitSend,
      socket,
      showToast,
    ],
  );

  const handleConfirm = (accept: boolean) => {
    if (!conversationId || !pendingConfirmation) return;
    if (accept && pendingConfirmation.safety === "sensitive") {
      setStepUpVisible(true);
      return;
    }
    respondConfirm(conversationId, pendingConfirmation.confirmation_id, accept);
    setPendingConfirmation(conversationId, null);
    if (pendingConfirmation.action === "escalate_to_human" && accept) {
      emitHandoff(conversationId);
    }
  };

  const [stepUpVisible, setStepUpVisible] = useState(false);
  const [stepUpBusy, setStepUpBusy] = useState(false);
  const stepUpTokenRef = useRef<string | null>(null);

  const verifyStepUpPin = useCallback(
    async (pin: string) => {
      if (!conversationId) throw new Error("No conversation");
      setStepUpBusy(true);
      try {
        const res = await requestSmileStepUp(conversationId, { pin });
        const token = res.data?.token;
        if (!token) throw new Error("Could not mint step-up token");
        stepUpTokenRef.current = token;
      } finally {
        setStepUpBusy(false);
      }
    },
    [conversationId],
  );

  const completeStepUp = useCallback(async () => {
    if (!conversationId || !pendingConfirmation) return;
    const token = stepUpTokenRef.current;
    stepUpTokenRef.current = null;
    setStepUpVisible(false);
    if (!token) {
      showToast({ variant: "error", title: "Could not verify PIN. Try again." });
      return;
    }
    respondConfirm(
      conversationId,
      pendingConfirmation.confirmation_id,
      true,
      token,
    );
    setPendingConfirmation(conversationId, null);
  }, [conversationId, pendingConfirmation, respondConfirm, setPendingConfirmation, showToast]);

  const handleRatingSubmit = async (rating: number, feedback?: string) => {
    if (!conversationId) return;
    setRatingSubmitting(true);
    try {
      await submitSmileRating(conversationId, { rating, feedback });
      setRatingVisible(false);
      showToast({ variant: "success", title: "Thanks for your feedback!" });
    } catch {
      showToast({ variant: "error", title: "Could not save rating." });
    } finally {
      setRatingSubmitting(false);
    }
  };

  if (loading) {
    return <FullPageLoader message="Loading Smile…" />;
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center text-lg">{error}</Text>
        <Pressable
          className="mt-4"
          onPress={() => router.push("/(app)/support/chat")}
          accessibilityRole="button"
          accessibilityLabel="Talk to a human"
        >
          <Text className="font-semibold text-primary">Talk to a human</Text>
        </Pressable>
      </View>
    );
  }

  const statusLabel = isStreaming
    ? "Smile is typing…"
    : pendingConfirmation
      ? "Waiting for you…"
      : toolBadge
        ? "Working on it…"
        : isConnected
          ? "Smile"
          : "Reconnecting…";

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View
        className="flex-row items-center border-b border-border px-4 py-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        {showBackButton ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityLabel="Go back"
            style={{ minWidth: 32, minHeight: 32, justifyContent: "center" }}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={isDark ? "#F8FAFC" : "#0F172A"}
            />
          </Pressable>
        ) : null}
        <View className={showBackButton ? "ml-3 flex-1" : "flex-1"}>
          <Text className="text-lg font-semibold">Smile</Text>
          <Text className="text-xs text-muted-foreground">{statusLabel}</Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 4 }}>
          {onNewChat && conversationId ? (
            <Pressable
              onPress={onNewChat}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Start a new chat"
              style={{ minWidth: 36, minHeight: 36, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons
                name="create-outline"
                size={22}
                color={isDark ? "#F8FAFC" : "#0F172A"}
              />
            </Pressable>
          ) : null}
          {onSelectConversation ? (
            <Pressable
              onPress={() => setDrawerOpen(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="View conversation history"
              style={{ minWidth: 36, minHeight: 36, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons
                name="time-outline"
                size={22}
                color={isDark ? "#F8FAFC" : "#0F172A"}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isHandedOff ? (
        <View className="px-4 pt-2">
          <HandoffBanner
            supportConversationId={supportId}
            onViewSupport={
              supportId
                ? () =>
                    router.push({
                      pathname: "/(app)/support/chat",
                      params: { id: supportId },
                    })
                : undefined
            }
          />
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4 pt-2"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        accessibilityLiveRegion="polite"
      >
        {showWelcome ? (
          <WelcomeCard
            firstName={user?.first_name ?? undefined}
            onChipPress={sendUserText}
          />
        ) : null}

        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            role={m.role}
            content={m.content}
            citations={m.citations}
            onCitationPress={(c) =>
              setCitationSheet(m.citations ?? [c])
            }
          />
        ))}

        {streamingText ? (
          <MessageBubble role="assistant" content={streamingText} />
        ) : null}

        {toolBadge ? (
          <View className="mb-2 self-start rounded-full bg-muted px-3 py-2">
            <Text className="text-xs text-muted-foreground">{toolBadge}</Text>
          </View>
        ) : null}

        {pendingConfirmation ? (
          <ConfirmActionCard
            title={pendingConfirmation.action.replace(/_/g, " ")}
            description={pendingConfirmation.copy}
            safety={pendingConfirmation.safety}
            onCancel={() => handleConfirm(false)}
            onConfirm={() => handleConfirm(true)}
          />
        ) : null}
      </ScrollView>

      {suggestions.length > 0 && !isHandedOff ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-3 py-2">
          {suggestions.map((s) => (
            <Pressable
              key={s}
              onPress={() => sendUserText(s)}
              className="mr-2 rounded-full border border-border bg-card px-4 py-2"
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text className="text-sm">{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <Composer
        value={draftText}
        onChange={setDraftText}
        onSend={() => sendUserText(draftText)}
        disabled={isHandedOff}
        placeholder={
          isHandedOff
            ? "An agent will reply here soon"
            : "Message Smile…"
        }
      />

      <CitationsSheet
        visible={citationSheet != null}
        citations={citationSheet ?? []}
        onClose={() => setCitationSheet(null)}
      />

      <RatingSheet
        visible={ratingVisible}
        onDismiss={() => setRatingVisible(false)}
        onSubmit={handleRatingSubmit}
        submitting={ratingSubmitting}
      />

      {onSelectConversation ? (
        <ConversationsDrawer
          visible={drawerOpen}
          activeConversationId={conversationId}
          onClose={() => setDrawerOpen(false)}
          onSelectConversation={onSelectConversation}
          onStartNewChat={() => {
            if (onNewChat) {
              onNewChat();
            } else {
              onSelectConversation("new");
            }
          }}
        />
      ) : null}

      <PaymentAuthorizationModal
        visible={stepUpVisible}
        onClose={() => setStepUpVisible(false)}
        showRetryBiometrics={false}
        isBusy={stepUpBusy}
        onVerifyPin={verifyStepUpPin}
        onCompletePayment={completeStepUp}
        onRetryBiometrics={async () => {
          /* biometrics flow runs through verifyStepUpPin by typing PIN */
        }}
      />
    </KeyboardAvoidingView>
  );
}
