import { create } from 'zustand';
import {
  api,
  isResponseSuccess,
  type AppNotification,
  type NotificationsListResponse,
} from '../lib/api';
import { getLoginDeviceId } from '../lib/login-context';

let cachedLoginDeviceId: string | null = null;
const STALE_MS = 45_000;

async function getExcludeLoginDeviceId(): Promise<string | undefined> {
  try {
    if (!cachedLoginDeviceId) {
      cachedLoginDeviceId = await getLoginDeviceId();
    }
    return cachedLoginDeviceId || undefined;
  } catch {
    return undefined;
  }
}

function applyReadState(
  items: AppNotification[],
  ids: Set<string>,
  isRead: boolean,
  filter: 'all' | 'unread',
): AppNotification[] {
  if (filter === 'unread' && isRead) {
    return items.filter((item) => !ids.has(item.id));
  }
  return items.map((item) => (
    ids.has(item.id) ? { ...item, isRead } : item
  ));
}

function countUnreadDelta(
  items: AppNotification[],
  ids: Set<string>,
  isRead: boolean,
): number {
  let delta = 0;
  for (const item of items) {
    if (!ids.has(item.id)) continue;
    if (isRead && !item.isRead) delta -= 1;
    if (!isRead && item.isRead) delta += 1;
  }
  return delta;
}

