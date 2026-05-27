/** SmileAI types — aligned with `/api/v1/smileai` and `/smileai` Socket.IO events. */

export type AIConversationStatus =
  | "active"
  | "awaiting_user"
  | "handoff_pending"
  | "handed_off"
  | "resolved"
  | "closed"
  | "abandoned";

export interface SmileCitation {
  document_id: string;
  chunk_id: string;
  doc_slug: string;
  heading: string;
  score: number;
}

export interface SmileMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: SmileCitation[];
  tool_calls?: unknown;
  tool_results?: unknown;
  tokens_in?: number | null;
  tokens_out?: number | null;
  latency_ms?: number | null;
  createdAt: string;
}

export interface SmileConversationListItem {
  id: string;
  status: AIConversationStatus;
  last_message_at: string | null;
  createdAt: string;
}

export interface SmileConversationDetail {
  id: string;
  status: AIConversationStatus;
  persona_id: string | null;
  last_message_at: string | null;
  support_conversation_id: string | null;
  messages: SmileMessage[];
}

export interface PendingConfirmation {
  confirmation_id: string;
  action: string;
  copy: string;
  expires_at?: string;
}

export interface StartConversationPayload {
  persona?: string;
  initial_text?: string;
  surface?: "mobile" | "web";
}

export interface SendSmileMessagePayload {
  client_message_id: string;
  text: string;
  surface?: "mobile";
}

export interface SubmitSmileRatingPayload {
  rating: number;
  feedback?: string;
}

export interface ConfirmSmileActionPayload {
  confirmation_id: string;
  accept: boolean;
}
