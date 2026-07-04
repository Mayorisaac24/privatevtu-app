import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useTabContext } from '../stores/tab-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {Colors, Spacing, Typography, Radius, Shadow , Palette, FormColors, BRAND, Overlays, useColors, useThemedStyles } from '../theme';
import { withAlpha } from '../theme/gradient-utils';
import { useServiceAvailability } from '../hooks/useServiceAvailability';
import { SERVICE_CATALOG_GROUPS, type ServiceCatalogItem } from '../lib/service-catalog-ui';
import { refreshServiceCatalogState, syncCatalogRevision } from '../lib/catalog-revision-sync';
import { showToast } from '../components/ui/Toast';
import { ThemedScreen } from '../components/ui/ThemedScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassSurface } from '../components/ui/GlassSurface';
import { AdBanner } from '../components/ads/AdBanner';
import { BroadcastBanner } from '../components/broadcast/BroadcastBanner';
import { ScreenBody } from '../components/ui/ScreenBody';
import { useLayout } from '../lib/platform-ui';

const GRID_COLS = 3;
const GRID_GAP = 10;
const GROUP_PAD = 14;

function ServiceGridTile({
  item,
  available,
  width,
  onPress,
}: {
  item: ServiceCatalogItem;
  available: boolean;
  width: number;
  onPress: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const badgeLabel = item.route ? 'Unavailable' : 'Soon';
  const iconBg = item.route ? withAlpha(colors.primary, 0.1) : colors.surfaceAlt;
  const iconColor = item.route ? colors.primary : colors.muted;

  return (
    <TouchableOpacity
      style={[styles.tileWrap, { width }, !available && styles.tileWrapDisabled]}
      onPress={onPress}
      activeOpacity={available ? 0.72 : 1}
    >
      <GlassSurface variant="solid" borderRadius={14} style={styles.tile} contentStyle={styles.tileInner}>
        <View style={[styles.tileIcon, { backgroundColor: iconBg }, !available && styles.tileIconDisabled]}>
          <Ionicons
            name={item.icon as keyof typeof Ionicons.glyphMap}
            size={26}
            color={available ? iconColor : colors.mutedLight}
          />
        </View>
        <Text style={[styles.tileLabel, !available && styles.tileLabelDisabled]} numberOfLines={2}>
          {item.label}
        </Text>
        {!available ? (
          <View style={styles.tileBadge}>
            <Text style={styles.tileBadgeText}>{badgeLabel}</Text>
          </View>
        ) : null}
      </GlassSurface>
    </TouchableOpacity>
  );
}

function ServiceGroupPanel({
  title,
  items,
  tileWidth,
  isItemAvailable,
  onPressItem,
  muted = false,
}: {
  title: string;
  items: ServiceCatalogItem[];
  tileWidth: number;
  isItemAvailable: (item: ServiceCatalogItem) => boolean;
  onPressItem: (item: ServiceCatalogItem) => void;
  muted?: boolean;
}) {
  const styles = useStyles();

  return (
    <GlassCard
      variant="solid"
      borderRadius={20}
      padding={GROUP_PAD}
      style={[styles.groupCard, muted && styles.groupCardMuted]}
    >
      <View style={styles.groupHead}>
        <Text style={styles.groupTitle}>{title}</Text>
        <View style={styles.groupLine} />
      </View>

      <View style={styles.grid}>
        {items.map((item) => (
          <ServiceGridTile
            key={item.label}
            item={item}
            available={isItemAvailable(item)}
            width={tileWidth}
            onPress={() => onPressItem(item)}
          />
        ))}
      </View>
    </GlassCard>
  );
}

export default function ServicesScreen() {
  const styles = useStyles();

  const insets = useSafeAreaInsets();
  const { pagePadding, contentWidth } = useLayout();
  const { setTab } = useTabContext();
  const { isUsable } = useServiceAvailability();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void syncCatalogRevision({ force: true });
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshServiceCatalogState();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const tileWidth = (
    contentWidth - pagePadding * 2 - GROUP_PAD * 2 - GRID_GAP * (GRID_COLS - 1)
  ) / GRID_COLS;

  const isItemAvailable = (item: ServiceCatalogItem) => {
    if (!item.route) return false;
    if (item.alwaysAvailable) return true;
    if (!item.serviceCode) return false;
    return isUsable(item.serviceCode);
  };

  const handlePress = (item: ServiceCatalogItem) => {
    if (!isItemAvailable(item) || !item.route) {
      showToast({
        type: 'info',
        text1: 'Unavailable',
        text2: `${item.label} is currently disabled`,
      });
      return;
    }
    if (item.route.startsWith('TAB:')) {
      setTab(item.route.replace('TAB:', '') as 'history' | 'wallet');
      return;
    }
    router.push(item.route as '/services/airtime');
  };

  return (
    <ThemedScreen>

      <GlassSurface
        variant="solid"
        borderRadius={24}
        style={styles.headerShell}
        contentStyle={{ ...styles.header, paddingTop: insets.top + 12, paddingHorizontal: pagePadding }}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="grid-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>All Services</Text>
            <Text style={styles.headerSub}>Everything you need, in one place</Text>
          </View>
        </View>
      </GlassSurface>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { void onRefresh(); }} />
        }
      >
        <ScreenBody>
        <BroadcastBanner screen="SERVICES" />
        <AdBanner screen="SERVICES" placement="CARD" />
        {SERVICE_CATALOG_GROUPS.map((group) => (
          <ServiceGroupPanel
            key={group.title}
            title={group.title}
            items={group.items}
            tileWidth={tileWidth}
            isItemAvailable={isItemAvailable}
            onPressItem={handlePress}
            muted={group.title === 'Coming Soon'}
          />
        ))}
        </ScreenBody>
      </ScrollView>
    </ThemedScreen>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  root: { flex: 1 },
  headerShell: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Shadow.sm,
  },
  header: {
    paddingHorizontal: Spacing.page,
    paddingBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Overlays.darkAmbientPrimary,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  headerTitle: {
    ...Typography.h2,
    color: colors.dark,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.mid,
    lineHeight: 20,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 16,
    gap: 14,
  },
  groupCard: {
    ...Shadow.md,
  },
  groupCardMuted: {
    opacity: 0.92,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  groupLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Overlays.violet10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  tileWrap: {
    position: 'relative',
  },
  tileWrapDisabled: {
    opacity: 0.65,
  },
  tile: {
    width: '100%',
  },
  tileInner: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileIconDisabled: {
    opacity: 0.7,
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mid,
    textAlign: 'center',
  },
  tileLabelDisabled: {
    color: colors.muted,
  },
  tileBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.borderSubtle,
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  tileBadgeText: {
    fontSize: 7,
    fontWeight: '700',
    color: colors.muted,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
