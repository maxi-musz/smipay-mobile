import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  PendingConfirmation,
  SmileConversationListItem,
  SmileMessage,
} from "@/types/smileai";
import { createSelectors } from "./create-selectors";

interface SmileaiUiState {
  draftText: string;
  suggestedRepliesEnabled: boolean;
  soundEnabled: boolean;
  lastOpenConversationId: string | null;
}

interface SmileaiStoreState {
  conversations: SmileConversationListItem[];
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
  setConversations: (items: SmileConversationListItem[]) => void;
  setMessages: (conversationId: string, messages: SmileMessage[]) => void;
  appendUserMessage: (conversationId: string, message: SmileMessage) => void;
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

const useSmileaiStoreBase = create<SmileaiStore>()(
  persist(
    (set, get) => ({
      conversations: [],
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

      setConversations: (items) => set({ conversations: items }),

      setMessages: (conversationId, messages) =>
        set((s) => ({
          messagesByConversation: {
            ...s.messagesByConversation,
            [conversationId]: messages,
          },
        })),

      appendUserMessage: (conversationId, message) =>
        set((s) => {
          const prev = s.messagesByConversation[conversationId] ?? [];
          return {
            messagesByConversation: {
              ...s.messagesByConversation,
              [conversationId]: [...prev, message],
            },
          };
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
          return {
            messagesByConversation: {
              ...s.messagesByConversation,
              [conversationId]: [
                ...withoutDup,
                {
                  id: messageId,
                  role: "assistant",
                  content,
                  citations,
                  createdAt: new Date().toISOString(),
                },
              ],
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
    {
      name: "smileai-store",
      storage: {
        getItem: async (name) => {
          const v = await AsyncStorage.getItem(name);
          return v ? JSON.parse(v) : null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => AsyncStorage.removeItem(name),
      },
      partialize: (state) => ({
        ui: state.ui,
      }),
    },
  ),
);

export const useSmileaiStore = createSelectors(useSmileaiStoreBase);
