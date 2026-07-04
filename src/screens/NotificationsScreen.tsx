import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { navigateBack } from '../lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationsStore } from '../stores/notifications-store';
import { type AppNotification, type AppNotificationType } from '../lib/api';
import {Colors, Spacing, getNotificationTypePalette, useColors , Overlays, useThemedStyles } from '../theme';
import { ThemedScreen } from '../components/ui/ThemedScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassSurface } from '../components/ui/GlassSurface';
import { showToast } from '../components/ui/Toast';

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

function notificationCategoryLabel(item: AppNotification) {
  if (item.category === 'SECURITY' || item.data?.alertType === 'login_alert') return 'Security';
  if (typeof item.data?.type === 'string' && item.data.type.startsWith('dispute_')) return 'Support';
  if (item.category === 'MARKETING' || item.data?.type === 'admin_broadcast') return 'Promotional';
  if (item.data?.type === 'kyc_document_review') return 'KYC';
  if (item.category === 'TRANSACTIONAL' || item.data?.category === 'transaction') return 'Transaction';
  if (item.category === 'SYSTEM') return 'System';
  return 'Update';
}

function NotificationRow({
  item,
  selected,
  selectionMode,
  onPress,
  onLongPress,
  onToggleSelect,
}: {
  item: AppNotification;
  selected: boolean;
  selectionMode: boolean;
  onPress: (item: AppNotification) => void;
  onLongPress: (item: AppNotification) => void;
  onToggleSelect: (item: AppNotification) => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const palette = getNotificationTypePalette(item.type, colors);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => (selectionMode ? onToggleSelect(item) : onPress(item))}
      onLongPress={() => onLongPress(item)}
    >
      <GlassCard
        variant={item.isRead ? 'light' : 'tinted'}
        borderRadius={16}
        padding={14}
        style={[styles.rowCard, selected && styles.rowCardSelected]}
      >
        <View style={styles.rowTop}>
          {selectionMode ? (
            <TouchableOpacity
              style={[styles.checkbox, selected && styles.checkboxSelected]}
              onPress={() => onToggleSelect(item)}
              activeOpacity={0.8}
            >
              {selected ? <Ionicons name="checkmark" size={14} color={Colors.white} /> : null}
            </TouchableOpacity>
          ) : null}
          <View style={[styles.iconBadge, { backgroundColor: palette.bg }]}>
            <Ionicons name={iconForType(item.type)} size={18} color={palette.color} />
          </View>
          <View style={styles.rowBody}>
            <View style={styles.titleRow}>
              <Text style={[styles.rowTitle, !item.isRead && styles.rowTitleUnread]} numberOfLines={1}>
                {item.title}
              </Text>
              {!item.isRead && !selectionMode ? <View style={styles.unreadDot} /> : null}
            </View>
            <Text style={styles.rowCategory}>{notificationCategoryLabel(item)}</Text>
            <Text style={styles.rowMessage} numberOfLines={2}>{item.message}</Text>
          </View>
        </View>
        <Text style={[styles.rowTime, selectionMode && styles.rowTimeWithCheckbox]}>
          {formatWhen(item.createdAt)}
        </Text>
      </GlassCard>
    </TouchableOpacity>
  );
}

type ListRow =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'item'; key: string; item: AppNotification };

