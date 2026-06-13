import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getKycTierLabel, type FundingBank, type VirtualAccount } from '../lib/api';
import { normalizeBankCode } from '../lib/funding-banks';
import {
  describeFundingMethods,
  getPermanentVirtualAccounts,
  type WalletFundingSnapshot,
} from '../lib/wallet-funding-cache';
import { Colors } from '../theme';
import { GlassSurface } from './ui/GlassSurface';
import { BankLogo } from './BankLogo';
import { showToast } from './ui/Toast';

const PAGE_PAD = 20;
const CARD_PAD = 12;

function formatLimitKobo(kobo: string | undefined, visible: boolean): string {
  if (!visible) return '••••';
  if (!kobo || Number(kobo) <= 0) return '—';
  const naira = Number(kobo) / 100;
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}M`;
  if (naira >= 1_000) return `₦${(naira / 1_000).toFixed(0)}K`;
  return `₦${naira.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function resolveAccountBank(
  account: VirtualAccount,
  banks: FundingBank[],
): Pick<FundingBank, 'code' | 'name' | 'shortName' | 'logoUrl' | 'logoVersion'> {
  if (account.bankCode) {
    const code = normalizeBankCode(account.bankCode);
    const byCode = banks.find((b) => normalizeBankCode(b.code) === code);
    if (byCode) return byCode;
    return { code, name: account.bankName, shortName: account.bankName };
  }

  const name = account.bankName?.toLowerCase() ?? '';
  const matched = banks.find(
    (b) =>
      name.includes(b.name.toLowerCase().split(' ')[0])
      || b.name.toLowerCase().includes(name),
  );
  if (matched) return matched;

  return {
    code: account.bankCode || '000000',
    name: account.bankName,
    shortName: account.bankName,
  };
}

function AccountSlide({
  account,
  banks,
  width,
  onCopy,
}: {
  account: VirtualAccount;
  banks: FundingBank[];
  width: number;
  onCopy: (accountNumber: string) => void;
}) {
  const bank = resolveAccountBank(account, banks);
  const canCopy = account.accountNumber.length > 0;

  return (
    <View style={[styles.slide, { width }]}>
      <BankLogo bank={bank} size={40} />
      <View style={styles.slideBody}>
        <Text style={styles.bankName} numberOfLines={1}>
          {account.bankName || bank.shortName || bank.name}
        </Text>
        <View style={styles.accountRow}>
          <Text style={styles.accountNumber} numberOfLines={1}>
            {account.accountNumber}
          </Text>
          {canCopy ? (
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => onCopy(account.accountNumber)}
              activeOpacity={0.75}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Copy account number"
            >
              <Ionicons name="copy-outline" size={15} color={Colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

type WalletAccountCardProps = {
  funding: WalletFundingSnapshot | null;
  loading: boolean;
  refreshing?: boolean;
  balanceVisible: boolean;
  fundUsable: boolean;
  onPressFund: () => void;
  compact?: boolean;
};

export function WalletAccountCard({
  funding,
  loading,
  refreshing = false,
  balanceVisible,
  fundUsable,
  onPressFund,
  compact = true,
}: WalletAccountCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const slideWidth = useMemo(
    () => Dimensions.get('window').width - PAGE_PAD * 2 - CARD_PAD * 2,
    [],
  );

  const onScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
      setActiveIndex(index);
    },
    [slideWidth],
  );

  const copyAccount = useCallback(async (accountNumber: string) => {
    try {
      await Clipboard.setStringAsync(accountNumber);
      showToast({ type: 'success', text1: 'Account number copied' });
    } catch {
      showToast({ type: 'error', text1: 'Could not copy account number' });
    }
  }, []);

  const permanentAccounts = funding ? getPermanentVirtualAccounts(funding) : [];
  const fundingBanks = funding
    ? [...funding.staticBanks, ...funding.dynamicBanks]
    : [];
  const methodLabels = funding ? describeFundingMethods(funding.methods) : [];
  const tierLabel = funding?.kycTier ? getKycTierLabel(funding.kycTier) : null;
  const limits = funding?.tierLimits;
  const hasLimits = limits && [limits.daily, limits.monthly].some((v) => Number(v) > 0);
  const showLimitsFoot = hasLimits && tierLabel && !compact;
  const hasRenderableContent = permanentAccounts.length > 0
    || (fundUsable && methodLabels.length > 0);

  if (loading && !hasRenderableContent) {
    return null;
  }

  if (permanentAccounts.length > 0) {
    const multiple = permanentAccounts.length > 1;

    return (
      <GlassSurface variant="solid" borderRadius={16} contentStyle={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.headerIcon}>
              <Ionicons name="card-outline" size={14} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Fund via bank transfer</Text>
            {refreshing ? <View style={styles.liveDot} /> : null}
          </View>
          {multiple ? (
            <View style={styles.dotsInline}>
              {permanentAccounts.map((account, index) => (
                <View
                  key={account.id ?? `dot-${account.accountNumber}-${index}`}
                  style={[styles.dot, index === activeIndex && styles.dotActive]}
                />
              ))}
            </View>
          ) : null}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={slideWidth}
          snapToAlignment="start"
          disableIntervalMomentum
          contentContainerStyle={styles.carouselContent}
        >
          {permanentAccounts.map((account) => (
            <AccountSlide
              key={account.id ?? `${account.bankCode}-${account.accountNumber}`}
              account={account}
              banks={fundingBanks}
              width={slideWidth}
              onCopy={copyAccount}
            />
          ))}
        </ScrollView>

        {showLimitsFoot ? (
          <Text style={styles.foot}>
            {tierLabel} limits · Daily {formatLimitKobo(limits!.daily, balanceVisible)} · Monthly{' '}
            {formatLimitKobo(limits!.monthly, balanceVisible)}
          </Text>
        ) : null}
      </GlassSurface>
    );
  }

  if (fundUsable && methodLabels.length > 0) {
    return (
      <TouchableOpacity onPress={onPressFund} activeOpacity={0.9}>
        <GlassSurface variant="solid" borderRadius={16} contentStyle={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="wallet-outline" size={14} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Set up wallet funding</Text>
              {refreshing ? <View style={styles.liveDot} /> : null}
            </View>
            <TouchableOpacity
              style={styles.fundIconBtn}
              onPress={onPressFund}
              activeOpacity={0.75}
              hitSlop={6}
            >
              <Ionicons name="chevron-forward" size={17} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.setupSub}>{methodLabels.join(' · ')}</Text>
          {showLimitsFoot ? (
            <Text style={styles.foot}>
              {tierLabel} · Daily {formatLimitKobo(limits!.daily, balanceVisible)} · Monthly{' '}
              {formatLimitKobo(limits!.monthly, balanceVisible)}
            </Text>
          ) : null}
        </GlassSurface>
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  cardBody: {
    padding: CARD_PAD,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  headerIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryLight,
  },
  fundIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselContent: {
    alignItems: 'flex-start',
  },
  slide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slideBody: {
    flex: 1,
    gap: 1,
  },
  bankName: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  copyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dotsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
  },
  dotActive: {
    width: 14,
    backgroundColor: Colors.primary,
  },
  setupSub: {
    fontSize: 12,
    color: Colors.muted,
    fontWeight: '400',
    lineHeight: 17,
  },
  foot: {
    fontSize: 10,
    color: Colors.mutedLight,
    fontWeight: '400',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
    lineHeight: 14,
  },
});
