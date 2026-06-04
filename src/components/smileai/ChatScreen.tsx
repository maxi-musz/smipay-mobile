import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
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
import type { SmileCitation, SmileMessage, SmileConfirmRequestedPayload } from "@/types/smileai";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";
import { ConfirmActionCard } from "./ConfirmActionCard";
import { HandoffBanner } from "./HandoffBanner";
import { WelcomeCard } from "./WelcomeCard";
import { CitationsSheet } from "./CitationsSheet";
import { RatingSheet } from "./RatingSheet";
import { ConversationsDrawer } from "./ConversationsDrawer";
import { SecurityNotice } from "./SecurityNotice";
import { SmileAvatar } from "./SmileAvatar";
import { QuickReplyBar } from "./QuickReplyBar";
import { filterDisplayCitations } from "./citation-display";
import { mergeSmileMessages, dedupeSmileMessages } from "./message-utils";

const TOOL_LABELS: Record<string, string> = {
  list_recent_transactions: "Looking up your recent transactions…",
  get_transaction_by_reference: "Finding that transaction…",
  escalate_to_human: "Connecting you to support…",
};

/**
 * Store bucket where optimistic user messages live before a real
 * `AIConversation` row exists on the server. As soon as the server hands us
 * a conversation_id we migrate everything in this bucket to that key.
 */
const PENDING_CONVERSATION_KEY = "__smileai_pending__";