export default function NotificationsScreen() {
  const styles = useStyles();

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
    refreshIfStale,
    setFilter,
    markAllRead,
    markAllUnread,
    bulkAction,
  } = useNotificationsStore();

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      void refreshIfStale();
    }, [refreshIfStale]),
  );

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

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

  const onLongPressItem = useCallback((item: AppNotification) => {
    setSelectionMode(true);
    setSelectedIds(new Set([item.id]));
  }, []);

  const toggleSelect = useCallback((item: AppNotification) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, [items]);

  const runBulk = useCallback(async (action: 'read' | 'unread' | 'delete') => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    if (action === 'delete') {
      Alert.alert(
        ids.length === 1 ? 'Delete notification?' : `Delete ${ids.length} notifications?`,
        'This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                const ok = await bulkAction(ids, 'delete');
                if (ok) {
                  showToast({ type: 'success', text1: 'Deleted', text2: `${ids.length} notification(s) removed` });
                  exitSelectionMode();
                }
              })();
            },
          },
        ],
      );
      return;
    }

    const ok = await bulkAction(ids, action);
    if (ok) {
      showToast({
        type: 'success',
        text1: action === 'read' ? 'Marked as read' : 'Marked as unread',
      });
      exitSelectionMode();
    }
  }, [bulkAction, exitSelectionMode, selectedIds]);

  const openInboxActions = useCallback(() => {
    const options = ['Mark all as read', 'Mark all as unread', 'Select notifications', 'Cancel'];
    const cancelButtonIndex = 3;

    const onSelect = (index?: number) => {
      if (index === 0) void markAllRead();
      else if (index === 1) void markAllUnread();
      else if (index === 2) setSelectionMode(true);
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex },
        onSelect,
      );
      return;
    }

    Alert.alert('Inbox actions', undefined, [
      { text: 'Mark all as read', onPress: () => onSelect(0) },
      { text: 'Mark all as unread', onPress: () => onSelect(1) },
      { text: 'Select notifications', onPress: () => onSelect(2) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [markAllRead, markAllUnread]);

  const loadMore = useCallback(() => {
    if (loading || refreshing || !pagination || selectionMode) return;
    if (pagination.page >= pagination.totalPages) return;
    void fetchNotifications({ page: pagination.page + 1 });
  }, [fetchNotifications, loading, pagination, refreshing, selectionMode]);

  const selectedCount = selectedIds.size;

  return (
    <ThemedScreen>
      <GlassSurface
        variant="light"
        borderRadius={0}
        style={[styles.headerShell, { paddingTop: insets.top + 8 }]}
        contentStyle={styles.headerContent}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (selectionMode ? exitSelectionMode() : navigateBack())}
          activeOpacity={0.8}
        >
          <Ionicons
            name={selectionMode ? 'close' : 'arrow-back'}
            size={22}
            color={Colors.dark}
          />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {selectionMode ? `${selectedCount} selected` : 'Notifications'}
          </Text>
          {!selectionMode ? (
            unreadCount > 0 ? (
              <Text style={styles.headerSub}>{unreadCount} unread</Text>
            ) : (
              <Text style={styles.headerSub}>You&apos;re all caught up</Text>
            )
          ) : (
            <TouchableOpacity onPress={selectAllVisible} activeOpacity={0.8}>
              <Text style={styles.selectAllLink}>Select all on screen</Text>
            </TouchableOpacity>
          )}
        </View>
        {selectionMode ? (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={selectAllVisible}
            activeOpacity={0.8}
          >
            <Text style={styles.markAllText}>All</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={openInboxActions}
            activeOpacity={0.8}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </GlassSurface>

      {!selectionMode ? (
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
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + (selectionMode ? 96 : 24) },
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
          return (
            <NotificationRow
              item={row.item}
              selected={selectedIds.has(row.item.id)}
              selectionMode={selectionMode}
              onPress={onPressItem}
              onLongPress={onLongPressItem}
              onToggleSelect={toggleSelect}
            />
          );
        }}
      />

      {selectionMode ? (
        <GlassSurface
          variant="light"
          borderRadius={0}
          style={[styles.bulkBar, { paddingBottom: insets.bottom + 10 }]}
          contentStyle={styles.bulkBarContent}
        >
          <TouchableOpacity
            style={[styles.bulkBtn, selectedCount === 0 && styles.bulkBtnDisabled]}
            disabled={selectedCount === 0}
            onPress={() => void runBulk('read')}
          >
            <Ionicons name="mail-open-outline" size={18} color={Colors.primary} />
            <Text style={styles.bulkBtnText}>Read</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkBtn, selectedCount === 0 && styles.bulkBtnDisabled]}
            disabled={selectedCount === 0}
            onPress={() => void runBulk('unread')}
          >
            <Ionicons name="mail-unread-outline" size={18} color={Colors.primary} />
            <Text style={styles.bulkBtnText}>Unread</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkBtn, selectedCount === 0 && styles.bulkBtnDisabled]}
            disabled={selectedCount === 0}
            onPress={() => void runBulk('delete')}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
            <Text style={[styles.bulkBtnText, { color: Colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </GlassSurface>
      ) : null}
    </ThemedScreen>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  headerShell: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Overlays.violet08,
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
    backgroundColor: Overlays.violet08,
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.dark,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  selectAllLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  markAllBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
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
    color: colors.muted,
  },
  filterTextActive: {
    color: colors.primary,
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
    color: colors.muted,
    letterSpacing: 0.4,
    marginTop: 8,
    marginBottom: 2,
    marginLeft: 2,
  },
  rowCard: {
    marginBottom: 2,
  },
  rowCardSelected: {
    borderWidth: 1.5,
    borderColor: Overlays.violet35,
  },
  rowTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
    color: colors.dark,
  },
  rowTitleUnread: {
    fontWeight: '700',
  },
  rowCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  rowMessage: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    marginTop: 4,
  },
  rowTime: {
    fontSize: 11,
    color: colors.mutedLight,
    marginTop: 10,
    marginLeft: 52,
  },
  rowTimeWithCheckbox: {
    marginLeft: 74,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: colors.muted,
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
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    textAlign: 'center',
  },
  bulkBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Overlays.violet08,
  },
  bulkBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    paddingHorizontal: Spacing.page,
  },
  bulkBtn: {
    alignItems: 'center',
    gap: 4,
    minWidth: 72,
  },
  bulkBtnDisabled: {
    opacity: 0.4,
  },
  bulkBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
