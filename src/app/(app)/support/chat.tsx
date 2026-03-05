import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, router } from "expo-router";

import {
  fetchConversationById,
  rateConversation,
  sendSupportMessage,
} from "@/api";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useToastStore } from "@/components/ui/toast";
import { SupportSocketContext } from "@/context/support-socket";
import type { SupportMessage, SupportTicket } from "@/types";

const TYPING_DEBOUNCE_MS = 2500;

/** Cache conversation by id so reopening the same chat is instant (no full reload). */
type ConversationCacheEntry = {
  messages: SupportMessage[];
  assignedAdminName: string | null;
  status: string;
  ticket: SupportTicket | null;
  satisfactionRating: number | null;
};
const conversationCache = new Map<string, ConversationCacheEntry>();

const WELCOME_BULLETS = [
  "Report transaction or payment issues",
  "Get help with your account or verification",
  "Ask about limits, fees, or product features",
  "Report a bug or technical problem",
  "Request escalation to a formal support ticket",
];

function formatMessageTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

function firstWord(name: string | null): string {
  if (!name?.trim()) return "";
  return name.trim().split(/\s+/)[0] ?? "";
}

export default function SupportChatScreen() {
  const { id: conversationIdParam } = useLocalSearchParams<{ id?: string }>();
  const conversationId = conversationIdParam ?? null;
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const {
    socket,
    isConnected,
    joinConversation,
    leaveConversation,
    emitTyping,
    emitStopTyping,
  } = useContext(SupportSocketContext);

  const [conversationIdState, setConversationIdState] = useState<string | null>(
    conversationId,
  );
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [assignedAdminName, setAssignedAdminName] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("active");
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [satisfactionRating, setSatisfactionRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(!!conversationId);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [supportTyping, setSupportTyping] = useState(false);
  const [ratingValue, setRatingValue] = useState<number | null>(null);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);

  const currentConvId = conversationIdState ?? conversationId;
  const isClosed = status === "closed";
  const showRatingPrompt = isClosed && satisfactionRating === null;

  // Load existing conversation — use cache so reopening the same chat is instant
  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }
    const cached = conversationCache.get(conversationId);
    if (cached) {
      setMessages(cached.messages);
      setAssignedAdminName(cached.assignedAdminName);
      setStatus(cached.status);
      setTicket(cached.ticket);
      setSatisfactionRating(cached.satisfactionRating);
      setLoading(false);
      setError(null);
    }

    let cancelled = false;
    (async () => {
      try {
        if (!cached) setError(null);
        const response = await fetchConversationById(conversationId);
        const conv = response.data.conversation;
        if (!cancelled) {
          setMessages(conv.messages ?? []);
          setAssignedAdminName(conv.assigned_admin_name ?? null);
          setStatus(conv.status);
          setTicket(conv.ticket ?? null);
          setSatisfactionRating((prev) => conv.satisfaction_rating ?? prev);
          const existing = conversationCache.get(conversationId);
          conversationCache.set(conversationId, {
            messages: conv.messages ?? [],
            assignedAdminName: conv.assigned_admin_name ?? null,
            status: conv.status,
            ticket: conv.ticket ?? null,
            satisfactionRating: conv.satisfaction_rating ?? existing?.satisfactionRating ?? null,
          });
        }
      } catch {
        if (!cancelled && !cached) setError("Unable to load conversation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Use actual keyboard height so input bar sits flush on keyboard (like WhatsApp). Avoids
  // KeyboardAvoidingView gap on iOS.
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

  // Join / leave socket room
  useEffect(() => {
    if (!currentConvId) return;
    joinConversation(currentConvId);
    return () => leaveConversation(currentConvId);
  }, [currentConvId, joinConversation, leaveConversation]);

  // Socket: new_message — only append if we don't already have it (avoids duplicate when we
  // just sent: API response already replaced the optimistic message, then socket echoes the same message)
  useEffect(() => {
    if (!socket || !currentConvId) return;
    const handler = (data: { conversation_id: string; message: SupportMessage }) => {
      if (data.conversation_id !== currentConvId) return;
      setMessages((prev) => {
        const next =
          prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message];
        // Keep cache in sync so reopening this chat shows latest
        const entry = conversationCache.get(currentConvId);
        if (entry) conversationCache.set(currentConvId, { ...entry, messages: next });
        return next;
      });
    };
    socket.on("new_message", handler);
    return () => {
      socket.off("new_message", handler);
    };
  }, [socket, currentConvId]);

  // Socket: conversation_claimed
  useEffect(() => {
    if (!socket || !currentConvId) return;
    const handler = (data: {
      conversation_id: string;
      assigned_admin_name: string;
    }) => {
      if (data.conversation_id !== currentConvId) return;
      setAssignedAdminName(data.assigned_admin_name);
    };
    socket.on("conversation_claimed", handler);
    return () => {
      socket.off("conversation_claimed", handler);
    };
  }, [socket, currentConvId]);

  // Socket: conversation_closed
  useEffect(() => {
    if (!socket || !currentConvId) return;
    const handler = (data: { conversation_id: string }) => {
      if (data.conversation_id !== currentConvId) return;
      setStatus("closed");
    };
    socket.on("conversation_closed", handler);
    return () => {
      socket.off("conversation_closed", handler);
    };
  }, [socket, currentConvId]);

  // Socket: ticket_created_from_conversation
  useEffect(() => {
    if (!socket || !currentConvId) return;
    const handler = (data: {
      conversation_id: string;
      ticket: SupportTicket;
    }) => {
      if (data.conversation_id !== currentConvId) return;
      setTicket(data.ticket);
      useToastStore.getState().show({
        variant: "info",
        title: "Ticket created",
        message: `Support ticket ${data.ticket.ticket_number} has been created for your issue.`,
      });
    };
    socket.on("ticket_created_from_conversation", handler);
    return () => {
      socket.off("ticket_created_from_conversation", handler);
    };
  }, [socket, currentConvId]);

  // Socket: typing / stop_typing
  useEffect(() => {
    if (!socket || !currentConvId) return;
    const onTyping = (data: { conversation_id: string; is_admin?: boolean }) => {
      if (data.conversation_id === currentConvId && data.is_admin) {
        setSupportTyping(true);
      }
    };
    const onStopTyping = (data: { conversation_id: string }) => {
      if (data.conversation_id === currentConvId) setSupportTyping(false);
    };
    socket.on("typing", onTyping);
    socket.on("stop_typing", onStopTyping);
    return () => {
      socket.off("typing", onTyping);
      socket.off("stop_typing", onStopTyping);
    };
  }, [socket, currentConvId]);

  // User typing debounce
  useEffect(() => {
    if (!inputText.trim() || !currentConvId) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    const now = Date.now();
    if (now - lastTypingEmitRef.current > TYPING_DEBOUNCE_MS) {
      emitTyping(currentConvId);
      lastTypingEmitRef.current = now;
    }
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping(currentConvId);
      typingTimeoutRef.current = null;
    }, TYPING_DEBOUNCE_MS);
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [inputText, currentConvId, emitTyping, emitStopTyping]);

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    Keyboard.dismiss();
    setInputText("");
    setSending(true);

    const optimistic: SupportMessage = {
      id: `opt-${Date.now()}`,
      message: text,
      is_from_user: true,
      sender_name: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const response = await sendSupportMessage({
        message: text,
        conversation_id: conversationIdState ?? undefined,
      });
      const data = response.data;

      if (data.is_new && "conversation" in data) {
        const conv = data.conversation;
        const id = conv.id;
        setConversationIdState(id);
        const msgs = conv.messages ?? [];
        setMessages(msgs);
        setAssignedAdminName(conv.assigned_admin_name ?? null);
        conversationCache.set(id, {
          messages: msgs,
          assignedAdminName: conv.assigned_admin_name ?? null,
          status: conv.status,
          ticket: conv.ticket ?? null,
          satisfactionRating: conv.satisfaction_rating ?? null,
        });
      } else if (!data.is_new && "message" in data) {
        const created_at =
          data.message.created_at ??
          (data.message as { createdAt?: string }).createdAt ??
          "";
        const serverMessage = { ...data.message, created_at };
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id === optimistic.id ? serverMessage : m,
          );
          // Dedupe by id in case socket already pushed the same message
          return next.filter(
            (m, i) => next.findIndex((x) => x.id === m.id) === i,
          );
        });
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      useToastStore.getState().show({
        variant: "error",
        title: "Send failed",
        message: "Could not send message. Try again.",
      });
    } finally {
      setSending(false);
    }
  }, [inputText, sending, conversationIdState]);

  const submitRating = useCallback(async () => {
    if (ratingValue === null || !currentConvId) return;
    setRatingSubmitting(true);
    try {
      await rateConversation(currentConvId, {
        rating: ratingValue,
        feedback: ratingFeedback.trim() || undefined,
      });
      setSatisfactionRating(ratingValue);
      const entry = conversationCache.get(currentConvId);
      if (entry) {
        conversationCache.set(currentConvId, { ...entry, satisfactionRating: ratingValue });
      }
      useToastStore.getState().show({
        variant: "success",
        title: "Thank you",
        message: "Your rating has been submitted.",
      });
    } catch {
      useToastStore.getState().show({
        variant: "error",
        title: "Error",
        message: "Could not submit rating.",
      });
    } finally {
      setRatingSubmitting(false);
    }
  }, [ratingValue, ratingFeedback, currentConvId]);

  const bg = isDark ? "#0F172A" : "#F8F9FB";
  const cardBg = isDark ? "#1E293B" : "#FFFFFF";
  const bubbleUser = isDark ? "#1E3A5F" : "#FFF3E8";
  const bubbleSupport = isDark ? "#334155" : "#F3F4F6";

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1" style={{ backgroundColor: bg }}>
          <FullPageLoader message="Loading..." />
        </View>
      </>
    );
  }

  if (error && conversationId) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: bg }}>
          <Text className="text-center text-muted-foreground">{error}</Text>
          <Button variant="outline" className="mt-4" onPress={() => router.back()}>
            <Text>Go back</Text>
          </Button>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: bg }}>
        <View
          className="flex-row items-center justify-between border-b border-border px-4 pb-3 pt-12"
          style={{ backgroundColor: cardBg }}
        >
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6" }}
          >
            <Ionicons name="chevron-back" size={20} color={isDark ? "#E5E7EB" : "#111827"} />
          </Pressable>
          <View className="flex-1 items-center px-2">
            <Text className="text-center text-base font-semibold text-foreground" numberOfLines={1}>
              {assignedAdminName
                ? `(${firstWord(assignedAdminName)} is attending to you)`
                : "Waiting for support"}
            </Text>
            {messages.length > 0 && (
              <Text className="mt-0.5 text-center text-[11px] text-muted-foreground" numberOfLines={1}>
                {messages[messages.length - 1].is_from_user
                  ? "Awaiting SmiPay support"
                  : "Awaiting your reply"}
              </Text>
            )}
          </View>
          <View className="h-9 w-9" />
        </View>

        {ticket && (
          <View
            className="mx-4 mt-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: isDark ? "#1E3A5F" : "#FFF3E8" }}
          >
            <Text className="text-xs font-medium text-primary">
              Ticket: {ticket.ticket_number}
            </Text>
          </View>
        )}

        <View className="flex-1">
          <ScrollView
            ref={scrollRef}
            className="flex-1 px-4 py-3"
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 && !currentConvId && (
              <View className="flex-1 justify-center px-4 py-8">
                <View
                  className="rounded-2xl border border-border p-6"
                  style={{ backgroundColor: cardBg }}
                >
                  <View className="items-center">
                    <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <Ionicons name="chatbubbles-outline" size={28} color="#F4831F" />
                    </View>
                    <Text className="text-center text-lg font-semibold text-foreground">
                      Welcome to SmiPay Support
                    </Text>
                  </View>
                  <Text className="mt-3 text-center text-sm leading-5 text-muted-foreground">
                    Send a live chat and our team will respond within minutes.
                  </Text>
                  <Text className="mt-4 text-sm font-medium text-foreground">
                    You can:
                  </Text>
                  {WELCOME_BULLETS.map((item, i) => (
                    <View key={i} className="mt-2 flex-row">
                      <Text className="mr-2 text-primary">•</Text>
                      <Text className="flex-1 text-sm text-muted-foreground">
                        {item}
                      </Text>
                    </View>
                  ))}
                  <Text className="mt-5 border-t border-border pt-4 text-center text-xs leading-5 text-muted-foreground">
                    If we are unable to resolve your issue in time, a support ticket will be
                    created and followed up by the appropriate team.
                  </Text>
                </View>
              </View>
            )}
            {messages.map((msg) => (
              <View
                key={msg.id}
                className={`mb-2 max-w-[85%] self-${msg.is_from_user ? "end" : "start"} rounded-2xl px-4 py-2.5`}
                style={{
                  backgroundColor: msg.is_from_user ? bubbleUser : bubbleSupport,
                }}
              >
                <Text className="text-sm text-foreground">{msg.message}</Text>
                <Text className="mt-1 text-xs text-muted-foreground">
                  {formatMessageTime(msg.created_at ?? (msg as { createdAt?: string }).createdAt ?? "")}
                </Text>
              </View>
            ))}
            {supportTyping && (
              <View
                className="mb-2 max-w-[85%] self-start rounded-2xl px-4 py-2.5"
                style={{ backgroundColor: bubbleSupport }}
              >
                <Text className="text-sm italic text-muted-foreground">
                  Support is typing...
                </Text>
              </View>
            )}

            {isClosed && satisfactionRating !== null && (
              <View
                className="mt-4 rounded-2xl border border-border p-4"
                style={{ backgroundColor: cardBg }}
              >
                <Text className="text-sm text-muted-foreground">
                  You rated this conversation {satisfactionRating}/5
                </Text>
              </View>
            )}
            {showRatingPrompt && (
              <View
                className="mt-4 rounded-2xl border border-border p-4"
                style={{ backgroundColor: cardBg }}
              >
                <Text className="text-sm font-medium text-foreground">
                  Rate this conversation
                </Text>
                <View className="mt-2 flex-row gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setRatingValue(star)}
                      className="p-1"
                    >
                      <Ionicons
                        name={ratingValue === star ? "star" : "star-outline"}
                        size={28}
                        color="#F4831F"
                      />
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  className="mt-3 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Optional feedback"
                  placeholderTextColor="#9CA3AF"
                  value={ratingFeedback}
                  onChangeText={setRatingFeedback}
                  multiline
                />
                <Button
                  className="mt-3"
                  disabled={ratingValue === null || ratingSubmitting}
                  onPress={submitRating}
                >
                  <Text className="font-semibold text-primary-foreground">
                    {ratingSubmitting ? "Submitting..." : "Submit rating"}
                  </Text>
                </Button>
              </View>
            )}
          </ScrollView>

          {!isClosed && (
            <View
              className="flex-row items-end gap-2 border-t border-border px-4 py-3"
              style={{
                backgroundColor: cardBg,
                paddingBottom: keyboardHeight > 0 ? keyboardHeight : Math.max(12, insets.bottom),
              }}
            >
              <TextInput
                className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground"
                placeholder="Type a message..."
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={5000}
                editable={!sending}
              />
              <Pressable
                onPress={sendMessage}
                disabled={!inputText.trim() || sending}
                className="h-12 w-12 items-center justify-center rounded-full bg-primary active:opacity-80"
              >
                <Ionicons
                  name="send"
                  size={20}
                  color="#fff"
                />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </>
  );
}
