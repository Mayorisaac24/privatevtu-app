import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProfileSubScreen } from '../components/profile/ProfileSubScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { VirtualCardVisual } from '../components/virtual-cards/VirtualCardVisual';
import { VirtualCardStatusPill } from '../components/virtual-cards/VirtualCardStatusPill';
import { VirtualCardWalletThumb } from '../components/virtual-cards/VirtualCardWalletThumb';
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
import { formatUsd, parseMaskedPan, virtualCardIssuerFootnote } from '../lib/virtual-card-utils';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_GAP = 14;

function CardCarousel({
  cards,
  activeIndex,
  onActiveIndexChange,
  onPressCard,
}: {
  cards: VirtualCardSummary[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onPressCard: (card: VirtualCardSummary) => void;
}) {
  const styles = useStyles();

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    onActiveIndexChange(Math.max(0, Math.min(nextIndex, cards.length - 1)));
  };

  return (
    <View style={styles.carouselWrap}>
      <ScrollView
        horizontal
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_GAP}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
        onMomentumScrollEnd={onScrollEnd}
      >
        {cards.map((card, index) => (
          <TouchableOpacity
            key={card.id}
            activeOpacity={0.92}
            onPress={() => onPressCard(card)}
            style={[
              styles.carouselItem,
              { width: CARD_WIDTH },
              index !== activeIndex && styles.carouselItemInactive,
            ]}
          >
            <VirtualCardVisual
              designId={card.cardDesign}
              brand={card.brand}
              cardName={card.cardName}
              maskedPan={card.maskedPan}
              balanceUsd={card.balanceUsd}
              expiry={card.expiry}
              status={card.status}
              size="list"
              showBalance={false}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {cards.length > 1 ? (
        <View style={styles.dots}>
          {cards.map((card, index) => (
            <View
              key={card.id}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function VirtualCardsListScreen() {
  const styles = useStyles();
  const initial = peekVirtualCardsList();
  const [cards, setCards] = useState<VirtualCardSummary[]>(initial?.cards ?? []);
  const [config, setConfig] = useState<VirtualCardConfig | null>(initial?.config ?? null);
  const [loading, setLoading] = useState(!hasVirtualCardsListCache());
  const [refreshing, setRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const applySnapshot = useCallback((snapshot: VirtualCardsListSnapshot) => {
    setCards(snapshot.cards);
    setConfig(snapshot.config);
    setActiveIndex((current) => Math.min(current, Math.max(snapshot.cards.length - 1, 0)));
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
  const activeCount = useMemo(
    () => cards.filter((c) => String(c.status).toUpperCase() === 'ACTIVE').length,
    [cards],
  );

  return (
    <ProfileSubScreen
      title="Your cards"
      subtitle="For subscriptions & online payments worldwide"
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
            Create a USD virtual card for international subscriptions and online checkout.
          </Text>
        </GlassCard>
      ) : (
        <View style={styles.list}>
          <GlassCard variant="light" padding={12} contentStyle={styles.limitsStrip}>
            <Text style={styles.limitsLeft}>
              {activeCount} of {config?.maxCardsPerUser ?? cards.length} active cards
            </Text>
          </GlassCard>

          <CardCarousel
            cards={cards}
            activeIndex={activeIndex}
            onActiveIndexChange={setActiveIndex}
            onPressCard={(card) => router.push(`/wallet/virtual-cards/${card.id}`)}
          />

          <Text style={styles.walletHeading}>YOUR WALLET</Text>
          <View style={styles.walletList}>
            {cards.map((card) => {
              const pan = parseMaskedPan(card.maskedPan);
              const compactPan = pan.bin && pan.last4
                ? `${pan.bin} •••• ${pan.last4}`
                : pan.display;
              return (
                <TouchableOpacity
                  key={card.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/wallet/virtual-cards/${card.id}`)}
                  style={styles.walletRow}
                >
                  <VirtualCardWalletThumb designId={card.cardDesign} />
                  <View style={styles.walletMeta}>
                    <Text style={styles.walletName} numberOfLines={1}>
                      {card.cardName || `${card.brand} card`}
                    </Text>
                    <Text style={styles.walletPan}>{compactPan}</Text>
                  </View>
                  <View style={styles.walletRight}>
                    <Text style={styles.walletBalance}>{formatUsd(card.balanceUsd)}</Text>
                    <VirtualCardStatusPill status={card.status} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.compliance}>{virtualCardIssuerFootnote()}</Text>
        </View>
      )}
    </ProfileSubScreen>
  );
}

const createStyles = (colors: import('../theme/types').ThemeColors) => StyleSheet.create({
  list: { gap: 14 },
  limitsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  limitsLeft: { fontSize: 12.5, fontWeight: '600', color: colors.muted },
  carouselWrap: { gap: 10 },
  carouselContent: {
    paddingHorizontal: 2,
    gap: CARD_GAP,
  },
  carouselItem: {
    transform: [{ scale: 1 }],
  },
  carouselItemInactive: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 16,
    backgroundColor: Colors.primary,
  },
  walletHeading: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.3,
  },
  walletList: { gap: 10 },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: Radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletMeta: { flex: 1, gap: 2 },
  walletName: { fontSize: 14, fontWeight: '700', color: colors.dark },
  walletPan: {
    fontSize: 12,
    color: colors.muted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  walletRight: { alignItems: 'flex-end', gap: 4 },
  walletBalance: { fontSize: 14, fontWeight: '700', color: colors.dark },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.dark },
  emptySub: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  compliance: { fontSize: 11, color: colors.muted, lineHeight: 16, marginTop: 4 },
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
