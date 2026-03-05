/** Support conversation & chat types — match backend API exactly. */

export type ConversationStatus =
  | "active"
  | "waiting_support"
  | "waiting_user"
  | "closed";

export interface SupportMessage {
  id: string;
  message: string;
  is_from_user: boolean;
  sender_name: string | null;
  sender_email?: string | null;
  attachments?: unknown | null;
  created_at: string;
  createdAt?: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  support_type: string;
}

export interface SupportConversation {
  id: string;
  status: ConversationStatus;
  email?: string;
  phone_number?: string | null;
  assigned_admin_name: string | null;
  satisfaction_rating: number | null;
  feedback: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  messages?: SupportMessage[];
  total_messages?: number;
  ticket: SupportTicket | null;
}

export interface ConversationListItem {
  id: string;
  status: ConversationStatus;
  assigned_admin_name: string | null;
  message_count: number;
  last_message: {
    message: string;
    is_from_user: boolean;
    sender_name: string | null;
    createdAt: string;
  } | null;
  has_unread: boolean;
  ticket: SupportTicket | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  satisfaction_rating: number | null;
}

export interface ConversationsListData {
  conversations: ConversationListItem[];
  total: number;
}

export interface SendMessagePayload {
  message: string;
  conversation_id?: string;
  device_metadata?: {
    device_id?: string;
    device_model?: string;
    platform?: string;
    app_version?: string;
  };
}

/** Response when sending creates new conversation */
export interface SendMessageNewResponse {
  conversation: SupportConversation;
  is_new: true;
}

/** Response when sending to existing conversation */
export interface SendMessageExistingResponse {
  conversation_id: string;
  message: SupportMessage;
  is_new: false;
}

export type SendMessageData = SendMessageNewResponse | SendMessageExistingResponse;

export interface RateConversationPayload {
  rating: number;
  feedback?: string;
}
