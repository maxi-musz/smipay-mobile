import React, { createContext, useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { useAuthStore } from "@/store";

function getSupportSocketUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:1500";
  const version = process.env.EXPO_PUBLIC_API_VERSION ?? "/api/v1";
  try {
    const origin = new URL(`${base}${version}`).origin;
    return origin;
  } catch {
    return base;
  }
}

interface SupportSocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  emitTyping: (conversationId: string) => void;
  emitStopTyping: (conversationId: string) => void;
}

export const SupportSocketContext = createContext<SupportSocketContextValue>({
  socket: null,
  isConnected: false,
  joinConversation: () => {},
  leaveConversation: () => {},
  emitTyping: () => {},
  emitStopTyping: () => {},
});

export function SupportSocketProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const joinedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        joinedIdRef.current = null;
      }
      return;
    }

    const url = getSupportSocketUrl();
    const s = io(`${url}/support`, {
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
        s.emit("join_conversation", { conversation_id: joinedIdRef.current });
      }
    });

    s.on("disconnect", () => setIsConnected(false));
    s.on("connect_error", () => setIsConnected(false));

    setSocket(s);
    return () => {
      s.removeAllListeners();
      s.disconnect();
      setSocket(null);
      setIsConnected(false);
      joinedIdRef.current = null;
    };
  }, [token]);

  const joinConversation = useCallback(
    (conversationId: string) => {
      joinedIdRef.current = conversationId;
      if (socket?.connected) {
        socket.emit("join_conversation", { conversation_id: conversationId });
      }
    },
    [socket],
  );

  const leaveConversation = useCallback(
    (conversationId: string) => {
      if (joinedIdRef.current === conversationId) {
        joinedIdRef.current = null;
      }
      socket?.emit("leave_conversation", { conversation_id: conversationId });
    },
    [socket],
  );

  const emitTyping = useCallback(
    (conversationId: string) => {
      socket?.emit("typing", { conversation_id: conversationId });
    },
    [socket],
  );

  const emitStopTyping = useCallback(
    (conversationId: string) => {
      socket?.emit("stop_typing", { conversation_id: conversationId });
    },
    [socket],
  );

  const value: SupportSocketContextValue = {
    socket,
    isConnected,
    joinConversation,
    leaveConversation,
    emitTyping,
    emitStopTyping,
  };

  return (
    <SupportSocketContext.Provider value={value}>
      {children}
    </SupportSocketContext.Provider>
  );
}