/** Server backfill uses `after` as a DB message id; optimistic client UUIDs are not valid. */
function lastAssistantMessageId(messages: SmileMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return messages[i].id;
  }
  return undefined;
}

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
  // Until the server gives us a real `conversation_id`, render optimistic
  // user bubbles from the dedicated pending bucket so the user sees their
  // message immediately on tap instead of after the socket round-trip.
  const messageKey = conversationId ?? PENDING_CONVERSATION_KEY;
  const messages = useMemo(
    () => dedupeSmileMessages(messagesByConversation[messageKey] ?? []),
    [messagesByConversation, messageKey],
  );
  const streamingText = streamingByConv[convKey] ?? "";
  const status = statusByConv[convKey] ?? "active";
  const pendingConfirmation = pendingByConv[convKey] ?? null;
  const supportId = supportByConv[convKey] ?? null;
  const suggestions = suggestionsByConv[convKey] ?? [];
  const toolBadge = toolBadgeByConv[convKey] ?? null;
  const draftText = ui.draftText;
  const showSuggestedReplies = ui.suggestedRepliesEnabled;

  const setMessages = useSmileaiStore.use.setMessages();
  const appendUserMessage = useSmileaiStore.use.appendUserMessage();
  const markMessageSent = useSmileaiStore.use.markMessageSent();
  const markPendingUserMessagesSent =
    useSmileaiStore.use.markPendingUserMessagesSent();
  const migrateOptimisticMessages =
    useSmileaiStore.use.migrateOptimisticMessages();
  const appendDelta = useSmileaiStore.use.appendDelta();
  const finalizeAssistant = useSmileaiStore.use.finalizeAssistant();
  const setSuggestions = useSmileaiStore.use.setSuggestions();
  const setPendingConfirmation = useSmileaiStore.use.setPendingConfirmation();
  const setSupportConversationId = useSmileaiStore.use.setSupportConversationId();
  const setStatus = useSmileaiStore.use.setStatus();
  const setToolBadge = useSmileaiStore.use.setToolBadge();
  const setDraftText = useSmileaiStore.use.setDraftText();
  const setLastOpenConversationId = useSmileaiStore.use.setLastOpenConversationId();

  /** True only when we must block the UI with a full loader (no cached messages for this chat). */
  const [awaitingNetwork, setAwaitingNetwork] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citationSheet, setCitationSheet] = useState<SmileCitation[] | null>(null);
  const [ratingVisible, setRatingVisible] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const pendingCitationsRef = useRef<SmileCitation[]>([]);

  const isHandedOff = status === "handed_off" || status === "handoff_pending";
  const showFullLoader =
    !!conversationId && messages.length === 0 && awaitingNetwork;
  // Hide the welcome card the instant the user sends their first message —
  // an optimistic bubble in the pending bucket already counts as activity.
  const showWelcome = !conversationId && messages.length === 0 && !awaitingNetwork;

  useLayoutEffect(() => {
    if (!conversationId) {
      setAwaitingNetwork(false);
      return;
    }
    const cached = useSmileaiStore.getState().messagesByConversation[conversationId] ?? [];
    setAwaitingNetwork(cached.length === 0);
  }, [conversationId]);

  // Sit the composer flush on the keyboard (same approach as support chat).
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (keyboardHeight <= 0) return;
    const timer = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      Platform.OS === "ios" ? 50 : 100,
    );
    return () => clearTimeout(timer);
  }, [keyboardHeight]);

  useEffect(() => {
    let cancelled = false;

    if (!conversationId) {
      setError(null);
      return;
    }

    const fullFetch = async () => {
      try {
        const res = await fetchSmileConversation(conversationId);
        if (cancelled) return;
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
        if (!cancelled) {
          setError("Smile is offline. Try again or talk to a human.");
        }
      } finally {
        if (!cancelled) setAwaitingNetwork(false);
      }
    };

    const run = async () => {
      setError(null);
      const cached = useSmileaiStore.getState().messagesByConversation[conversationId] ?? [];

      if (cached.length > 0) {
        const last = cached[cached.length - 1];
        lastMessageIdRef.current = last?.id ?? null;
        setLastOpenConversationId(conversationId);
        joinConversation(conversationId);

        const after = lastAssistantMessageId(cached);
        try {
          if (after) {
            const res = await backfillSmileMessages(conversationId, { after });
            if (cancelled) return;
            const items = res.data?.items ?? [];
            if (items.length > 0) {
              const current =
                useSmileaiStore.getState().messagesByConversation[conversationId] ?? [];
              const merged = mergeSmileMessages(current, items);
              setMessages(conversationId, merged);
              const tail = merged[merged.length - 1];
              lastMessageIdRef.current = tail?.id ?? lastMessageIdRef.current;
            }
          } else {
            await fullFetch();
          }
        } catch {
          if (!cancelled) await fullFetch();
        }
        return;
      }

      await fullFetch();
    };

    void run();

    return () => {
      cancelled = true;
      if (conversationId) leaveConversation(conversationId);
    };
  }, [
    conversationId,
    joinConversation,
    leaveConversation,
    setMessages,
    setStatus,
    setSupportConversationId,
    setLastOpenConversationId,
  ]);

  useEffect(() => {
    if (!conversationId) return;

    setHandlers({
      onDelta: ({ conversation_id, message_id, text }) => {
        if (conversation_id !== conversationId) return;
        setIsStreaming(true);
        // First delta is the strongest "your message was processed" signal —
        // promote any still-pending user bubble to delivered (single tick).
        markPendingUserMessagesSent(conversation_id);
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
        if (sug?.length && useSmileaiStore.getState().ui.suggestedRepliesEnabled) {
          setSuggestions(conversation_id, sug);
        }
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
      }: SmileConfirmRequestedPayload) => {
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
        setIsStreaming(false);
        showToast({ variant: "error", title: message });
      },
    });

    return () => setHandlers(null);
  }, [
    conversationId,
    setHandlers,
    appendDelta,
    finalizeAssistant,
    markPendingUserMessagesSent,
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
      const msgs = useSmileaiStore.getState().messagesByConversation[conversationId] ?? [];
      const after = lastAssistantMessageId(msgs);
      if (!after) return;
      try {
        const res = await backfillSmileMessages(conversationId, { after });
        const items = res.data?.items ?? [];
        if (items.length > 0) {
          const current = useSmileaiStore.getState().messagesByConversation[conversationId] ?? [];
          const merged = mergeSmileMessages(current, items);
          setMessages(conversationId, merged);
          lastMessageIdRef.current = merged[merged.length - 1]?.id ?? lastMessageIdRef.current;
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
      if (!trimmed || isStreaming) return;

      // 1. Show the bubble immediately so the tap feels instant. If the chat
      //    has no server id yet, park the optimistic message in the dedicated
      //    pending bucket and migrate after creation.
      const clientMessageId = Crypto.randomUUID();
      const optimistic: SmileMessage = {
        id: clientMessageId,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
        localStatus: "sending",
      };
      const initialKey = conversationId ?? PENDING_CONVERSATION_KEY;
      appendUserMessage(initialKey, optimistic);
      setDraftText("");
      setIsStreaming(true);

      // 2. Make sure a conversation exists. We deliberately do NOT pass
      //    `initial_text` here: doing so makes the backend run the first
      //    turn AND we'd separately emit `ai.message.user` below — producing
      //    two assistant replies for the same prompt. One path only.
      let convId = conversationId;
      if (!convId) {
        const created = await startConversation();
        if (!created) {
          showToast({ variant: "error", title: "Could not start chat. Try again." });
          setIsStreaming(false);
          return;
        }
        convId = created;
        migrateOptimisticMessages(PENDING_CONVERSATION_KEY, convId);
        onConversationCreated(convId);
      }

      // 3. Emit and flip the bubble status to delivered. If the socket is
      //    still negotiating, retry briefly; we keep the clock icon during
      //    retries so the user can see it's queued, not lost.
      let attempts = 0;
      const trySend = () => {
        if (socket?.connected) {
          emitSend(convId!, clientMessageId, trimmed);
          markMessageSent(convId!, clientMessageId);
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
      migrateOptimisticMessages,
      markMessageSent,
      setDraftText,
      emitSend,
      socket,
      showToast,
      isStreaming,
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

  if (showFullLoader) {
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

  const isSmileBusy =
    isStreaming && !pendingConfirmation && !isHandedOff;

  const statusLabel = isSmileBusy
    ? streamingText
      ? "Smile is typing…"
      : toolBadge
        ? "Working on it…"
        : "Smile is thinking…"
    : pendingConfirmation
      ? "Waiting for you…"
      : toolBadge
        ? "Working on it…"
        : isConnected
          ? "Smile"
          : "Reconnecting…";

  const footerBottomInset =
    keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, 12);

  return (
    <View className="flex-1">
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
        <View
          className={showBackButton ? "ml-2 flex-1 flex-row items-center" : "flex-1 flex-row items-center"}
          style={{ gap: 10 }}
        >
          <SmileAvatar size={36} />
          <View style={{ flex: 1 }}>
            <Text className="text-lg font-semibold">Smile</Text>
            <Text
              className={isSmileBusy ? "text-xs" : "text-xs text-muted-foreground"}
              style={
                isSmileBusy
                  ? {
                      color: isDark ? "#FB923C" : "#C2520A",
                      fontWeight: "600",
                    }
                  : undefined
              }
            >
              {statusLabel}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center" style={{ gap: 4 }}>
          {onNewChat && conversationId ? (
            <Pressable
              onPress={onNewChat}
              disabled={isSmileBusy}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Start a new chat"
              accessibilityState={{ disabled: isSmileBusy }}
              style={{
                minWidth: 36,
                minHeight: 36,
                alignItems: "center",
                justifyContent: "center",
                opacity: isSmileBusy ? 0.4 : 1,
              }}
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
              disabled={isSmileBusy}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="View conversation history"
              accessibilityState={{ disabled: isSmileBusy }}
              style={{
                minWidth: 36,
                minHeight: 36,
                alignItems: "center",
                justifyContent: "center",
                opacity: isSmileBusy ? 0.4 : 1,
              }}
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

      <SecurityNotice />

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

      <View className="flex-1">
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4 pt-2"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingBottom: 12 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          accessibilityLiveRegion="polite"
        >
        {showWelcome ? (
          <WelcomeCard
            firstName={user?.first_name ?? undefined}
            onChipPress={sendUserText}
            disabled={isSmileBusy}
          />
        ) : null}

        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            role={m.role}
            content={m.content}
            citations={m.citations}
            localStatus={m.localStatus}
            createdAt={m.createdAt}
            showCitationChips={showSuggestedReplies}
            onCitationPress={
              !showSuggestedReplies || isSmileBusy
                ? undefined
                : (c) =>
                    setCitationSheet(filterDisplayCitations(m.citations ?? [c]))
            }
          />
        ))}

        {streamingText &&
        !messages.some(
          (m) =>
            m.role === "assistant" &&
            m.content.trim() === streamingText.trim(),
        ) ? (
          <MessageBubble role="assistant" content={streamingText} plainText />
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

        <View
          className="border-t border-border bg-background"
          style={{ paddingBottom: footerBottomInset }}
        >
          {showSuggestedReplies && suggestions.length > 0 && !isHandedOff ? (
            <QuickReplyBar
              suggestions={suggestions}
              onSelect={sendUserText}
              disabled={isSmileBusy}
            />
          ) : null}

          <Composer
            value={draftText}
            onChange={setDraftText}
            onSend={() => sendUserText(draftText)}
            disabled={isHandedOff || isSmileBusy}
            isThinking={isSmileBusy && !isHandedOff}
            placeholder={
              isHandedOff
                ? "An agent will reply here soon"
                : "Message Smile…"
            }
          />
        </View>
      </View>

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
    </View>
  );
}
