import * as Application from "expo-application";
import { Platform } from "react-native";

import { api } from "@/lib/api";
import type {
  ApiResponse,
  ConversationsListData,
  SendMessageData,
  SendMessagePayload,
  SupportConversation,
  RateConversationPayload,
} from "@/types";

const SUPPORT = "/support";

async function getDeviceMetadataForSupport() {
  try {
    const [applicationName, nativeAppVersion, deviceName] = await Promise.all([
      Application.getApplicationNameAsync?.() ?? Promise.resolve(""),
      Application.nativeApplicationVersion ?? null,
      import("expo-device").then((d) => d.Device?.deviceName ?? null),
    ]);
    return {
      device_id: applicationName || undefined,
      device_model: deviceName ?? undefined,
      platform: Platform.OS,
      app_version: nativeApplicationVersion ?? undefined,
    };
  } catch {
    return { platform: Platform.OS };
  }
}

const nativeApplicationVersion: string | null = Application.nativeApplicationVersion ?? null;

export async function fetchConversations() {
  const { data } = await api.get<ApiResponse<ConversationsListData>>(
    `${SUPPORT}/conversations`,
  );
  return data;
}

export async function fetchConversationById(id: string) {
  const { data } = await api.get<ApiResponse<{ conversation: SupportConversation }>>(
    `${SUPPORT}/conversations/${id}`,
  );
  return data;
}

export async function sendSupportMessage(payload: SendMessagePayload) {
  const body: SendMessagePayload = {
    message: payload.message,
    conversation_id: payload.conversation_id,
  };
  const meta = await getDeviceMetadataForSupport();
  if (Object.keys(meta).length > 0) {
    body.device_metadata = meta;
  }
  const { data } = await api.post<ApiResponse<SendMessageData>>(
    `${SUPPORT}/chat/send`,
    body,
  );
  return data;
}

export async function rateConversation(conversationId: string, payload: RateConversationPayload) {
  const { data } = await api.post<ApiResponse<unknown>>(
    `${SUPPORT}/conversations/${conversationId}/rate`,
    payload,
  );
  return data;
}
