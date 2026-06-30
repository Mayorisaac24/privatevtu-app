import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationsStore } from '../stores/notifications-store';
import { useTabContext } from '../stores/tab-context';
import { api, isResponseSuccess, type AppNotification, type AppNotificationType } from '../lib/api';
import { getLoginDeviceId } from '../lib/login-context';
import { navigateBack } from '../lib/navigation';
import { Colors, Spacing, getNotificationTypePalette, useColors } from '../theme';
import { ThemedScreen } from '../components/ui/ThemedScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassSurface } from '../components/ui/GlassSurface';
import { showToast } from '../components/ui/Toast';

function formatWhen(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function iconForType(type: AppNotificationType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'success': return 'checkmark-circle';
    case 'error': return 'close-circle';
    case 'warning': return 'warning';
    default: return 'notifications';
  }
}

function resolveCategory(notification: AppNotification) {
  if (notification.category) return notification.category;
  const dataCategory = typeof notification.data?.category === 'string'
    ? notification.data.category.toUpperCase()
    : '';
  if (dataCategory === 'SECURITY') return 'SECURITY';
  if (dataCategory === 'TRANSACTION') return 'TRANSACTIONAL';
  if (dataCategory === 'MARKETING') return 'MARKETING';
  if (dataCategory === 'SYSTEM') return 'SYSTEM';
  return undefined;
}

function categoryLabel(category?: string) {
  switch (category) {
    case 'SECURITY': return 'Security';
    case 'TRANSACTIONAL': return 'Transaction';
    case 'MARKETING': return 'Promotional';
    case 'SYSTEM': return 'System';
    default: return 'General';
  }
}

type Props = {
  id: string;
};

