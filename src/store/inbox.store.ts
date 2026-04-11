import { create } from "zustand";

import { fetchInbox, fetchInboxItem, markAllInboxRead, type InboxItem } from "@/api";
import { createSelectors } from "./create-selectors";

/** Skip list refetch when revisiting inbox within this window (pull-to-refresh still forces). */
const LIST_STALE_MS = 90_000;

interface InboxState {
  items: InboxItem[];
  page: number;
  pages: number;
  hasMore: boolean;
  total: number;
  unreadCount: number;
  /** Full item cache for detail + deduping fetches */
  detailById: Record<string, InboxItem>;
  lastListFetchedAt: number | null;
  isLoadingList: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

interface InboxActions {
  /** Page 1; uses cache when fresh unless `force`. */
  fetchInboxFirstPage: (opts?: { force?: boolean }) => Promise<void>;
  fetchNextPage: () => Promise<void>;
  /**
   * Resolve one item for the detail screen.
   * Uses cache when already read; fetches once when unread (marks read on server).
   */
  ensureInboxItem: (id: string, opts?: { force?: boolean }) => Promise<InboxItem | null>;
  markAllRead: () => Promise<void>;
  /** After a successful fetchInboxItem, list row may need is_read + message */
  patchItemInState: (item: InboxItem) => void;
  reset: () => void;
}

type InboxStore = InboxState & InboxActions;

const initialState: InboxState = {
  items: [],
  page: 1,
  pages: 0,
  hasMore: false,
  total: 0,
  unreadCount: 0,
  detailById: {},
  lastListFetchedAt: null,
  isLoadingList: false,
  isLoadingMore: false,
  error: null,
};

function mergeDetailCache(
  prev: Record<string, InboxItem>,
  list: InboxItem[],
): Record<string, InboxItem> {
  const next = { ...prev };
  for (const it of list) {
    const existing = next[it.id];
    if (!existing || new Date(it.createdAt) >= new Date(existing.createdAt)) {
      next[it.id] = it;
    }
  }
  return next;
}

const _useInboxStore = create<InboxStore>()((set, get) => ({
  ...initialState,

  fetchInboxFirstPage: async (opts) => {
    const force = opts?.force === true;
    const { lastListFetchedAt, items } = get();
    const now = Date.now();
    if (
      !force &&
      items.length > 0 &&
      lastListFetchedAt != null &&
      now - lastListFetchedAt < LIST_STALE_MS
    ) {
      return;
    }

    if (!force && get().isLoadingList) return;

    set({ isLoadingList: true, error: null });
    try {
      const data = await fetchInbox(1, 20);
      set((state) => ({
        items: data.items,
        page: 1,
        pages: data.pages,
        hasMore: 1 < data.pages,
        total: data.total,
        unreadCount: data.unreadCount,
        detailById: mergeDetailCache(state.detailById, data.items),
        lastListFetchedAt: Date.now(),
        isLoadingList: false,
        error: null,
      }));
    } catch {
      set({
        error: "Could not load notifications.",
        isLoadingList: false,
      });
    }
  },

  fetchNextPage: async () => {
    const { page, pages, hasMore, isLoadingMore, isLoadingList } = get();
    if (!hasMore || isLoadingMore || isLoadingList || page >= pages) return;

    set({ isLoadingMore: true });
    try {
      const nextPage = page + 1;
      const data = await fetchInbox(nextPage, 20);
      set((state) => ({
        items: [...state.items, ...data.items],
        page: nextPage,
        hasMore: nextPage < data.pages,
        detailById: mergeDetailCache(state.detailById, data.items),
        isLoadingMore: false,
      }));
    } catch {
      set({ isLoadingMore: false });
    }
  },

  ensureInboxItem: async (id, opts) => {
    const force = opts?.force === true;
    const { items, detailById } = get();
    const fromList = items.find((i) => i.id === id);
    const cached = detailById[id] ?? fromList ?? null;

    if (!force && cached?.is_read) {
      if (!detailById[id] || detailById[id].id !== cached.id) {
        set((s) => ({
          detailById: { ...s.detailById, [id]: cached },
        }));
      }
      return cached;
    }

    try {
      const fresh = await fetchInboxItem(id);
      if (!fresh) return null;
      get().patchItemInState(fresh);
      return fresh;
    } catch {
      return null;
    }
  },

  markAllRead: async () => {
    await markAllInboxRead();
    set((state) => ({
      items: state.items.map((i) => ({ ...i, is_read: true })),
      unreadCount: 0,
      detailById: Object.fromEntries(
        Object.entries(state.detailById).map(([k, v]) => [k, { ...v, is_read: true }]),
      ),
    }));
  },

  patchItemInState: (item) => {
    set((state) => {
      const prevRow = state.items.find((i) => i.id === item.id);
      const wasUnread = !!prevRow && !prevRow.is_read;
      const unreadDelta = item.is_read && wasUnread ? -1 : 0;
      return {
        detailById: { ...state.detailById, [item.id]: item },
        items: state.items.map((i) => (i.id === item.id ? { ...i, ...item } : i)),
        unreadCount: Math.max(0, state.unreadCount + unreadDelta),
      };
    });
  },

  reset: () => set(initialState),
}));

export const useInboxStore = createSelectors(_useInboxStore);
