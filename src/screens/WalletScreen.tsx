import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency, MASKED_BALANCE } from '../lib/api';
import { refreshDashboardData } from '../lib/dashboard-data';
import { useWalletStore } from '../stores';
import { Colors, Spacing, Typography, Radius, Shadow } from '../theme';
import { Skeleton } from '../components/ui/Skeleton';
import { useServiceAvailability } from '../hooks/useServiceAvailability';
import { SERVICE_CODES } from '../lib/service-availability';
import { showToast } from '../components/ui/Toast';

const PAGE_BG = '#F4F5FA';
const CARD_DARK = '#1A0A3C';
const BRAND = '#7C3AED';
const BORDER = 'rgba(15, 23, 42, 0.08)';

function getBalanceParts(kobo: string) {
  const raw = formatCurrency(kobo).replace('₦', '').trim();
  const [whole, decimal = '00'] = raw.split('.');
  return { whole, decimal: `.${decimal}` };
}

function BalanceAmount({ kobo, visible }: { kobo: string; visible: boolean }) {
  if (!visible) {
    return <Text style={styles.balanceHidden}>{MASKED_BALANCE}</Text>;
  }
  const { whole, decimal } = getBalanceParts(kobo);
  return (
    <View style={styles.balanceRow}>
      <Text style={styles.balanceSymbol}>₦</Text>
      <Text style={styles.balanceWhole}>{whole}</Text>
      <Text style={styles.balanceDecimal}>{decimal}</Text>
    </View>
  );
}

