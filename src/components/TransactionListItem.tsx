import { View, Text, StyleSheet, Image, ImageSourcePropType, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Transaction } from '../lib/api';
import { formatCurrencyVisible } from '../lib/api';
import { BankLogo } from './BankLogo';
import { resolveTransferBankForDisplay } from '../lib/transfer-banks';
import { NetworkProviderLogo } from './NetworkProviderLogo';
import { getEducationProviderLogo, hasEducationProviderLogo } from '../lib/education-providers';
import { getBettingPlatformLogo, hasBettingPlatformLogo } from '../lib/betting-platforms';
import {Colors, Radius , Palette, FormColors, BRAND, Overlays, useColors, useThemedStyles } from '../theme';
import { GlassCard } from './ui/GlassCard';
import {
  enrichTransaction,
  getAmountPresentation,
  getStatusMeta,
  getTransactionListSubtitle,
  getTransactionListTitle,
  getTransactionVisual,
  type EnrichedTransaction,
} from '../lib/transaction-display';

type Props = {
  transaction: Transaction;
  balanceVisible?: boolean;
  variant?: 'card' | 'embedded';
  showStatus?: boolean;
  isLast?: boolean;
  onPress?: () => void;
};

function readMetaString(metadata: unknown, key: string): string {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '';
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : '';
}

function TransactionAvatar({ tx }: { tx: EnrichedTransaction }) {
  const styles = useStyles();
  const colors = useColors();

  const visual = getTransactionVisual(tx);

  if (visual.logoType === 'bank' && tx.logoKey) {
    const bankName = readMetaString(tx.metadata, 'bankName');
    const bank = resolveTransferBankForDisplay(tx.logoKey, bankName);
    return (
      <View style={styles.avatarWrap}>
        <BankLogo bank={bank} size={38} />
      </View>
    );
  }

  if (visual.logoType === 'provider' && visual.providerCode) {
    const providerImageUrl = readMetaString(tx.metadata, 'providerImageUrl')
      || readMetaString(tx.metadata, 'platformImageUrl');

    if (tx.type === 'BETTING') {
      const bettingLogo = getBettingPlatformLogo({
        code: visual.providerCode,
        imageUrl: providerImageUrl,
      });
      if (bettingLogo && hasBettingPlatformLogo({ imageUrl: providerImageUrl })) {
        return (
          <View style={styles.avatarWrap}>
            <Image source={bettingLogo as ImageSourcePropType} style={styles.providerLogo} resizeMode="cover" />
          </View>
        );
      }
      return (
        <View style={[styles.avatarWrap, { backgroundColor: colors.primaryMuted }]}>
          <Ionicons name="trophy-outline" size={18} color={colors.primary} />
        </View>
      );
    }

    if (tx.type === 'EDUCATION') {
      const eduLogo = getEducationProviderLogo({
        code: visual.providerCode,
        id: visual.providerCode,
        imageUrl: providerImageUrl,
      });
      if (eduLogo && hasEducationProviderLogo({ imageUrl: providerImageUrl })) {
        return (
          <View style={styles.avatarWrap}>
            <Image source={eduLogo as ImageSourcePropType} style={styles.providerLogo} resizeMode="cover" />
          </View>
        );
      }
    }

    if (tx.type === 'AIRTIME' || tx.type === 'DATA') {
      return (
        <View style={styles.avatarWrap}>
          <NetworkProviderLogo
            provider={{ code: visual.providerCode, id: visual.providerCode, imageUrl: providerImageUrl }}
            size={44}
          />
        </View>
      );
    }

    return (
      <View style={[styles.avatarWrap, { backgroundColor: visual.bgColor }]}>
        <Ionicons name={visual.icon as any} size={18} color={visual.iconColor} />
      </View>
    );
  }

  return (
    <View style={[styles.avatarWrap, { backgroundColor: visual.bgColor }]}>
      <Ionicons name={visual.icon as any} size={18} color={visual.iconColor} />
    </View>
  );
}

function StatusBadge({ status }: { status: EnrichedTransaction['displayStatus'] }) {
  const styles = useStyles();

  const meta = getStatusMeta(status);
  return (
    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: meta.dot }]} />
      <Text style={[styles.statusText, { color: meta.text }]}>{meta.label}</Text>
    </View>
  );
}

export function TransactionListItem({
  transaction,
  balanceVisible = true,
  variant = 'card',
  showStatus = true,
  isLast = false,
  onPress,
}: Props) {
  const styles = useStyles();

  const tx = enrichTransaction(transaction);
  const { prefix, color: amountColor } = getAmountPresentation(tx);
  const title = getTransactionListTitle(tx);
  const subtitle = getTransactionListSubtitle(tx);
  const embedded = variant === 'embedded';

  const content = (
    <>
      <TransactionAvatar tx={tx} />

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {formatCurrencyVisible(tx.displayAmountKobo || tx.amount, balanceVisible, prefix)}
        </Text>
        {showStatus ? <StatusBadge status={tx.displayStatus || 'pending'} /> : null}
      </View>
    </>
  );

  if (embedded) {
    const rowStyle = [
      styles.row,
      styles.rowEmbedded,
      !isLast && styles.rowEmbeddedBorder,
    ];
    if (onPress) {
      return (
        <Pressable style={rowStyle} onPress={onPress}>
          {content}
        </Pressable>
      );
    }
    return <View style={rowStyle}>{content}</View>;
  }

  const card = (
    <GlassCard borderRadius={Radius.lg} padding={14} style={styles.rowCardShell} contentStyle={styles.row}>
      {content}
    </GlassCard>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        {card}
      </Pressable>
    );
  }

  return card;
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowCardShell: {
    marginBottom: 8,
  },
  rowEmbedded: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  rowEmbeddedBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  providerLogo: {
    width: '100%',
    height: '100%',
  },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 14, fontWeight: '600', color: colors.dark, letterSpacing: -0.2 },
  subtitle: { fontSize: 12, color: colors.muted, fontWeight: '400', lineHeight: 16 },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 14, fontWeight: '800' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
});

function useStyles() {
  return useThemedStyles(createStyles);
}

export { StatusBadge };
