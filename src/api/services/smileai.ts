import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";
import type {
  ConfirmSmileActionPayload,
  SendSmileMessagePayload,
  SmileConversationDetail,
  SmileConversationListItem,
  SmileMessage,
  StartConversationPayload,
  SubmitSmileRatingPayload,
} from "@/types/smileai";

const SMILEAI = "/smileai";

export async function startSmileConversation(payload: StartConversationPayload = {}) {
  const { data } = await api.post<
    ApiResponse<{ conversation_id: string; status: string; persona: string }>
  >(`${SMILEAI}/conversations`, { ...payload, surface: "mobile" });
  return data;
}

export async function listSmileConversations(limit = 20) {
  const { data } = await api.get<
    ApiResponse<{ items: SmileConversationListItem[]; limit: number }>
  >(`${SMILEAI}/conversations`, { params: { limit } });
  return data;
}

export async function fetchSmileConversation(id: string, tail = 50) {
  const { data } = await api.get<ApiResponse<SmileConversationDetail>>(
    `${SMILEAI}/conversations/${id}`,
    { params: { tail } },
  );
  return data;
}

export async function backfillSmileMessages(
  id: string,
  options: { after?: string; limit?: number } = {},
) {
  const { data } = await api.get<ApiResponse<{ items: SmileMessage[]; limit: number }>>(
    `${SMILEAI}/conversations/${id}/messages`,
    { params: options },
  );
  return data;
}

export async function sendSmileMessageRest(
  conversationId: string,
  payload: SendSmileMessagePayload,
) {
  const { data } = await api.post<ApiResponse<unknown>>(
    `${SMILEAI}/conversations/${conversationId}/messages`,
    { ...payload, surface: "mobile" },
  );
  return data;
}

export async function confirmSmileAction(
  conversationId: string,
  payload: ConfirmSmileActionPayload,
) {
  const { data } = await api.post<ApiResponse<unknown>>(
    `${SMILEAI}/conversations/${conversationId}/confirm`,
    payload,
  );
  return data;
}

export async function requestSmileHandoff(conversationId: string) {
  const { data } = await api.post<
    ApiResponse<{ support_conversation_id: string; handoff_id?: string }>
  >(`${SMILEAI}/conversations/${conversationId}/handoff`);
  return data;
}

export async function submitSmileRating(
  conversationId: string,
  payload: SubmitSmileRatingPayload,
) {
  const { data } = await api.post<ApiResponse<unknown>>(
    `${SMILEAI}/conversations/${conversationId}/rating`,
    payload,
  );
  return data;
}

export async function closeSmileConversation(conversationId: string) {
  const { data } = await api.post<ApiResponse<unknown>>(
    `${SMILEAI}/conversations/${conversationId}/close`,
  );
  return data;
}