const INFO_ROWS = [
  { label: 'Wallet Type', value: 'Standard', icon: 'wallet-outline' as const },
  { label: 'Daily Limit', value: '₦500,000', icon: 'calendar-outline' as const, maskable: true },
  { label: 'Monthly Limit', value: '₦5,000,000', icon: 'stats-chart-outline' as const, maskable: true },
  { label: 'Currency', value: 'Nigerian Naira (NGN)', icon: 'cash-outline' as const },
];

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { balance, balanceVisible, toggleBalanceVisible, dataHydrated } = useWalletStore();
  const [refreshing, setRefreshing] = useState(false);
  const showInitialLoading = !dataHydrated;
  const { isUsable } = useServiceAvailability();
  const fundUsable = isUsable(SERVICE_CODES.walletFund);
  const transferUsable = isUsable(SERVICE_CODES.localTransfer);

  useEffect(() => {
    void refreshDashboardData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDashboardData({ force: true });
    setRefreshing(false);
  }, []);

  const openFund = () => {
    if (!fundUsable) {
      showToast({ type: 'info', text1: 'Unavailable', text2: 'Wallet funding is currently disabled' });
      return;
    }
    router.push('/wallet/fund');
  };

  const openTransfer = () => {
    if (!transferUsable) {
      showToast({ type: 'info', text1: 'Unavailable', text2: 'Bank transfers are currently disabled' });
      return;
    }
    router.push('/wallet/transfer');
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={BRAND}
          colors={[BRAND]}
          progressBackgroundColor={Colors.white}
        />
      }
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <Text style={styles.headerSub}>Manage your funds securely</Text>
      </View>

      <View style={styles.balanceSection}>
        <View style={styles.balanceCard}>
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.blob3} />
          <View style={styles.cardShine} />

          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardBalLabel}>Total Balance</Text>
            <TouchableOpacity style={styles.eyeBtn} onPress={toggleBalanceVisible} activeOpacity={0.75}>
              <Ionicons
                name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                size={16}
                color="rgba(255,255,255,0.85)"
              />
            </TouchableOpacity>
          </View>

          {showInitialLoading ? (
            <Skeleton width={200} height={44} borderRadius={10} style={{ marginBottom: 6 }} />
          ) : (
            <BalanceAmount kobo={balance} visible={balanceVisible} />
          )}

          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="shield-checkmark-outline" size={13} color="rgba(255,255,255,0.65)" />
              <Text style={styles.metaText}>PrivateVTU Wallet</Text>
            </View>
            <View style={styles.metaItem}>
              <View style={styles.activeDot} />
              <Text style={styles.metaText}>Active</Text>
            </View>
          </View>

          <View style={styles.inlineActions}>
            <TouchableOpacity
              style={[styles.btnFund, !fundUsable && styles.btnActionDisabled]}
              onPress={openFund}
              activeOpacity={fundUsable ? 0.85 : 1}
            >
              <Ionicons name="add" size={18} color={Colors.white} />
              <Text style={styles.btnFundText}>Fund Wallet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnSend, !transferUsable && styles.btnActionDisabled]}
              onPress={openTransfer}
              activeOpacity={transferUsable ? 0.85 : 1}
            >
              <Ionicons name="paper-plane-outline" size={16} color={Colors.white} />
              <Text style={styles.btnSendText}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>Wallet details</Text>
        <View style={styles.infoCard}>
          {INFO_ROWS.map((row, index) => {
            const displayValue = row.maskable && !balanceVisible ? '₦ ••••' : row.value;
            return (
              <View
                key={row.label}
                style={[styles.infoRow, index < INFO_ROWS.length - 1 && styles.infoRowBorder]}
              >
                <View style={styles.infoLeft}>
                  <View style={styles.infoIconWrap}>
                    <Ionicons name={row.icon} size={15} color={BRAND} />
                  </View>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                </View>
                <Text style={styles.infoValue} numberOfLines={1}>{displayValue}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>Need help?</Text>
        <TouchableOpacity style={styles.helpCard} onPress={openFund} activeOpacity={0.82}>
          <View style={styles.helpIcon}>
            <Ionicons name="add-circle-outline" size={22} color={BRAND} />
          </View>
          <View style={styles.helpBody}>
            <Text style={styles.helpTitle}>Top up your wallet</Text>
            <Text style={styles.helpSub}>Bank transfer, checkout, or virtual account</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.mutedLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.helpCard} onPress={openTransfer} activeOpacity={0.82}>
          <View style={styles.helpIcon}>
            <Ionicons name="swap-horizontal-outline" size={22} color={BRAND} />
          </View>
          <View style={styles.helpBody}>
            <Text style={styles.helpTitle}>Send to any bank</Text>
            <Text style={styles.helpSub}>Instant transfers to Nigerian accounts</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.mutedLight} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={openFund} activeOpacity={fundUsable ? 0.88 : 1} disabled={!fundUsable}>
        <LinearGradient
          colors={fundUsable ? ['#8B5CF6', BRAND] : ['#C4B5FD', '#A78BFA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fundCTA, !fundUsable && styles.fundCTADisabled]}
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
          <Text style={styles.fundCTAText}>Fund Wallet</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.trustRow}>
        <Ionicons name="lock-closed" size={13} color={Colors.muted} />
        <Text style={styles.trustText}>256-bit encryption · Secured by PrivateVTU</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  content: { paddingHorizontal: Spacing.page },
  header: {
    paddingBottom: 18,
    marginHorizontal: -Spacing.page,
    paddingHorizontal: Spacing.page,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    marginBottom: 20,
  },
  headerTitle: { ...Typography.h2, color: Colors.dark, marginBottom: 4 },
  headerSub: { ...Typography.small, color: Colors.muted },

  balanceSection: { marginBottom: 22 },
  balanceCard: {
    backgroundColor: CARD_DARK,
    borderRadius: 22,
    padding: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#1A0A3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  blob1: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(124, 58, 237, 0.35)',
  },
  blob2: {
    position: 'absolute',
    bottom: -30,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
  },
  blob3: {
    position: 'absolute',
    top: 60,
    right: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardBalLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },
  eyeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  balanceSymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginRight: 2,
    marginBottom: 5,
  },
  balanceWhole: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1.5,
    lineHeight: 46,
  },
  balanceDecimal: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 5,
  },
  balanceHidden: {
    fontSize: 34,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 3,
    marginBottom: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryLight,
  },
  inlineActions: { flexDirection: 'row', gap: 10 },
  btnFund: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  btnFundText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  btnSend: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  btnSendText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  btnActionDisabled: { opacity: 0.45 },

  section: { marginBottom: 20 },
  sectionEyebrow: {
    ...Typography.label,
    color: Colors.muted,
    marginBottom: 10,
    marginLeft: 2,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    ...Shadow.card,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  infoRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceAlt,
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { ...Typography.small, color: Colors.muted, flex: 1 },
  infoValue: { ...Typography.smallMed, color: Colors.dark, maxWidth: '48%', textAlign: 'right' },

  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    ...Shadow.xs,
  },
  helpIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBody: { flex: 1, gap: 2 },
  helpTitle: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  helpSub: { fontSize: 12, color: Colors.muted, lineHeight: 16 },

  fundCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    marginBottom: 14,
    ...Shadow.sm,
  },
  fundCTADisabled: { opacity: 0.55 },
  fundCTAText: { ...Typography.bodyMed, color: Colors.white, fontWeight: '700' },

  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 8,
  },
  trustText: { fontSize: 11, color: Colors.muted, fontWeight: '500' },
});
