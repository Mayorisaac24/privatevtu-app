import { create } from 'zustand';
import {
  api,
  isResponseSuccess,
  type AppNotification,
  type NotificationsListResponse,
} from '../lib/api';
import { getLoginDeviceId } from '../lib/login-context';

let cachedLoginDeviceId: string | null = null;

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

type NotificationsState = {
  unreadCount: number;
  items: AppNotification[];
  pagination: NotificationsListResponse['pagination'] | null;
  loading: boolean;
  refreshing: boolean;
  hasFetchedOnce: boolean;
  filter: 'all' | 'unread';
  fetchUnreadCount: () => Promise<void>;
  fetchNotifications: (options?: { refresh?: boolean; page?: number }) => Promise<void>;
  setFilter: (filter: 'all' | 'unread') => void;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  reset: () => void;
};

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  unreadCount: 0,
  items: [],
  pagination: null,
  loading: false,
  refreshing: false,
  hasFetchedOnce: false,
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
    const { refresh = false, page = 1 } = options;
    const { filter } = get();

    if (refresh) {
      set({
        refreshing: true,
        loading: get().items.length === 0 && page === 1,
      });
    } else if (page === 1) {
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
        }));
      }
    } finally {
      set({ loading: false, refreshing: false, hasFetchedOnce: true });
    }
  },

  setFilter: (filter) => {
    set({ filter, items: [], pagination: null, hasFetchedOnce: false });
    void get().fetchNotifications({ refresh: false, page: 1 });
  },

  markRead: async (notificationId) => {
    const res = await api.markNotificationRead(notificationId);
    if (!isResponseSuccess(res) || !res.data) return;

    set((state) => ({
      items: state.filter === 'unread'
        ? state.items.filter((item) => item.id !== notificationId)
        : state.items.map((item) => (
          item.id === notificationId ? { ...item, isRead: true } : item
        )),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    const res = await api.markAllNotificationsRead();
    if (!isResponseSuccess(res)) return;

    set((state) => ({
      unreadCount: 0,
      items: state.filter === 'unread'
        ? []
        : state.items.map((item) => ({ ...item, isRead: true })),
    }));
  },

  reset: () => {
    set({
      unreadCount: 0,
      items: [],
      pagination: null,
      loading: false,
      refreshing: false,
      hasFetchedOnce: false,
      filter: 'all',
    });
  },
}));
