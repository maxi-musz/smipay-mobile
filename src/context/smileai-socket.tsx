import React, { createContext, useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { useAuthStore } from "@/store";
import type { SmileCitation, SmileConfirmRequestedPayload } from "@/types/smileai";

function getSmileaiSocketUrl(): string {
  const base = __DEV__
    ? (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:1500")
    : process.env.EXPO_PUBLIC_API_BASE_URL!;
  const version = process.env.EXPO_PUBLIC_API_VERSION ?? "/api/v1";
  try {
    return new URL(`${base}${version}`).origin;
  } catch {
    return base;
  }
}

export type SmileaiSocketHandlers = {
  onDelta?: (payload: {
    conversation_id: string;
    message_id: string;
    text: string;
    seq: number;
  }) => void;
  onCitations?: (payload: {
    conversation_id: string;
    message_id: string;
    citations: SmileCitation[];
  }) => void;
  onComplete?: (payload: {
    conversation_id: string;
    message_id: string;
    suggestions?: string[];
  }) => void;
  onToolRequested?: (payload: {
    conversation_id: string;
    message_id: string;
    tool_call_id: string;
    action: string;
    input_preview?: unknown;
  }) => void;
  onToolCompleted?: (payload: {
    conversation_id: string;
    message_id: string;
    tool_call_id: string;
    ok: boolean;
    output_preview?: unknown;
  }) => void;
  onConfirmRequested?: (payload: SmileConfirmRequestedPayload) => void;
  onHandoffRequested?: (payload: { conversation_id: string; trigger: string }) => void;
  onHandoffCompleted?: (payload: {
    conversation_id: string;
    support_conversation_id: string;
  }) => void;
  onConversationClosed?: (payload: { conversation_id: string }) => void;
  onError?: (payload: { code: string; message: string; conversation_id?: string }) => void;
};

interface SmileaiSocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  startConversation: (opts?: {
    persona?: string;
    initial_text?: string;
  }) => Promise<string | null>;
  joinConversation: (conversationId: string, afterSeq?: number) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (
    conversationId: string,
    clientMessageId: string,
    text: string,
  ) => void;
  respondConfirm: (
    conversationId: string,
    confirmationId: string,
    accept: boolean,
    stepUpToken?: string,
  ) => void;
  requestHandoff: (conversationId: string) => void;
  setHandlers: (handlers: SmileaiSocketHandlers | null) => void;
  onModeChanged: ((handler: ((p: any) => void) | null) => void);
}

export const SmileaiSocketContext = createContext<SmileaiSocketContextValue>({
  socket: null,
  isConnected: false,
  startConversation: async () => null,
  joinConversation: () => {},
  leaveConversation: () => {},
  sendMessage: () => {},
  respondConfirm: () => {},
  requestHandoff: () => {},
  setHandlers: () => {},
  onModeChanged: () => {},
});

export function SmileaiSocketProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const joinedIdRef = useRef<string | null>(null);
  const handlersRef = useRef<SmileaiSocketHandlers | null>(null);

  const setHandlers = useCallback((handlers: SmileaiSocketHandlers | null) => {
    handlersRef.current = handlers;
  }, []);

  useEffect(() => {
    if (!token) {
      socket?.disconnect();
      setSocket(null);
      setIsConnected(false);
      joinedIdRef.current = null;
      return;
    }

    const url = getSmileaiSocketUrl();
    const s = io(`${url}/smileai`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    s.on("connect", () => {
      setIsConnected(true);
      if (joinedIdRef.current) {
        s.emit("ai.conversation.join", { conversation_id: joinedIdRef.current });
      }
    });
    s.on("disconnect", () => setIsConnected(false));
    s.on("connect_error", () => setIsConnected(false));

    s.on("ai.message.delta", (p) => handlersRef.current?.onDelta?.(p));
    s.on("ai.message.citations", (p) => handlersRef.current?.onCitations?.(p));
    s.on("ai.message.complete", (p) => handlersRef.current?.onComplete?.(p));
    s.on("ai.tool.requested", (p) => handlersRef.current?.onToolRequested?.(p));
    s.on("ai.tool.completed", (p) => handlersRef.current?.onToolCompleted?.(p));
    s.on("ai.confirm.requested", (p) => handlersRef.current?.onConfirmRequested?.(p));
    s.on("ai.handoff.requested", (p) => handlersRef.current?.onHandoffRequested?.(p));
    s.on("ai.handoff.completed", (p) => handlersRef.current?.onHandoffCompleted?.(p));
    s.on("ai.conversation.closed", (p) => handlersRef.current?.onConversationClosed?.(p));
    s.on("ai.error", (p) => handlersRef.current?.onError?.(p));
    s.on("ai.mode.changed", (p) => modeChangedHandlerRef.current?.(p));

    setSocket(s);
    return () => {
      s.removeAllListeners();
      s.disconnect();
      setSocket(null);
      setIsConnected(false);
      joinedIdRef.current = null;
    };
  }, [token]);

  const startConversation = useCallback(
    (opts?: { persona?: string; initial_text?: string }): Promise<string | null> => {
      return new Promise((resolve) => {
        if (!socket?.connected) {
          resolve(null);
          return;
        }
        const onCreated = (payload: { conversation_id: string }) => {
          socket.off("ai.conversation.created", onCreated);
          joinedIdRef.current = payload.conversation_id;
          socket.emit("ai.conversation.join", {
            conversation_id: payload.conversation_id,
          });
          resolve(payload.conversation_id);
        };
        socket.on("ai.conversation.created", onCreated);
        socket.emit("ai.conversation.start", {
          persona: opts?.persona,
          initial_text: opts?.initial_text,
          surface: "mobile",
        });
        setTimeout(() => {
          socket.off("ai.conversation.created", onCreated);
          resolve(null);
        }, 15000);
      });
    },
    [socket],
  );

  const joinConversation = useCallback(
    (conversationId: string, afterSeq?: number) => {
      joinedIdRef.current = conversationId;
      if (socket?.connected) {
        socket.emit("ai.conversation.join", {
          conversation_id: conversationId,
          ...(typeof afterSeq === "number" ? { after_seq: afterSeq } : {}),
        });
      }
    },
    [socket],
  );

  const leaveConversation = useCallback(
    (_conversationId: string) => {
      joinedIdRef.current = null;
    },
    [],
  );

  const sendMessage = useCallback(
    (conversationId: string, clientMessageId: string, text: string) => {
      socket?.emit("ai.message.user", {
        conversation_id: conversationId,
        client_message_id: clientMessageId,
        text,
        surface: "mobile",
      });
    },
    [socket],
  );

  const respondConfirm = useCallback(
    (
      conversationId: string,
      confirmationId: string,
      accept: boolean,
      stepUpToken?: string,
    ) => {
      socket?.emit("ai.confirm.respond", {
        conversation_id: conversationId,
        confirmation_id: confirmationId,
        accept,
        ...(stepUpToken ? { step_up_token: stepUpToken } : {}),
      });
    },
    [socket],
  );

  const modeChangedHandlerRef = useRef<((p: any) => void) | null>(null);
  const onModeChanged = useCallback((handler: ((p: any) => void) | null) => {
    modeChangedHandlerRef.current = handler;
  }, []);

  const requestHandoff = useCallback(
    (conversationId: string) => {
      socket?.emit("ai.handoff.request", { conversation_id: conversationId });
    },
    [socket],
  );

  const value: SmileaiSocketContextValue = {
    socket,
    isConnected,
    startConversation,
    joinConversation,
    leaveConversation,
    sendMessage,
    respondConfirm,
    requestHandoff,
    setHandlers,
    onModeChanged,
  };

  return (
    <SmileaiSocketContext.Provider value={value}>{children}</SmileaiSocketContext.Provider>
  );
}
