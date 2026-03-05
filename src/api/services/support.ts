import * as Application from "expo-application";
import * as Device from "expo-device";
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

function getDeviceMetadataForSupport() {
  try {
    return {
      device_id: Application.applicationName ?? undefined,
      device_model: Device.deviceName ?? undefined,
      platform: Platform.OS,
      app_version: Application.nativeApplicationVersion ?? undefined,
    };
  } catch {
    return { platform: Platform.OS };
  }
}

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
  const meta = getDeviceMetadataForSupport();
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