export default function NotificationDetailScreen({ id }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setTab } = useTabContext();
  const { markRead, markUnread, deleteNotification, upsertNotification } = useNotificationsStore();
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const markedReadRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    markedReadRef.current = new Set();
    const cached = useNotificationsStore.getState().items.find((item) => item.id === id) ?? null;
    setNotification(cached);
    setLoading(!cached);
    setNotFound(false);

    let cancelled = false;

    void (async () => {
      try {
        const excludeLoginDeviceId = await getLoginDeviceId();
        const res = await api.getNotificationById(id, excludeLoginDeviceId || undefined);
        if (cancelled) return;
        if (isResponseSuccess(res) && res.data?.id === id) {
          setNotification(res.data);
          upsertNotification(res.data);
          setNotFound(false);
        } else if (!cached) {
          setNotFound(true);
        }
      } catch {
        if (!cancelled && !cached) {
          setNotFound(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, upsertNotification]);

  useEffect(() => {
    if (!notification || notification.isRead || markedReadRef.current.has(notification.id)) {
      return;
    }
    markedReadRef.current.add(notification.id);
    void markRead(notification.id).then((ok) => {
      if (ok) {
        setNotification((prev) => (prev ? { ...prev, isRead: true } : prev));
      }
    });
  }, [markRead, notification]);

  const resolvedCategory = notification ? resolveCategory(notification) : undefined;

  const openRelatedScreen = useCallback(() => {
    if (!notification) return;

    const reference = typeof notification.data?.reference === 'string' ? notification.data.reference : '';
    const type = typeof notification.data?.type === 'string' ? notification.data.type : '';
    const category = resolveCategory(notification);

    if (category === 'TRANSACTIONAL' || reference || type.startsWith('transfer')) {
      setTab('history');
      router.replace('/(tabs)/history');
      return;
    }

    if (category === 'SECURITY') {
      router.push('/profile/change-password');
      return;
    }

    if (type === 'kyc_document_review') {
      router.push('/kyc');
    }
  }, [notification, setTab]);

  const showRelatedAction = useMemo(() => {
    if (!notification) return false;
    const category = resolveCategory(notification);
    const reference = typeof notification.data?.reference === 'string' ? notification.data.reference : '';
    const type = typeof notification.data?.type === 'string' ? notification.data.type : '';
    return category === 'TRANSACTIONAL' || Boolean(reference) || type.startsWith('transfer') || category === 'SECURITY' || type === 'kyc_document_review';
  }, [notification]);

  const relatedActionLabel = useMemo(() => {
    if (!notification) return '';
    const category = resolveCategory(notification);
    const type = typeof notification.data?.type === 'string' ? notification.data.type : '';
    if (type === 'kyc_document_review') return 'Open KYC';
    if (category === 'SECURITY') return 'Change password';
    if (category === 'TRANSACTIONAL' || type.startsWith('transfer')) return 'View in history';
    return 'View details';
  }, [notification]);

  const handleDelete = useCallback(() => {
    if (!notification) return;
    Alert.alert(
      'Delete notification?',
      'This notification will be removed from your inbox.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const ok = await deleteNotification(notification.id);
              if (ok) {
                showToast({ type: 'success', text1: 'Notification deleted' });
                navigateBack();
              } else {
                showToast({ type: 'error', text1: 'Could not delete notification' });
              }
            })();
          },
        },
      ],
    );
  }, [deleteNotification, notification]);

  const runMarkUnread = useCallback(() => {
    if (!notification) return;
    void (async () => {
      const ok = await markUnread(notification.id);
      if (ok) {
        setNotification((prev) => (prev ? { ...prev, isRead: false } : prev));
        showToast({ type: 'success', text1: 'Marked as unread' });
      }
    })();
  }, [markUnread, notification]);

  const runMarkRead = useCallback(() => {
    if (!notification) return;
    void (async () => {
      const ok = await markRead(notification.id);
      if (ok) {
        setNotification((prev) => (prev ? { ...prev, isRead: true } : prev));
        showToast({ type: 'success', text1: 'Marked as read' });
      }
    })();
  }, [markRead, notification]);

  const openActions = useCallback(() => {
    if (!notification) return;

    const options = notification.isRead
      ? ['Mark as unread', 'Delete', 'Cancel']
      : ['Mark as read', 'Delete', 'Cancel'];
    const destructiveButtonIndex = 1;
    const cancelButtonIndex = 2;

    const onSelect = (index?: number) => {
      if (index === 0) {
        if (notification.isRead) runMarkUnread();
        else runMarkRead();
      } else if (index === 1) {
        handleDelete();
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex, cancelButtonIndex },
        onSelect,
      );
      return;
    }

    Alert.alert('Notification actions', undefined, [
      {
        text: notification.isRead ? 'Mark as unread' : 'Mark as read',
        onPress: () => onSelect(0),
      },
      { text: 'Delete', style: 'destructive', onPress: () => onSelect(1) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [handleDelete, notification, runMarkRead, runMarkUnread]);

  if (loading && !notification) {
    return (
      <ThemedScreen>
        <View style={[styles.loadingWrap, { paddingTop: insets.top + 80 }]}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingText}>Loading notification...</Text>
        </View>
      </ThemedScreen>
    );
  }

  if (!notification || notFound) {
    return (
      <ThemedScreen>
        <View style={[styles.loadingWrap, { paddingTop: insets.top + 80 }]}>
          <Text style={styles.loadingText}>Notification not found.</Text>
        </View>
      </ThemedScreen>
    );
  }

  const palette = getNotificationTypePalette(notification.type, colors);

  return (
    <ThemedScreen>
      <GlassSurface
        variant="light"
        borderRadius={0}
        style={[styles.headerShell, { paddingTop: insets.top + 8 }]}
        contentStyle={styles.headerContent}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigateBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={Colors.dark} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notification</Text>
          <Text style={styles.headerSub}>{categoryLabel(resolvedCategory)}</Text>
        </View>
        <TouchableOpacity style={styles.menuBtn} onPress={openActions} activeOpacity={0.8}>
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.dark} />
        </TouchableOpacity>
      </GlassSurface>

      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <GlassCard variant={notification.isRead ? 'light' : 'tinted'} borderRadius={18} contentStyle={styles.card}>
          <View style={[styles.iconBadge, { backgroundColor: palette.bg }]}>
            <Ionicons name={iconForType(notification.type)} size={24} color={palette.color} />
          </View>

          <Text style={styles.title}>{notification.title}</Text>
          <Text style={styles.timestamp}>{formatWhen(notification.createdAt)}</Text>
          <View style={styles.divider} />
          <Text style={styles.message}>{notification.message}</Text>
        </GlassCard>

        {showRelatedAction ? (
          <TouchableOpacity style={styles.actionBtn} onPress={openRelatedScreen} activeOpacity={0.85}>
            <Text style={styles.actionBtnText}>{relatedActionLabel}</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.white} />
          </TouchableOpacity>
        ) : null}
      </View>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  headerShell: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(124, 58, 237, 0.08)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.page,
    paddingBottom: 14,
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.page,
    paddingTop: 16,
    gap: 16,
  },
  card: {
    gap: 12,
    padding: 18,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 26,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.mutedLight,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderSubtle,
    marginVertical: 4,
  },
  message: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.muted,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  actionBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  loadingWrap: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.muted,
  },
});
