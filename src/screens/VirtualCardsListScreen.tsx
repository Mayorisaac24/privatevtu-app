import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProfileSubScreen } from '../components/profile/ProfileSubScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { type VirtualCardConfig, type VirtualCardSummary } from '../lib/api';
import {
  getVirtualCardsList,
  hasVirtualCardsListCache,
  peekVirtualCardsList,
  pullToRefreshVirtualCardsList,
  refreshVirtualCardsListIfStale,
  type VirtualCardsListSnapshot,
} from '../lib/virtual-cards-cache';
import { Colors, Radius, useThemedStyles } from '../theme';
import { formatUsd, virtualCardStatusMeta } from '../lib/virtual-card-utils';

function CardRow({ card }: { card: VirtualCardSummary }) {
  const styles = useStyles();
  const status = virtualCardStatusMeta(card.status);

  return (
    <GlassCard variant="light" borderRadius={Radius.lg} padding={14} contentStyle={styles.row}>
      <View style={styles.rowTop}>
        <View style={styles.brandBadge}>
          <Ionicons name="card-outline" size={18} color={Colors.primary} />
          <Text style={styles.brandText}>{card.brand}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${status.color}18` }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <Text style={styles.cardName}>{card.cardName || 'Virtual card'}</Text>
      <Text style={styles.pan}>{card.maskedPan || '•••• •••• •••• ••••'}</Text>
      <View style={styles.rowBottom}>
        <Text style={styles.balance}>{formatUsd(card.balanceUsd)}</Text>
        {card.expiry ? <Text style={styles.expiry}>Exp {card.expiry}</Text> : null}
      </View>
    </GlassCard>
  );
}

export default function VirtualCardsListScreen() {
  const styles = useStyles();
  const initial = peekVirtualCardsList();
  const [cards, setCards] = useState<VirtualCardSummary[]>(initial?.cards ?? []);
  const [config, setConfig] = useState<VirtualCardConfig | null>(initial?.config ?? null);
  const [loading, setLoading] = useState(!hasVirtualCardsListCache());
  const [refreshing, setRefreshing] = useState(false);

  const applySnapshot = useCallback((snapshot: VirtualCardsListSnapshot) => {
    setCards(snapshot.cards);
    setConfig(snapshot.config);
  }, []);

  useEffect(() => {
    void getVirtualCardsList().then((snapshot) => {
      applySnapshot(snapshot);
      setLoading(false);
    });
  }, [applySnapshot]);

  useFocusEffect(
    useCallback(() => {
      void refreshVirtualCardsListIfStale().then((snapshot) => {
        if (snapshot) applySnapshot(snapshot);
        setLoading(false);
      });
    }, [applySnapshot]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const snapshot = await pullToRefreshVirtualCardsList();
      applySnapshot(snapshot);
    } finally {
      setRefreshing(false);
    }
  }, [applySnapshot]);

  const canCreate = !config || cards.length < config.maxCardsPerUser;

  return (
    <ProfileSubScreen
      title="Virtual Cards"
      subtitle="USD cards for online payments"
      headerIcon="card-outline"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      footer={canCreate ? (
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/wallet/virtual-cards/create')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.createBtnText}>New card</Text>
        </TouchableOpacity>
      ) : undefined}
    >
      {loading && cards.length === 0 ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
      ) : cards.length === 0 ? (
        <GlassCard contentStyle={styles.empty}>
          <Ionicons name="card-outline" size={32} color={Colors.mutedLight} />
          <Text style={styles.emptyTitle}>No virtual cards yet</Text>
          <Text style={styles.emptySub}>
            Create a USD virtual card for international online payments. You can hold multiple cards.
          </Text>
        </GlassCard>
      ) : (
        <View style={styles.list}>
          {config ? (
            <Text style={styles.limitHint}>
              {cards.length} of {config.maxCardsPerUser} active cards
            </Text>
          ) : null}
          {cards.map((card) => (
            <TouchableOpacity
              key={card.id}
              activeOpacity={0.85}
              onPress={() => router.push(`/wallet/virtual-cards/${card.id}`)}
            >
              <CardRow card={card} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ProfileSubScreen>
  );
}

const createStyles = (colors: import('../theme/types').ThemeColors) => StyleSheet.create({
  list: { gap: 10 },
  limitHint: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  row: { gap: 8 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandText: { fontSize: 13, fontWeight: '700', color: colors.dark },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardName: { fontSize: 16, fontWeight: '700', color: colors.dark },
  pan: { fontSize: 14, color: colors.muted, letterSpacing: 1 },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balance: { fontSize: 18, fontWeight: '800', color: colors.dark },
  expiry: { fontSize: 12, color: colors.muted },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.dark },
  emptySub: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  createBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
