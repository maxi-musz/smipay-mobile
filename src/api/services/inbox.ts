import { api } from "@/lib/api";

const BASE = "/notifications/inbox";

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface InboxItem {
  id: string;
  user_id: string;
  broadcast_id: string | null;
  title: string;
  body: string;
  message: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  createdAt: string;
}

export interface InboxListData {
  items: InboxItem[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  pages: number;
}

export async function fetchInbox(page = 1, limit = 20): Promise<InboxListData> {
  const { data } = await api.get<ApiResponse<InboxListData>>(BASE, {
    params: { page, limit },
  });
  return (
    data?.data ?? {
      items: [],
      total: 0,
      unreadCount: 0,
      page: 1,
      limit: 20,
      pages: 0,
    }
  );
}

export async function fetchInboxItem(id: string): Promise<InboxItem | null> {
  const { data } = await api.get<ApiResponse<InboxItem>>(`${BASE}/${id}`);
  return data?.data ?? null;
}

export async function markAllInboxRead(): Promise<void> {
  await api.post(`${BASE}/mark-all-read`);
}
