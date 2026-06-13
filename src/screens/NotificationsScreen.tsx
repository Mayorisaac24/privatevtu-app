import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { navigateBack } from '../lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationsStore } from '../stores/notifications-store';
import { type AppNotification, type AppNotificationType } from '../lib/api';
import { Colors, Spacing, Radius } from '../theme';
import { ThemedScreen } from '../components/ui/ThemedScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassSurface } from '../components/ui/GlassSurface';


const FILTERS = [
  { key: 'all' as const, label: 'All' },
  { key: 'unread' as const, label: 'Unread' },
];

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

function groupLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' });
}

function iconForType(type: AppNotificationType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'success': return 'checkmark-circle';
    case 'error': return 'close-circle';
    case 'warning': return 'warning';
    default: return 'notifications';
  }
}

function paletteForType(type: AppNotificationType) {
  switch (type) {
    case 'success':
      return { bg: '#ECFDF5', color: '#059669' };
    case 'error':
      return { bg: '#FEF2F2', color: '#DC2626' };
    case 'warning':
      return { bg: '#FFFBEB', color: '#D97706' };
    default:
      return { bg: Colors.primaryMuted, color: Colors.primary };
  }
}

function NotificationRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
}) {
  const palette = paletteForType(item.type);

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(item)}>
      <GlassCard
        variant={item.isRead ? 'light' : 'tinted'}
        borderRadius={16}
        padding={14}
        style={styles.rowCard}
      >
        <View style={styles.rowTop}>
          <View style={[styles.iconBadge, { backgroundColor: palette.bg }]}>
            <Ionicons name={iconForType(item.type)} size={18} color={palette.color} />
          </View>
          <View style={styles.rowBody}>
            <View style={styles.titleRow}>
              <Text style={[styles.rowTitle, !item.isRead && styles.rowTitleUnread]} numberOfLines={1}>
                {item.title}
              </Text>
              {!item.isRead ? <View style={styles.unreadDot} /> : null}
            </View>
            <Text style={styles.rowMessage} numberOfLines={2}>{item.message}</Text>
          </View>
        </View>
        <Text style={styles.rowTime}>{formatWhen(item.createdAt)}</Text>
      </GlassCard>
    </TouchableOpacity>
  );
}

type ListRow =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'item'; key: string; item: AppNotification };

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const {
    items,
    unreadCount,
    loading,
    refreshing,
    hasFetchedOnce,
    filter,
    pagination,
    fetchNotifications,
    fetchUnreadCount,
    setFilter,
    markAllRead,
  } = useNotificationsStore();

  useFocusEffect(
    useCallback(() => {
      void fetchNotifications({ refresh: true, page: 1 });
      void fetchUnreadCount();
    }, [fetchNotifications, fetchUnreadCount]),
  );

  const rows = useMemo(() => {
    const output: ListRow[] = [];
    let currentLabel = '';
    for (const item of items) {
      const label = groupLabel(item.createdAt);
      if (label !== currentLabel) {
        currentLabel = label;
        output.push({ kind: 'header', key: `header-${label}`, label });
      }
      output.push({ kind: 'item', key: item.id, item });
    }
    return output;
  }, [items]);

  const onPressItem = useCallback((item: AppNotification) => {
    router.push({
      pathname: '/notifications/[id]',
      params: { id: item.id },
    });
  }, []);

  const loadMore = useCallback(() => {
    if (loading || refreshing || !pagination) return;
    if (pagination.page >= pagination.totalPages) return;
    void fetchNotifications({ page: pagination.page + 1 });
  }, [fetchNotifications, loading, pagination, refreshing]);

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
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 ? (
            <Text style={styles.headerSub}>{unreadCount} unread</Text>
          ) : (
            <Text style={styles.headerSub}>You&apos;re all caught up</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.markAllBtn}
          onPress={() => void markAllRead()}
          disabled={unreadCount === 0}
          activeOpacity={0.8}
        >
          <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDisabled]}>
            Read all
          </Text>
        </TouchableOpacity>
      </GlassSurface>

      <View style={styles.filters}>
        {FILTERS.map((entry) => {
          const active = filter === entry.key;
          return (
            <TouchableOpacity key={entry.key} onPress={() => setFilter(entry.key)} activeOpacity={0.85}>
              <GlassSurface
                variant={active ? 'tinted' : 'light'}
                borderRadius={999}
                contentStyle={styles.filterPill}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {entry.label}
                </Text>
              </GlassSurface>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
          rows.length === 0 && styles.listEmptyContent,
        ]}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchNotifications({ refresh: true, page: 1 })}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        ListEmptyComponent={!hasFetchedOnce || loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : (
          <GlassCard contentStyle={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={28} color={Colors.mutedLight} />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySub}>
              Transaction updates, transfers, and account alerts will show up here.
            </Text>
          </GlassCard>
        )}
        renderItem={({ item: row }) => {
          if (row.kind === 'header') {
            return <Text style={styles.sectionLabel}>{row.label}</Text>;
          }
          return <NotificationRow item={row.item} onPress={onPressItem} />;
        }}
      />
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
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  markAllTextDisabled: {
    color: Colors.mutedLight,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.page,
    paddingTop: 12,
    paddingBottom: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
  },
  filterTextActive: {
    color: Colors.primary,
  },
  listContent: {
    paddingHorizontal: Spacing.page,
    gap: 10,
  },
  listEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.4,
    marginTop: 8,
    marginBottom: 2,
    marginLeft: 2,
  },
  rowCard: {
    marginBottom: 2,
  },
  rowTop: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
  rowTitleUnread: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  rowMessage: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.muted,
    marginTop: 4,
  },
  rowTime: {
    fontSize: 11,
    color: Colors.mutedLight,
    marginTop: 10,
    marginLeft: 52,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.muted,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.muted,
    textAlign: 'center',
  },
});
