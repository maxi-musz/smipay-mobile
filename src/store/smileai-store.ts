import { create } from "zustand";
import { persist } from "zustand/middleware";

import { listSmileConversations } from "@/api/services/smileai";
import type {
  PendingConfirmation,
  SmileConversationListItem,
  SmileMessage,
} from "@/types/smileai";
import { createPersistConfig } from "./middleware";
import { createSelectors } from "./create-selectors";
import { dedupeSmileMessages } from "@/components/smileai/message-utils";

interface SmileaiUiState {
  draftText: string;
  suggestedRepliesEnabled: boolean;
  soundEnabled: boolean;
  lastOpenConversationId: string | null;
}

interface SmileaiStoreState {
  conversations: SmileConversationListItem[];
  /** True when no conversation list is available yet and we are fetching for the first time. */
  isLoadingConversations: boolean;
  /** True when a list already exists but we are refreshing in the background. */
  isRefreshingConversations: boolean;
  conversationsLoadError: string | null;
  messagesByConversation: Record<string, SmileMessage[]>;
  streamingText: Record<string, string>;
  streamingMessageId: Record<string, string | null>;
  suggestions: Record<string, string[]>;
  pendingConfirmation: Record<string, PendingConfirmation | null>;
  supportConversationId: Record<string, string | null>;
  statusByConversation: Record<string, string>;
  toolBadge: Record<string, string | null>;
  ui: SmileaiUiState;
}

interface SmileaiStoreActions {
  loadConversations: () => Promise<void>;
  refreshConversationsSilently: () => Promise<void>;
  setConversations: (items: SmileConversationListItem[]) => void;
  setMessages: (conversationId: string, messages: SmileMessage[]) => void;
  appendUserMessage: (conversationId: string, message: SmileMessage) => void;
  /** Mark every still-pending user message in the conversation as delivered. */
  markPendingUserMessagesSent: (conversationId: string) => void;
  /** Mark a single optimistic user message as delivered by id. */
  markMessageSent: (conversationId: string, messageId: string) => void;
  /** Migrate optimistic messages from one (placeholder) conversation key to another. */
  migrateOptimisticMessages: (fromConversationId: string, toConversationId: string) => void;
  appendDelta: (conversationId: string, messageId: string, text: string) => void;
  finalizeAssistant: (
    conversationId: string,
    messageId: string,
    content: string,
    citations?: SmileMessage["citations"],
  ) => void;
  setSuggestions: (conversationId: string, suggestions: string[]) => void;
  setPendingConfirmation: (
    conversationId: string,
    confirmation: PendingConfirmation | null,
  ) => void;
  setSupportConversationId: (conversationId: string, supportId: string | null) => void;
  setStatus: (conversationId: string, status: string) => void;
  setToolBadge: (conversationId: string, label: string | null) => void;
  setDraftText: (text: string) => void;
  setLastOpenConversationId: (id: string | null) => void;
  resetConversationRuntime: (conversationId: string) => void;
}

type SmileaiStore = SmileaiStoreState & SmileaiStoreActions;

/** Persist top N chats by recent activity with at most M messages each. */
const PERSIST_CHAT_COUNT = 5;
const PERSIST_MESSAGES_PER_CHAT = 50;

function sortConversationsByRecency(items: SmileConversationListItem[]): SmileConversationListItem[] {
  return [...items].sort((a, b) => {
    const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return tb - ta;
  });
}

function buildSmilePersistSnapshot(state: SmileaiStoreState) {
  const sorted = sortConversationsByRecency(state.conversations);
  const topIds = new Set(sorted.slice(0, PERSIST_CHAT_COUNT).map((c) => c.id));

  const messagesByConversation: Record<string, SmileMessage[]> = {};
  const statusByConversation: Record<string, string> = {};
  const supportConversationId: Record<string, string | null> = {};

  for (const id of topIds) {
    const msgs = state.messagesByConversation[id];
    if (msgs?.length) {
      messagesByConversation[id] = msgs.slice(-PERSIST_MESSAGES_PER_CHAT);
    }
    if (state.statusByConversation[id]) {
      statusByConversation[id] = state.statusByConversation[id];
    }
    if (state.supportConversationId[id] !== undefined && state.supportConversationId[id] !== null) {
      supportConversationId[id] = state.supportConversationId[id];
    }
  }

  return {
    ui: state.ui,
    conversations: state.conversations,
    messagesByConversation,
    statusByConversation,
    supportConversationId,
  };
}

