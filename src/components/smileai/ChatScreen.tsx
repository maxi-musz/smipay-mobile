import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
import { fetchConversationById } from "@/api";
import { PaymentAuthorizationModal } from "@/features/payment-authorization/payment-authorization-modal";
import { SmileaiSocketContext } from "@/context/smileai-socket";
import { SupportSocketContext } from "@/context/support-socket";
import { SMILEY_ASSISTANT_NAME } from "@/constants/smiley";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useToastStore } from "@/components/ui/toast";
import { useAuthStore, useSmileaiStore } from "@/store";
import type { SmileCitation, SmileMessage, SmileConfirmRequestedPayload } from "@/types/smileai";
import type { SupportMessage } from "@/types";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";
import { ConfirmActionCard } from "./ConfirmActionCard";
import { HandoffBanner } from "./HandoffBanner";
import { WelcomeCard } from "./WelcomeCard";
import { CitationsSheet } from "./CitationsSheet";
import { ClosedConversationFooter } from "./ClosedConversationFooter";
import { isTerminalConversationStatus } from "./conversation-status";
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

// Friendly titles for the confirmation card. Falls back to the humanised action
// name; only overrides where the raw name would read poorly or expose Smiley as
// a bot (e.g. "escalate to human").
const CONFIRM_TITLES: Record<string, string> = {
  escalate_to_human: "Connect you to a specialist",
};

function firstWord(name?: string | null): string {
  if (!name?.trim()) return "";
  return name.trim().split(/\s+/)[0] ?? "";
}

/**
 * Map a human support-agent message (from the bridged support conversation)
 * into the Smiley thread's message shape. `senderName` marks it as an agent
 * bubble so the UI labels it with the specialist's name. Only agent messages
 * are merged in — the user's own messages already live in the Smiley thread.
 */
function agentMessageToSmile(
  msg: SupportMessage,
  fallbackName: string | null,
): SmileMessage {
  return {
    id: msg.id,
    role: "assistant",
    content: msg.message,
    createdAt:
      msg.created_at ??
      (msg as { createdAt?: string }).createdAt ??
      new Date().toISOString(),
    // Each agent message carries its own sender (the admin who sent it), so when
    // more than one specialist handles a chat, every message shows who wrote it.
    // Fall back to the current claimant, then a generic label, for empty names.
    senderName: msg.sender_name?.trim() || fallbackName?.trim() || "Specialist",
  };
}

/**
 * Store bucket where optimistic user messages live before a real
 * `AIConversation` row exists on the server. As soon as the server hands us
 * a conversation_id we migrate everything in this bucket to that key.
 */
const PENDING_CONVERSATION_KEY = "__smileai_pending__";

/** Skip refetch when reopening the same chat within this window. */
const CONVERSATION_STALE_MS = 60_000;

const conversationFetchedAt = new Map<string, number>();
const conversationFetchInflight = new Map<string, Promise<void>>();

/** Server backfill uses `after` as a DB message id; optimistic client UUIDs are not valid. */
function lastAssistantMessageId(messages: SmileMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return messages[i].id;
  }
  return undefined;
}

/**
 * A reply should show its WhatsApp-style quote only when the message it
 * answers is NOT directly above it — i.e. the user fired off more messages
 * while Smiley was working. `prev` is the message immediately before the
 * reply in the list. Snippets are truncated server-side, so we match on the
 * id or on a prefix of the previous user message's text.
 */