type NotificationsState = {
  unreadCount: number;
  items: AppNotification[];
  pagination: NotificationsListResponse['pagination'] | null;
  loading: boolean;
  refreshing: boolean;
  hasFetchedOnce: boolean;
  lastSyncedAt: number | null;
  filter: 'all' | 'unread';
  fetchUnreadCount: () => Promise<void>;
  fetchNotifications: (options?: {
    refresh?: boolean;
    silent?: boolean;
    page?: number;
  }) => Promise<void>;
  refreshIfStale: () => Promise<void>;
  setFilter: (filter: 'all' | 'unread') => void;
  upsertNotification: (notification: AppNotification) => void;
  markRead: (notificationId: string) => Promise<boolean>;
  markUnread: (notificationId: string) => Promise<boolean>;
  markAllRead: () => Promise<boolean>;
  markAllUnread: () => Promise<boolean>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  bulkAction: (
    notificationIds: string[],
    action: 'read' | 'unread' | 'delete',
  ) => Promise<boolean>;
  reset: () => void;
};

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  unreadCount: 0,
  items: [],
  pagination: null,
  loading: false,
  refreshing: false,
  hasFetchedOnce: false,
  lastSyncedAt: null,
  filter: 'all',

  fetchUnreadCount: async () => {
    try {
      const excludeLoginDeviceId = await getExcludeLoginDeviceId();
      const res = await api.getNotificationUnreadCount(excludeLoginDeviceId);
      if (isResponseSuccess(res) && res.data) {
        set({ unreadCount: res.data.unreadCount });
      }
    } catch {
      // Keep last known count when offline.
    }
  },

  fetchNotifications: async (options = {}) => {
    const { refresh = false, silent = false, page = 1 } = options;
    const { filter, items } = get();
    const hasItems = items.length > 0;

    if (refresh && !silent) {
      set({
        refreshing: true,
        loading: !hasItems && page === 1,
      });
    } else if (!silent && page === 1 && !hasItems) {
      set({ loading: true });
    }

    try {
      const excludeLoginDeviceId = await getExcludeLoginDeviceId();
      const res = await api.getNotifications({
        page,
        pageSize: 20,
        unreadOnly: filter === 'unread',
        excludeLoginDeviceId,
      });

      if (isResponseSuccess(res) && res.data) {
        set((state) => ({
          items: page === 1
            ? res.data!.notifications
            : [...state.items, ...res.data!.notifications],
          pagination: res.data!.pagination,
          unreadCount: res.data!.unreadCount,
          lastSyncedAt: Date.now(),
        }));
      }
    } finally {
      set({ loading: false, refreshing: false, hasFetchedOnce: true });
    }
  },

  refreshIfStale: async () => {
    const { lastSyncedAt, hasFetchedOnce } = get();
    if (!hasFetchedOnce) {
      await get().fetchNotifications({ page: 1 });
      return;
    }
    const isStale = !lastSyncedAt || Date.now() - lastSyncedAt > STALE_MS;
    if (isStale) {
      await get().fetchNotifications({ refresh: true, silent: true, page: 1 });
    }
    await get().fetchUnreadCount();
  },

  setFilter: (filter) => {
    set({ filter, items: [], pagination: null, hasFetchedOnce: false, lastSyncedAt: null });
    void get().fetchNotifications({ page: 1 });
  },

  upsertNotification: (notification) => {
    set((state) => {
      const index = state.items.findIndex((item) => item.id === notification.id);
      if (index === -1) {
        return { items: [notification, ...state.items] };
      }
      const next = [...state.items];
      next[index] = notification;
      return { items: next };
    });
  },

  markRead: async (notificationId) => {
    const res = await api.markNotificationRead(notificationId);
    if (!isResponseSuccess(res) || !res.data) return false;

    set((state) => ({
      items: applyReadState(state.items, new Set([notificationId]), true, state.filter),
      unreadCount: Math.max(0, state.unreadCount - (state.items.find((i) => i.id === notificationId && !i.isRead) ? 1 : 0)),
    }));
    return true;
  },

  markUnread: async (notificationId) => {
    const res = await api.markNotificationUnread(notificationId);
    if (!isResponseSuccess(res) || !res.data) return false;

    set((state) => ({
      items: applyReadState(state.items, new Set([notificationId]), false, state.filter),
      unreadCount: state.unreadCount + (state.items.find((i) => i.id === notificationId && i.isRead) ? 1 : 0),
    }));
    return true;
  },

  markAllRead: async () => {
    const res = await api.markAllNotificationsRead();
    if (!isResponseSuccess(res)) return false;

    set((state) => ({
      unreadCount: 0,
      items: state.filter === 'unread'
        ? []
        : state.items.map((item) => ({ ...item, isRead: true })),
    }));
    return true;
  },

  markAllUnread: async () => {
    const res = await api.markAllNotificationsUnread();
    if (!isResponseSuccess(res)) return false;

    set((state) => ({
      items: state.items.map((item) => ({ ...item, isRead: false })),
    }));
    await get().fetchUnreadCount();
    if (get().filter === 'unread') {
      await get().fetchNotifications({ refresh: true, silent: true, page: 1 });
    }
    return true;
  },

  deleteNotification: async (notificationId) => {
    const res = await api.deleteNotification(notificationId);
    if (!isResponseSuccess(res)) return false;

    set((state) => {
      const removed = state.items.find((item) => item.id === notificationId);
      return {
        items: state.items.filter((item) => item.id !== notificationId),
        unreadCount: removed && !removed.isRead
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
        pagination: state.pagination
          ? {
            ...state.pagination,
            total: Math.max(0, state.pagination.total - 1),
          }
          : null,
      };
    });
    return true;
  },

  bulkAction: async (notificationIds, action) => {
    const uniqueIds = [...new Set(notificationIds)];
    if (uniqueIds.length === 0) return false;

    const res = await api.bulkNotificationAction(uniqueIds, action);
    if (!isResponseSuccess(res)) return false;

    const idSet = new Set(uniqueIds);

    if (action === 'delete') {
      set((state) => {
        const removedUnread = state.items.filter((item) => idSet.has(item.id) && !item.isRead).length;
        return {
          items: state.items.filter((item) => !idSet.has(item.id)),
          unreadCount: Math.max(0, state.unreadCount - removedUnread),
          pagination: state.pagination
            ? {
              ...state.pagination,
              total: Math.max(0, state.pagination.total - (res.data?.affected ?? uniqueIds.length)),
            }
            : null,
        };
      });
    } else {
      const isRead = action === 'read';
      set((state) => ({
        items: applyReadState(state.items, idSet, isRead, state.filter),
        unreadCount: Math.max(0, state.unreadCount + countUnreadDelta(state.items, idSet, isRead)),
      }));
    }

    await get().fetchUnreadCount();
    return true;
  },

  reset: () => {
    set({
      unreadCount: 0,
      items: [],
      pagination: null,
      loading: false,
      refreshing: false,
      hasFetchedOnce: false,
      lastSyncedAt: null,
      filter: 'all',
    });
  },
}));