type PersistedSmileSlice = Partial<ReturnType<typeof buildSmilePersistSnapshot>>;

const initialState: SmileaiStoreState = {
  conversations: [],
  isLoadingConversations: false,
  isRefreshingConversations: false,
  conversationsLoadError: null,
  messagesByConversation: {},
  streamingText: {},
  streamingMessageId: {},
  suggestions: {},
  pendingConfirmation: {},
  supportConversationId: {},
  statusByConversation: {},
  toolBadge: {},
  ui: {
    draftText: "",
    suggestedRepliesEnabled: true,
    soundEnabled: true,
    lastOpenConversationId: null,
  },
};

const useSmileaiStoreBase = create<SmileaiStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      loadConversations: async () => {
        if (get().isLoadingConversations || get().isRefreshingConversations) return;

        const hasList = get().conversations.length > 0;
        if (hasList) {
          set({ isRefreshingConversations: true });
        } else {
          set({ isLoadingConversations: true });
        }

        try {
          const res = await listSmileConversations();
          const list = res.data?.items ?? [];
          const sorted = sortConversationsByRecency(list);
          set({
            conversations: sorted,
            isLoadingConversations: false,
            isRefreshingConversations: false,
            conversationsLoadError: null,
          });
        } catch {
          set({
            isLoadingConversations: false,
            isRefreshingConversations: false,
            conversationsLoadError: "Unable to load conversations.",
          });
        }
      },

      refreshConversationsSilently: async () => {
        if (get().isRefreshingConversations) return;
        set({ isRefreshingConversations: true });
        try {
          const res = await listSmileConversations();
          const list = res.data?.items ?? [];
          const sorted = sortConversationsByRecency(list);
          set({
            conversations: sorted,
            isRefreshingConversations: false,
            conversationsLoadError: null,
          });
        } catch {
          set({
            isRefreshingConversations: false,
            conversationsLoadError: "Unable to load conversations.",
          });
        }
      },

      setConversations: (items) => set({ conversations: sortConversationsByRecency(items) }),

      setMessages: (conversationId, messages) =>
        set((s) => {
          const prev = s.messagesByConversation[conversationId] ?? [];
          const serverIds = new Set(messages.map((m) => m.id));
          const serverUserText = new Set(
            messages
              .filter((m) => m.role === "user")
              .map((m) => m.content.trim()),
          );
          // Keep optimistic user bubbles until the server returns the same text.
          // Previously we only kept `sending`, so a message marked `sent` on
          // emit vanished when a fetch raced ahead of persistence.
          const survivingOptimistic = prev.filter(
            (m) =>
              m.role === "user" &&
              m.localStatus &&
              !serverIds.has(m.id) &&
              !serverUserText.has(m.content.trim()),
          );
          const merged = dedupeSmileMessages([
            ...messages,
            ...survivingOptimistic,
          ]);
          return {
            messagesByConversation: {
              ...s.messagesByConversation,
              [conversationId]: merged,
            },
          };
        }),

      appendUserMessage: (conversationId, message) =>
        set((s) => {
          const prev = s.messagesByConversation[conversationId] ?? [];
          const last = prev[prev.length - 1];
          if (
            last?.role === "user" &&
            last.content.trim() === message.content.trim() &&
            last.localStatus === "sending"
          ) {
            return {};
          }
          return {
            messagesByConversation: {
              ...s.messagesByConversation,
              [conversationId]: dedupeSmileMessages([...prev, message]),
            },
          };
        }),

      markPendingUserMessagesSent: (conversationId) =>
        set((s) => {
          const prev = s.messagesByConversation[conversationId] ?? [];
          let changed = false;
          const next = prev.map((m) => {
            if (m.role === "user" && m.localStatus === "sending") {
              changed = true;
              return { ...m, localStatus: "sent" as const };
            }
            return m;
          });
          if (!changed) return {};
          return {
            messagesByConversation: {
              ...s.messagesByConversation,
              [conversationId]: next,
            },
          };
        }),

      markMessageSent: (conversationId, messageId) =>
        set((s) => {
          const prev = s.messagesByConversation[conversationId] ?? [];
          const idx = prev.findIndex((m) => m.id === messageId);
          if (idx === -1) return {};
          const target = prev[idx];
          if (target.localStatus === "sent") return {};
          const next = prev.slice();
          next[idx] = { ...target, localStatus: "sent" };
          return {
            messagesByConversation: {
              ...s.messagesByConversation,
              [conversationId]: next,
            },
          };
        }),

      migrateOptimisticMessages: (fromConversationId, toConversationId) =>
        set((s) => {
          if (fromConversationId === toConversationId) return {};
          const carried = s.messagesByConversation[fromConversationId];
          if (!carried || carried.length === 0) return {};
          const target = s.messagesByConversation[toConversationId] ?? [];
          const existingIds = new Set(target.map((m) => m.id));
          const additions = carried.filter((m) => !existingIds.has(m.id));
          const nextMap = { ...s.messagesByConversation };
          delete nextMap[fromConversationId];
          nextMap[toConversationId] = dedupeSmileMessages([...target, ...additions]);
          return { messagesByConversation: nextMap };
        }),

      appendDelta: (conversationId, messageId, text) =>
        set((s) => ({
          streamingMessageId: {
            ...s.streamingMessageId,
            [conversationId]: messageId,
          },
          streamingText: {
            ...s.streamingText,
            [conversationId]: (s.streamingText[conversationId] ?? "") + text,
          },
        })),

      finalizeAssistant: (conversationId, messageId, content, citations) =>
        set((s) => {
          const prev = s.messagesByConversation[conversationId] ?? [];
          const withoutDup = prev.filter((m) => m.id !== messageId);
          const next = dedupeSmileMessages([
            ...withoutDup,
            {
              id: messageId,
              role: "assistant" as const,
              content,
              citations,
              createdAt: new Date().toISOString(),
            },
          ]);
          return {
            messagesByConversation: {
              ...s.messagesByConversation,
              [conversationId]: next,
            },
            streamingText: { ...s.streamingText, [conversationId]: "" },
            streamingMessageId: {
              ...s.streamingMessageId,
              [conversationId]: null,
            },
            toolBadge: { ...s.toolBadge, [conversationId]: null },
          };
        }),

      setSuggestions: (conversationId, suggestions) =>
        set((s) => ({
          suggestions: { ...s.suggestions, [conversationId]: suggestions },
        })),

      setPendingConfirmation: (conversationId, confirmation) =>
        set((s) => ({
          pendingConfirmation: {
            ...s.pendingConfirmation,
            [conversationId]: confirmation,
          },
        })),

      setSupportConversationId: (conversationId, supportId) =>
        set((s) => ({
          supportConversationId: {
            ...s.supportConversationId,
            [conversationId]: supportId,
          },
        })),

      setStatus: (conversationId, status) =>
        set((s) => ({
          statusByConversation: {
            ...s.statusByConversation,
            [conversationId]: status,
          },
        })),

      setToolBadge: (conversationId, label) =>
        set((s) => ({
          toolBadge: { ...s.toolBadge, [conversationId]: label },
        })),

      setDraftText: (text) =>
        set((s) => ({ ui: { ...s.ui, draftText: text } })),

      setLastOpenConversationId: (id) =>
        set((s) => ({ ui: { ...s.ui, lastOpenConversationId: id } })),

      resetConversationRuntime: (conversationId) =>
        set((s) => ({
          streamingText: { ...s.streamingText, [conversationId]: "" },
          streamingMessageId: {
            ...s.streamingMessageId,
            [conversationId]: null,
          },
          suggestions: { ...s.suggestions, [conversationId]: [] },
          toolBadge: { ...s.toolBadge, [conversationId]: null },
        })),
    }),
    createPersistConfig<SmileaiStore>("smileai", {
      partialize: (state) => buildSmilePersistSnapshot(state),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as PersistedSmileSlice | undefined;
        return {
          ...currentState,
          ui: {
            ...currentState.ui,
            ...(persisted?.ui ?? {}),
          },
          conversations:
            currentState.conversations.length > 0
              ? currentState.conversations
              : (persisted?.conversations ?? []),
          messagesByConversation: {
            ...(persisted?.messagesByConversation ?? {}),
            ...currentState.messagesByConversation,
          },
          statusByConversation: {
            ...(persisted?.statusByConversation ?? {}),
            ...currentState.statusByConversation,
          },
          supportConversationId: {
            ...(persisted?.supportConversationId ?? {}),
            ...currentState.supportConversationId,
          },
        };
      },
    }),
  ),
);

export const useSmileaiStore = createSelectors(useSmileaiStoreBase);