function shouldShowReplyQuote(
  snippet: string | null | undefined,
  replyToId: string | null | undefined,
  prev: SmileMessage | undefined,
): boolean {
  if (!snippet) return false;
  if (!prev || prev.role !== "user") return true;
  if (replyToId && prev.id === replyToId) return false;
  const core = snippet.replace(/…$/, "").trim();
  if (core.length > 0 && prev.content.trim().startsWith(core)) return false;
  return true;
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
  const messages = useMemo(() => {
    const own = messagesByConversation[messageKey] ?? [];
    // While a freshly-created conversation's optimistic bubbles are still in
    // the pending bucket (before the migration effect runs), fold them in so
    // a burst of first messages never flashes out during the id transition.
    if (conversationId) {
      const pending = messagesByConversation[PENDING_CONVERSATION_KEY] ?? [];
      if (pending.length > 0) {
        return dedupeSmileMessages([...own, ...pending]);
      }
    }
    return dedupeSmileMessages(own);
  }, [messagesByConversation, messageKey, conversationId]);
  const streamingText = streamingByConv[convKey] ?? "";
  const status = statusByConv[convKey] ?? "active";
  const pendingConfirmation = pendingByConv[convKey] ?? null;
  const supportId = supportByConv[convKey] ?? null;

  // Human-handoff bridge (client-side): once this Smiley chat is handed off, the
  // specialist's replies + identity live in the linked support conversation. We
  // join that conversation over the support socket and merge the AGENT messages
  // into this same thread so the user never leaves the Smiley screen. The user's
  // own messages already appear here (the backend bridges them), so we pull in
  // only agent-authored messages to avoid duplicates.
  const {
    socket: supportSocket,
    joinConversation: joinSupportRoom,
    leaveConversation: leaveSupportRoom,
  } = useContext(SupportSocketContext);
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
  const ratedConversationIds = useSmileaiStore.use.ratedConversationIds();
  const markConversationRated = useSmileaiStore.use.markConversationRated();
  const setToolBadge = useSmileaiStore.use.setToolBadge();
  const setDraftText = useSmileaiStore.use.setDraftText();
  const setLastOpenConversationId = useSmileaiStore.use.setLastOpenConversationId();
  const setStoreAgentName = useSmileaiStore.use.setAgentName();
  const storedAgentNameByConv = useSmileaiStore.use.agentNameByConversation();
  const storedAgentName = conversationId
    ? (storedAgentNameByConv[conversationId] ?? null)
    : null;

  /** True only while the message list area is waiting on its first fetch. */
  const [awaitingNetwork, setAwaitingNetwork] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citationSheet, setCitationSheet] = useState<SmileCitation[] | null>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  // Agent messages merged from the linked support conversation. Agent *identity*
  // is persisted in the Smile store so reopening a chat does not flash
  // "Connecting…" after Mayowa (or any specialist) has already claimed it.
  const [agentMessages, setAgentMessages] = useState<SmileMessage[]>([]);
  const [agentName, setAgentNameState] = useState<string | null>(storedAgentName);
  const agentNameRef = useRef<string | null>(storedAgentName);
  agentNameRef.current = agentName;

  const setAgentName = useCallback(
    (name: string | null) => {
      setAgentNameState(name);
      if (conversationId) setStoreAgentName(conversationId, name);
    },
    [conversationId, setStoreAgentName],
  );
  /** Reply target for the in-flight assistant turn (from ai.message.queued). */
  const [streamingReply, setStreamingReply] = useState<{
    messageId: string;
    replyToMessageId?: string | null;
    snippet?: string | null;
  } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const pendingCitationsRef = useRef<SmileCitation[]>([]);
  const activeConversationRef = useRef(conversationId);
  activeConversationRef.current = conversationId;
  // Memoise conversation creation so a burst of first messages never spawns
  // more than one conversation (each send awaits the same in-flight create).
  const createdConvIdRef = useRef<string | null>(null);
  const creatingConvPromiseRef = useRef<Promise<string | null> | null>(null);
  // Whether the user is pinned to the latest message. We only auto-scroll on
  // new content when true, so reading older history is never yanked down.
  const atBottomRef = useRef(true);

  const scrollToBottom = useCallback((animated: boolean) => {
    scrollRef.current?.scrollToEnd({ animated });
  }, []);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      atBottomRef.current =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - 120;
    },
    [],
  );

  const isHandedOff = status === "handed_off" || status === "handoff_pending";
  const isHandoffConnecting = status === "handoff_pending";
  // Prefer live/persisted name; fall back to a name already present on merged agent bubbles.
  const effectiveAgentName =
    agentName ??
    agentMessages.find((m) => !!m.senderName?.trim())?.senderName ??
    null;
  const isClosed = isTerminalConversationStatus(status);
  const hasRated = conversationId
    ? !!ratedConversationIds[conversationId]
    : false;
  const showWelcome = !conversationId && messages.length === 0 && !awaitingNetwork;

  // Reset merged agent messages when switching chats; restore known agent name
  // from the persisted store so the banner never flashes "Connecting…".
  useEffect(() => {
    setAgentMessages([]);
    const cached = conversationId
      ? (useSmileaiStore.getState().agentNameByConversation[conversationId] ?? null)
      : null;
    setAgentNameState(cached);
  }, [conversationId]);

  // While handed off, load the specialist's side once and join the support room
  // so their replies flow into this same thread.
  useEffect(() => {
    if (!isHandedOff || !supportId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchConversationById(supportId);
        const conv = res.data.conversation;
        if (cancelled) return;
        const claimedName =
          conv.assigned_admin_name?.trim() ||
          (conv.messages ?? []).find((m) => !m.is_from_user && m.sender_name?.trim())
            ?.sender_name ||
          null;
        // Never wipe a known agent name with null during a background refetch.
        if (claimedName) setAgentName(claimedName);
        setAgentMessages(
          (conv.messages ?? [])
            .filter((m) => !m.is_from_user)
            .map((m) =>
              agentMessageToSmile(
                m,
                claimedName ?? agentNameRef.current ?? m.sender_name,
              ),
            ),
        );
      } catch {
        // Best-effort: live agent replies still arrive over the socket below.
      }
    })();
    joinSupportRoom(supportId);
    return () => {
      cancelled = true;
      leaveSupportRoom(supportId);
    };
  }, [isHandedOff, supportId, joinSupportRoom, leaveSupportRoom]);

  // Live: merge new agent replies and the specialist's identity from the support
  // socket. Only agent messages are merged — the user's own messages already
  // render in this thread, and their echo (is_from_user) is skipped.
  useEffect(() => {
    if (!supportSocket || !supportId || !isHandedOff) return;
    const onNewMessage = (data: {
      conversation_id: string;
      message: SupportMessage;
    }) => {
      if (data.conversation_id !== supportId || data.message.is_from_user) return;
      setAgentMessages((prev) =>
        prev.some((m) => m.id === data.message.id)
          ? prev
          : [...prev, agentMessageToSmile(data.message, agentNameRef.current)],
      );
    };
    const onClaimed = (data: {
      conversation_id: string;
      assigned_admin_name: string;
    }) => {
      if (data.conversation_id !== supportId) return;
      setAgentName(data.assigned_admin_name);
    };
    supportSocket.on("new_message", onNewMessage);
    supportSocket.on("conversation_claimed", onClaimed);
    return () => {
      supportSocket.off("new_message", onNewMessage);
      supportSocket.off("conversation_claimed", onClaimed);
    };
  }, [supportSocket, supportId, isHandedOff]);

  // Smiley messages + merged agent messages, ordered by time for display.
  const displayMessages = useMemo(() => {
    if (agentMessages.length === 0) return messages;
    return [...messages, ...agentMessages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [messages, agentMessages]);

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

  const loadConversation = useCallback(
    async (convId: string, opts?: { force?: boolean }) => {
      const force = opts?.force === true;
      const cached =
        useSmileaiStore.getState().messagesByConversation[convId] ?? [];
      const lastFetch = conversationFetchedAt.get(convId) ?? 0;
      const isFresh = Date.now() - lastFetch < CONVERSATION_STALE_MS;

      if (!force && cached.length > 0 && isFresh) {
        const tail = cached[cached.length - 1];
        lastMessageIdRef.current = tail?.id ?? null;
        setLastOpenConversationId(convId);
        joinConversation(convId);
        setAwaitingNetwork(false);
        return;
      }

      if (cached.length === 0) {
        setAwaitingNetwork(true);
      }
      setError(null);

      const existing = conversationFetchInflight.get(convId);
      if (existing && !force) {
        await existing;
        return;
      }

      const fetchPromise = (async () => {
        try {
          const res = await fetchSmileConversation(convId);
          if (activeConversationRef.current !== convId) return;
          const data = res.data;
          const serverMessages = data.messages ?? [];
          const current =
            useSmileaiStore.getState().messagesByConversation[convId] ?? [];
          const merged =
            current.length > 0
              ? mergeSmileMessages(current, serverMessages)
              : serverMessages;
          setMessages(convId, merged);
          setStatus(convId, data.status);
          if (data.user_has_rated) {
            markConversationRated(convId);
          }
          if (data.support_conversation_id) {
            setSupportConversationId(convId, data.support_conversation_id);
          }
          const tail = merged[merged.length - 1];
          lastMessageIdRef.current = tail?.id ?? null;
          setLastOpenConversationId(convId);
          joinConversation(convId);
          conversationFetchedAt.set(convId, Date.now());

          const after = lastAssistantMessageId(merged);
          if (after) {
            try {
              const back = await backfillSmileMessages(convId, { after });
              if (activeConversationRef.current !== convId) return;
              const items = back.data?.items ?? [];
              if (items.length > 0) {
                const latest =
                  useSmileaiStore.getState().messagesByConversation[convId] ?? [];
                const withBackfill = mergeSmileMessages(latest, items);
                setMessages(convId, withBackfill);
                lastMessageIdRef.current =
                  withBackfill[withBackfill.length - 1]?.id ??
                  lastMessageIdRef.current;
              }
            } catch {
              /* backfill is best-effort */
            }
          }
        } catch {
          if (activeConversationRef.current === convId) {
            setError(
              `${SMILEY_ASSISTANT_NAME} is offline. Try again, or connect to a specialist agent.`,
            );
          }
        } finally {
          if (activeConversationRef.current === convId) {
            setAwaitingNetwork(false);
          }
        }
      })();

      conversationFetchInflight.set(convId, fetchPromise);
      try {
        await fetchPromise;
      } finally {
        conversationFetchInflight.delete(convId);
      }
    },
    [
      joinConversation,
      setMessages,
      setStatus,
      setSupportConversationId,
      setLastOpenConversationId,
      markConversationRated,
    ],
  );

  useEffect(() => {
    if (!conversationId) {
      setError(null);
      setAwaitingNetwork(false);
      return;
    }

    const cached =
      useSmileaiStore.getState().messagesByConversation[conversationId] ?? [];
    setAwaitingNetwork(cached.length === 0);
    void loadConversation(conversationId);

    return () => {
      leaveConversation(conversationId);
    };
  }, [conversationId, loadConversation, leaveConversation]);

  // Reset the memoised conversation-creation state whenever we're back on a
  // brand-new chat (e.g. the user tapped "new chat").
  useEffect(() => {
    if (!conversationId) {
      createdConvIdRef.current = null;
      creatingConvPromiseRef.current = null;
    }
  }, [conversationId]);

  // Once the server hands us a real conversation id, migrate any optimistic
  // bubbles parked in the pending bucket — covers a burst of messages sent
  // before the conversation existed.
  useEffect(() => {
    if (conversationId) {
      migrateOptimisticMessages(PENDING_CONVERSATION_KEY, conversationId);
    }
  }, [conversationId, migrateOptimisticMessages]);

  // On opening a different conversation, pin to the bottom and jump to the
  // latest message once its content has laid out. Uses a non-animated scroll
  // so the view can never be stranded in empty space above the composer.
  useEffect(() => {
    atBottomRef.current = true;
    const t = setTimeout(() => scrollToBottom(false), 60);
    return () => clearTimeout(t);
  }, [conversationId, awaitingNetwork, scrollToBottom]);

  useEffect(() => {
    if (!conversationId) return;

    setHandlers({
      onQueued: ({
        conversation_id,
        message_id,
        reply_to_message_id,
        reply_to_snippet,
      }) => {
        if (conversation_id !== conversationId) return;
        setIsStreaming(true);
        // The assistant row exists now — promote pending user bubbles to
        // delivered and remember which message this turn is answering so the
        // quote can show as the reply streams in.
        markPendingUserMessagesSent(conversation_id);
        setStreamingReply({
          messageId: message_id,
          replyToMessageId: reply_to_message_id ?? null,
          snippet: reply_to_snippet ?? null,
        });
      },
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
      onComplete: ({
        conversation_id,
        message_id,
        suggestions: sug,
        reply_to_message_id,
        reply_to_snippet,
      }) => {
        if (conversation_id !== conversationId) return;
        setIsStreaming(false);
        setStreamingReply(null);
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
            {
              message_id: reply_to_message_id ?? null,
              snippet: reply_to_snippet ?? null,
            },
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
      },
      onError: ({ message }) => {
        setIsStreaming(false);
        setStreamingReply(null);
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

  const wasSocketConnectedRef = useRef(isConnected);
  useEffect(() => {
    if (!conversationId) return;
    const reconnected = !wasSocketConnectedRef.current && isConnected;
    wasSocketConnectedRef.current = isConnected;
    if (!reconnected) return;

    const reconnectBackfill = async () => {
      const msgs = useSmileaiStore.getState().messagesByConversation[conversationId] ?? [];
      const after = lastAssistantMessageId(msgs);
      if (!after) return;
      try {
        const res = await backfillSmileMessages(conversationId, { after });
        if (activeConversationRef.current !== conversationId) return;
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

  // Memoised: the first send creates the conversation; concurrent sends in
  // the same burst await the same promise instead of spawning duplicates.
  const ensureConversation = useCallback(async (): Promise<string | null> => {
    if (conversationId) return conversationId;
    if (createdConvIdRef.current) return createdConvIdRef.current;
    if (!creatingConvPromiseRef.current) {
      creatingConvPromiseRef.current = (async () => {
        const created = await startConversation();
        if (created) {
          createdConvIdRef.current = created;
          onConversationCreated(created);
        } else {
          creatingConvPromiseRef.current = null;
        }
        return created;
      })();
    }
    return creatingConvPromiseRef.current;
  }, [conversationId, startConversation, onConversationCreated]);

  const sendUserText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      // Never lock on a streaming reply — the user can keep firing messages and
      // the backend coalesces them. Block only closed chats; when handed off the
      // backend bridges the message to the specialist (no Smiley turn runs), so
      // the user keeps chatting in this same thread.
      if (!trimmed || isClosed) return;

      // 1. Show the bubble immediately. Until a server id exists, park it in
      //    the shared pending bucket (migrated on conversation creation by the
      //    effect above, which flips the render key at the same time).
      const clientMessageId = Crypto.randomUUID();
      const optimistic: SmileMessage = {
        id: clientMessageId,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
        localStatus: "sending",
      };
      const optimisticKey = conversationId ?? PENDING_CONVERSATION_KEY;
      appendUserMessage(optimisticKey, optimistic);
      atBottomRef.current = true;
      requestAnimationFrame(() => scrollToBottom(false));
      setDraftText("");
      // No Smiley turn runs while handed off (the message is bridged to the
      // specialist), so don't show the "awaiting" streaming state in that case.
      if (!isHandedOff) setIsStreaming(true);

      // 2. Ensure a conversation exists (memoised so a burst can't create
      //    duplicates). We deliberately do NOT pass `initial_text`.
      const convId = await ensureConversation();
      if (!convId) {
        showToast({ variant: "error", title: "Could not start chat. Try again." });
        setIsStreaming(false);
        return;
      }

      // 3. Emit. If the socket is down the message is queued and flushed on
      //    reconnect — never dropped. Tick to delivered only when it actually
      //    went out; a queued message keeps its clock until the reply lands.
      const delivery = emitSend(convId, clientMessageId, trimmed);
      if (delivery === "sent") {
        markMessageSent(convId, clientMessageId);
      } else {
        // Queued offline: don't imply Smiley is already replying.
        setIsStreaming(false);
      }
    },
    [
      conversationId,
      ensureConversation,
      appendUserMessage,
      markMessageSent,
      setDraftText,
      emitSend,
      showToast,
      isClosed,
      isHandedOff,
      scrollToBottom,
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
      markConversationRated(conversationId);
      showToast({ variant: "success", title: "Thanks for your feedback!" });
    } catch {
      showToast({ variant: "error", title: "Could not save rating." });
    } finally {
      setRatingSubmitting(false);
    }
  };

  const isSmileBusy =
    isStreaming && !pendingConfirmation && !isHandedOff;

  // Title shown under "Smiley" in the header — derived from the first user
  // message (same basis the server uses for the conversation-list title), so
  // the user sees what this chat is about instead of a second "Smiley".
  const conversationTitle = useMemo(() => {
    const firstUser = messages.find((m) => m.role === "user");
    const t = firstUser?.content.trim();
    if (!t) return null;
    return t.length > 32 ? `${t.slice(0, 31).trimEnd()}…` : t;
  }, [messages]);

  // While Smiley prepares a reply (thinking, running an action, or streaming),
  // the header reads like a human support queue rather than a chatbot status —
  // no "is typing…"/"is thinking…" personification.
  const statusLabel = isClosed
    ? "Closed"
    : isHandedOff
      ? effectiveAgentName
        ? `${firstWord(effectiveAgentName)} is attending to you`
        : isHandoffConnecting
          ? "Connecting you to a specialist…"
          : "You're with support"
      : isSmileBusy
        ? "Awaiting support response"
        : pendingConfirmation
          ? "Waiting for you…"
          : toolBadge
            ? "Awaiting support response"
            : isConnected
              ? (conversationTitle ?? "Customer support")
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
            <Text className="text-lg font-semibold" numberOfLines={1}>
              {SMILEY_ASSISTANT_NAME}
            </Text>
            <Text
              numberOfLines={1}
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
            agentName={effectiveAgentName}
            isConnecting={isHandoffConnecting && !effectiveAgentName}
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
          onScroll={handleScroll}
          scrollEventThrottle={64}
          onContentSizeChange={() => {
            if (atBottomRef.current) scrollToBottom(false);
          }}
          accessibilityLiveRegion="polite"
        >
        {showWelcome ? (
          <WelcomeCard
            firstName={user?.first_name ?? undefined}
            onChipPress={sendUserText}
            disabled={isSmileBusy}
          />
        ) : null}

        {awaitingNetwork && messages.length === 0 ? (
          <View className="items-center justify-center py-16">
            <ActivityIndicator
              size="large"
              color={isDark ? "#FB923C" : "#F58220"}
            />
            <Text className="mt-3 text-sm text-muted-foreground">
              Loading conversation…
            </Text>
          </View>
        ) : null}

        {error && messages.length === 0 && !awaitingNetwork ? (
          <View className="items-center px-4 py-12">
            <Text className="text-center text-base">{error}</Text>
            {conversationId ? (
              <Pressable
                className="mt-4"
                onPress={() => void loadConversation(conversationId, { force: true })}
                accessibilityRole="button"
                accessibilityLabel="Retry loading conversation"
              >
                <Text className="font-semibold text-primary">Try again</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {displayMessages.map((m, idx) => (
          <MessageBubble
            key={m.id}
            role={m.role}
            content={m.content}
            citations={m.citations}
            localStatus={m.localStatus}
            createdAt={m.createdAt}
            senderName={m.senderName ?? undefined}
            replyToSnippet={
              m.role === "assistant" &&
              shouldShowReplyQuote(
                m.reply_to_snippet,
                m.reply_to_message_id,
                displayMessages[idx - 1],
              )
                ? m.reply_to_snippet ?? undefined
                : undefined
            }
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
          <MessageBubble
            role="assistant"
            content={streamingText}
            plainText
            replyToSnippet={
              streamingReply &&
              shouldShowReplyQuote(
                streamingReply.snippet,
                streamingReply.replyToMessageId,
                messages[messages.length - 1],
              )
                ? streamingReply.snippet ?? undefined
                : undefined
            }
          />
        ) : null}

        {toolBadge ? (
          <View className="mb-2 self-start rounded-full bg-muted px-3 py-2">
            <Text className="text-xs text-muted-foreground">{toolBadge}</Text>
          </View>
        ) : null}

        {pendingConfirmation ? (
          <ConfirmActionCard
            title={
              CONFIRM_TITLES[pendingConfirmation.action] ??
              pendingConfirmation.action.replace(/_/g, " ")
            }
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
          {isClosed ? (
            <ClosedConversationFooter
              hasRated={hasRated}
              onSubmit={handleRatingSubmit}
              submitting={ratingSubmitting}
            />
          ) : (
            <>
              {showSuggestedReplies && suggestions.length > 0 && !isHandedOff ? (
                <QuickReplyBar
                  suggestions={suggestions}
                  onSelect={sendUserText}
                  disabled={false}
                />
              ) : null}

              <Composer
                value={draftText}
                onChange={setDraftText}
                onSend={() => sendUserText(draftText)}
                placeholder={
                  isHandedOff
                    ? effectiveAgentName
                      ? `Message ${firstWord(effectiveAgentName)}…`
                      : "Message the specialist…"
                    : `Message ${SMILEY_ASSISTANT_NAME}…`
                }
              />
            </>
          )}
        </View>
      </View>

      <CitationsSheet
        visible={citationSheet != null}
        citations={citationSheet ?? []}
        onClose={() => setCitationSheet(null)}
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
