import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, formatCurrencyVisible, isResponseSuccess, type Transaction } from '../lib/api';
import { findCachedTransaction } from '../lib/transaction-cache';
import { BankLogo } from '../components/BankLogo';
import { formatAccountNumberDisplay, resolveTransferBankForDisplay } from '../lib/transfer-banks';
import { NetworkProviderLogo } from '../components/NetworkProviderLogo';
import { getEducationProviderLogo, hasEducationProviderLogo } from '../lib/education-providers';
import { getBettingPlatformLogo, hasBettingPlatformLogo } from '../lib/betting-platforms';
import {Colors, Gradients, Radius, Shadow, Spacing, Typography , Palette, FormColors, BRAND, Overlays, useThemedStyles } from '../theme';
import { Skeleton } from '../components/ui/Skeleton';
import {
  enrichTransaction,
  formatTransactionDateTime,
  getAmountPresentation,
  getStatusMeta,
  getTransactionFeeKobo,
  getTransactionMeta,
  getTransactionVisual,
  getTransactionWalletDebitKobo,
  getWalletFundingFeeKobo,
  getWalletFundingGrossAmountKobo,
  hasTransactionPricingDiscount,
  hasWalletFundingBreakdown,
} from '../lib/transaction-display';
import { showToast } from '../components/ui/Toast';
import { ThemedScreen } from '../components/ui/ThemedScreen';
import { useGradients } from '../theme/hooks';
import { gradientStops } from '../theme/gradient-utils';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassSurface } from '../components/ui/GlassSurface';
import { ShareReceiptSheet } from '../components/transaction/ShareReceiptSheet';
const TIMELINE_BRAND = Colors.primary;
const TIMELINE_BRAND_RING = Overlays.rgba124_58_237_02;
const TIMELINE_BRAND_LINE = Colors.primaryLight;

type Props = {
  id: string;
};

function readMetaString(metadata: unknown, key: string): string {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '';
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : '';
}

function formatPaymentMethod(type: string): string {
  switch (String(type || '').toUpperCase()) {
    case 'WITHDRAWAL':
    case 'TRANSFER':
      return 'Bank transfer';
    case 'WALLET_FUND':
      return 'Wallet funding';
    case 'AIRTIME':
      return 'Airtime';
    case 'DATA':
      return 'Data';
    case 'ELECTRICITY':
      return 'Electricity';
    case 'CABLE':
      return 'Cable TV';
    case 'EDUCATION':
      return 'Education PIN';
    case 'BETTING':
      return 'Betting';
    default:
      return type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

function getHeroGradient(
  tone: ReturnType<typeof getStatusMeta>['tone'],
  isFunding: boolean,
  gradients: ReturnType<typeof useGradients>,
): string[] {
  if (isFunding && tone === 'successful') return [...gradients.success];
  switch (tone) {
    case 'successful':
      return [...gradients.card];
    case 'failed':
      return [...gradients.buttonDanger];
    case 'processing':
      return [...gradients.primary];
    default:
      return [...gradients.cardSoft];
  }
}

function DetailRow({
  label,
  value,
  copyValue,
  onCopy,
  mono,
  isLast,
}: {
  label: string;
  value: string;
  copyValue?: string;
  onCopy?: (value: string, label: string) => void;
  mono?: boolean;
  isLast?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.detailRow, isLast && styles.detailRowLast]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueWrap}>
        <Text
          style={[styles.detailValue, mono && styles.detailValueMono]}
          numberOfLines={3}
          selectable
        >
          {value}
        </Text>
        {copyValue && onCopy ? (
          <Pressable
            style={({ pressed }) => [styles.copyBtn, pressed && styles.copyBtnPressed]}
            onPress={() => onCopy(copyValue, label)}
          >
            <Ionicons name="copy-outline" size={13} color={Colors.primary} />
            <Text style={styles.copyText}>Copy</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function TimelineStep({
  title,
  subtitle,
  active,
  completed,
  failed,
  isLast,
  accentColor,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  completed: boolean;
  failed?: boolean;
  isLast?: boolean;
  accentColor: string;
}) {
  const styles = useStyles();

  const pending = !completed && !active && !failed;
  const dotColor = failed
    ? Colors.error
    : completed || active
      ? accentColor
      : Colors.borderMid;
  const ringColor = failed
    ? Overlays.rgba239_68_68_018
    : completed || active
      ? TIMELINE_BRAND_RING
      : 'transparent';

  const iconName = failed
    ? 'close'
    : completed
      ? 'checkmark'
      : active
        ? 'ellipse'
        : 'ellipse-outline';

  return (
    <View style={styles.timelineStep}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDotRing, { backgroundColor: ringColor }]}>
          <View style={[styles.timelineDot, { backgroundColor: dotColor }]}>
            <Ionicons name={iconName as any} size={11} color={Colors.white} />
          </View>
        </View>
        {!isLast ? (
          <View
            style={[
              styles.timelineLine,
              completed || active ? { backgroundColor: completed ? TIMELINE_BRAND_LINE : accentColor } : null,
            ]}
          />
        ) : null}
      </View>
      <View style={[styles.timelineBody, isLast && styles.timelineBodyLast]}>
        <Text style={[styles.timelineTitle, pending && styles.timelineTitleMuted]}>{title}</Text>
        <Text style={styles.timelineSub}>{subtitle}</Text>
      </View>
    </View>
  );
}

function TransactionDetailSkeleton({ topInset }: { topInset: number }) {
  const styles = useStyles();

  return (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={220 + topInset} borderRadius={0} />
      <View style={styles.skeletonBody}>
        <GlassCard borderRadius={Radius.xl} padding={18} contentStyle={styles.sectionCard}>
          <Skeleton width="30%" height={14} />
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonTimelineRow}>
              <Skeleton width={28} height={28} borderRadius={14} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="40%" height={12} />
                <Skeleton width="85%" height={10} />
              </View>
            </View>
          ))}
        </GlassCard>
        <GlassCard borderRadius={Radius.xl} padding={18} contentStyle={styles.sectionCard}>
          <Skeleton width="28%" height={14} />
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ gap: 6, marginTop: 14 }}>
              <Skeleton width="35%" height={10} />
              <Skeleton width="75%" height={12} />
            </View>
          ))}
        </GlassCard>
      </View>
    </View>
  );
}

function TransactionAvatar({ tx, size = 64, onDark }: { tx: ReturnType<typeof enrichTransaction>; size?: number; onDark?: boolean }) {
  const styles = useStyles();

  const visual = getTransactionVisual(tx);
  const bankCode = readMetaString(tx.metadata, 'bankCode') || tx.logoKey || '';
  const bankName = readMetaString(tx.metadata, 'bankName');
  const wrapStyle = [
    styles.heroAvatar,
    { width: size, height: size, borderRadius: size / 2 },
    onDark && styles.heroAvatarOnDark,
  ];

  if (visual.logoType === 'bank' && bankCode) {
    const bank = resolveTransferBankForDisplay(bankCode, bankName);
    return (
      <View style={wrapStyle}>
        <BankLogo bank={bank} size={size - 8} />
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
          <View style={wrapStyle}>
            <Image
              source={bettingLogo as ImageSourcePropType}
              style={{ width: size - 12, height: size - 12, borderRadius: 10 }}
              resizeMode="contain"
            />
          </View>
        );
      }
      return (
        <View style={[wrapStyle, { backgroundColor: onDark ? Overlays.white16 : Colors.primaryMuted }]}>
          <Ionicons name="trophy-outline" size={size * 0.38} color={onDark ? Colors.white : Colors.primary} />
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
          <View style={wrapStyle}>
            <Image
              source={eduLogo as ImageSourcePropType}
              style={{ width: size - 12, height: size - 12, borderRadius: 10 }}
              resizeMode="contain"
            />
          </View>
        );
      }
    }

    if (tx.type === 'AIRTIME' || tx.type === 'DATA') {
      return (
        <View style={wrapStyle}>
          <NetworkProviderLogo
            provider={{ code: visual.providerCode, id: visual.providerCode, imageUrl: providerImageUrl }}
            size={size}
          />
        </View>
      );
    }

    return (
      <View style={[wrapStyle, { backgroundColor: onDark ? Overlays.white16 : visual.bgColor }]}>
        <Ionicons name={visual.icon as any} size={size * 0.38} color={onDark ? Colors.white : visual.iconColor} />
      </View>
    );
  }

  return (
    <View style={[wrapStyle, { backgroundColor: onDark ? Overlays.white16 : visual.bgColor }]}>
      <Ionicons name={visual.icon as any} size={size * 0.38} color={onDark ? Colors.white : visual.iconColor} />
    </View>
  );
}

function SectionHeader({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  const styles = useStyles();

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={14} color={Colors.primary} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const DISPUTABLE_TYPES = new Set([
  'AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'EDUCATION', 'BETTING',
  'TRANSFER', 'WITHDRAWAL', 'WALLET_FUND',
]);

export default function TransactionDetailScreen({ id }: Props) {
  const styles = useStyles();

  const insets = useSafeAreaInsets();
  const gradients = useGradients();
  const [transaction, setTransaction] = useState<Transaction | null>(() => findCachedTransaction(id));
  const [loadingDetail, setLoadingDetail] = useState(() => !findCachedTransaction(id));
  const [disputeEligibility, setDisputeEligibility] = useState<{
    allowed: boolean;
    reason?: string;
    existingDisputeId?: string;
  } | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const preview = findCachedTransaction(id);
    setTransaction(preview);
    setLoadingDetail(!preview);

    (async () => {
      try {
        const res = await api.getTransactionDetail(id);
        if (!cancelled && isResponseSuccess(res) && res.data) {
          setTransaction(res.data);
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!transaction?.id || !DISPUTABLE_TYPES.has(String(transaction.type || '').toUpperCase())) {
      setDisputeEligibility(null);
      return;
    }
    let cancelled = false;
    void api.getDisputeEligibility(transaction.id).then((res) => {
      if (!cancelled && isResponseSuccess(res) && res.data) {
        setDisputeEligibility(res.data);
      }
    });
    return () => { cancelled = true; };
  }, [transaction?.id, transaction?.type]);

  const tx = useMemo(
    () => (transaction ? enrichTransaction(transaction) : null),
    [transaction],
  );

  const handleCopy = useCallback(async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    showToast({ type: 'success', text1: 'Copied', text2: `${label} copied` });
  }, []);

  const handleShare = useCallback(() => {
    if (!tx) return;
    setShowShareSheet(true);
  }, [tx]);

  const header = (
    <GlassSurface
      variant="light"
      borderRadius={0}
      style={styles.headerShell}
      contentStyle={{ ...styles.header, paddingTop: insets.top + 8 }}
    >
      <Pressable style={styles.headerBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={22} color={Colors.dark} />
      </Pressable>
      <Text style={styles.headerTitle}>Transaction</Text>
      <Pressable
        style={[styles.shareBtn, !tx && styles.shareBtnDisabled]}
        onPress={() => handleShare()}
        disabled={!tx}
      >
        <Ionicons name="share-outline" size={16} color={tx ? Colors.primary : Colors.mutedLight} />
        <Text style={[styles.shareText, !tx && styles.shareTextDisabled]}>Share</Text>
      </Pressable>
    </GlassSurface>
  );

  if (loadingDetail && !tx) {
    return (
      <ThemedScreen>
        {header}
        <TransactionDetailSkeleton topInset={insets.top} />
      </ThemedScreen>
    );
  }

  if (!tx) {
    return (
      <ThemedScreen style={styles.centered}>
        {header}
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="receipt-outline" size={28} color={Colors.mutedLight} />
          </View>
          <Text style={styles.emptyTitle}>Transaction not found</Text>
          <Text style={styles.emptySub}>This receipt may have been removed or is no longer available.</Text>
          <Pressable style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Go back</Text>
          </Pressable>
        </View>
      </ThemedScreen>
    );
  }

  const { prefix } = getAmountPresentation(tx);
  const statusMeta = getStatusMeta(tx.displayStatus || 'pending');
  const typeMeta = getTransactionMeta(tx);
  const transfer = tx.transferDetails;
  const bankCode = transfer?.bankCode || readMetaString(tx.metadata, 'bankCode') || tx.logoKey || '';
  const bankName = readMetaString(tx.metadata, 'bankName');
  const bank = bankCode ? resolveTransferBankForDisplay(bankCode, bankName) : null;
  const when = formatTransactionDateTime(tx.createdAt);
  const isTransfer = tx.type === 'WITHDRAWAL' || tx.type === 'TRANSFER';
  const isFailed = statusMeta.tone === 'failed';
  const isSuccessful = statusMeta.tone === 'successful';
  const isProcessing = statusMeta.tone === 'processing' || statusMeta.tone === 'pending';
  const isFunding = tx.type === 'WALLET_FUND' || tx.type === 'ADMIN_CREDIT';
  const displayAmount = tx.displayAmountKobo || tx.displayAmount || tx.amount;
  const walletDebitKobo = getTransactionWalletDebitKobo(tx);
  const hasPricingDiscount = hasTransactionPricingDiscount(tx);
  const feeKobo = isFunding ? getWalletFundingFeeKobo(tx) : getTransactionFeeKobo(tx);
  const hasFee = BigInt(feeKobo || '0') > 0n;
  const fundingBreakdown = isFunding && hasWalletFundingBreakdown(tx);
  const fundedAmountKobo = fundingBreakdown ? getWalletFundingGrossAmountKobo(tx) : null;
  const accountNumber = transfer?.accountNumber || readMetaString(tx.metadata, 'accountNumber');
  const recipientName = transfer?.accountName
    || readMetaString(tx.metadata, 'accountName')
    || tx.displayTitle
    || 'Recipient';
  const heroGradient = getHeroGradient(statusMeta.tone, isFunding, gradients);
  const detailRows: Array<{
    label: string;
    value: string;
    copyValue?: string;
    mono?: boolean;
  }> = [];

  if (!isTransfer) {
    if (tx.phone) detailRows.push({ label: 'Phone', value: tx.phone, copyValue: tx.phone });
    if (tx.provider) detailRows.push({ label: 'Provider', value: tx.provider });
    const purchasedPin = readMetaString(tx.metadata, 'purchasedPin');
    if (purchasedPin) {
      detailRows.push({ label: 'Exam PIN', value: purchasedPin, copyValue: purchasedPin, mono: true });
    }
  }

  if (fundingBreakdown && fundedAmountKobo) {
    detailRows.push({
      label: 'Amount funded',
      value: tx.formattedFundedAmount || formatCurrencyVisible(fundedAmountKobo, true),
    });
    if (hasFee) {
      detailRows.push({
        label: 'Fee',
        value: tx.formattedFee || formatCurrencyVisible(feeKobo, true),
      });
    }
    detailRows.push({
      label: 'Amount credited',
      value: tx.formattedDisplayAmount || formatCurrencyVisible(displayAmount, true),
    });
  } else {
    detailRows.push({
      label: 'Amount',
      value: tx.formattedDisplayAmount || formatCurrencyVisible(displayAmount, true),
    });

    if (hasPricingDiscount) {
      detailRows.push({
        label: 'Debited amount',
        value: tx.formattedTotalDebited || formatCurrencyVisible(walletDebitKobo, true),
      });
    }

    if (hasFee) {
      detailRows.push({
        label: 'Fee',
        value: tx.formattedFee || formatCurrencyVisible(feeKobo, true),
      });
      if (tx.formattedTotalDebited) {
        detailRows.push({ label: 'Total debited', value: tx.formattedTotalDebited });
      }
    }
  }

  detailRows.push({ label: 'Payment method', value: formatPaymentMethod(tx.type) });
  detailRows.push({ label: 'Reference', value: tx.reference, copyValue: tx.reference, mono: true });
  if (tx.providerRef) {
    detailRows.push({ label: 'Provider reference', value: tx.providerRef, copyValue: tx.providerRef, mono: true });
  }
  if (tx.formattedBalanceBefore || tx.balanceBefore) {
    detailRows.push({
      label: 'Balance before',
      value: tx.formattedBalanceBefore || formatCurrencyVisible(tx.balanceBefore || '0', true),
    });
  }
  if (tx.formattedBalanceAfter || tx.balanceAfter) {
    detailRows.push({
      label: 'Balance after',
      value: tx.formattedBalanceAfter || formatCurrencyVisible(tx.balanceAfter || '0', true),
    });
  }

  return (
    <ThemedScreen>
      {header}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={gradientStops(heroGradient)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.heroBlob1} />
          <View style={styles.heroBlob2} />

          <TransactionAvatar tx={tx} onDark />

          <Text style={styles.heroAmount}>
            {formatCurrencyVisible(displayAmount, true, prefix)}
          </Text>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {tx.displayTitle}
          </Text>
          <Text style={styles.heroWhen}>{when}</Text>

          <View style={styles.heroTypePill}>
            <Ionicons name={typeMeta.icon as any} size={12} color={Overlays.white90} />
            <Text style={styles.heroTypeText}>{formatPaymentMethod(tx.type)}</Text>
          </View>

          <View style={styles.heroStatusWrap}>
            <View style={styles.heroStatusPill}>
              <View style={[styles.heroStatusDot, { backgroundColor: statusMeta.dot }]} />
              <Text style={styles.heroStatusText}>{statusMeta.label}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.bodyStack}>
          <GlassCard borderRadius={Radius.xl} padding={18} contentStyle={styles.sectionCard}>
            <SectionHeader icon="git-network-outline" title="Status" />
            <TimelineStep
              title="Initiated"
              subtitle={`${when} · You started this transaction`}
              active={isProcessing || isSuccessful || isFailed}
              completed={isSuccessful || isFailed}
              accentColor={TIMELINE_BRAND}
              isLast={false}
            />
            <TimelineStep
              title={isFailed ? 'Failed' : 'Processing'}
              subtitle={
                isFailed
                  ? tx.errorMessage || 'This transaction could not be completed.'
                  : isSuccessful
                    ? `${when} · Provider accepted your transaction`
                    : 'Your transaction is being processed.'
              }
              active={isProcessing}
              completed={isSuccessful}
              failed={isFailed}
              accentColor={Colors.primaryGlow}
              isLast={false}
            />
            <TimelineStep
              title="Completed"
              subtitle={
                isSuccessful
                  ? `${when} · Transaction completed successfully`
                  : isFailed
                    ? 'Transaction did not complete'
                    : 'Waiting for confirmation'
              }
              active={isSuccessful}
              completed={isSuccessful}
              failed={isFailed}
              accentColor={TIMELINE_BRAND}
              isLast
            />
          </GlassCard>

          <GlassCard borderRadius={Radius.xl} padding={18} contentStyle={styles.sectionCard}>
            <SectionHeader icon="document-text-outline" title="Details" />

            {isTransfer ? (
              <View style={styles.recipientCard}>
                <View style={styles.recipientLogo}>
                  {bank ? (
                    <BankLogo bank={bank} size={44} />
                  ) : (
                    <View style={styles.recipientLogoFallback}>
                      <Ionicons name="person-outline" size={20} color={Colors.primary} />
                    </View>
                  )}
                </View>
                <View style={styles.recipientInfo}>
                  <Text style={styles.recipientLabel}>Sent to</Text>
                  <Text style={styles.recipientName} numberOfLines={2}>
                    {recipientName}
                  </Text>
                  {accountNumber ? (
                    <Text style={styles.recipientMeta}>
                      {bank ? `${bank.shortName || bank.name} · ` : ''}
                      {formatAccountNumberDisplay(accountNumber)}
                    </Text>
                  ) : bank ? (
                    <Text style={styles.recipientMeta}>{bank.shortName || bank.name}</Text>
                  ) : null}
                </View>
                <View style={styles.sentBadge}>
                  <Ionicons name="paper-plane" size={14} color={Colors.primary} />
                </View>
              </View>
            ) : null}

            {isTransfer && transfer?.narration ? (
              <>
                {isTransfer ? <View style={styles.cardDivider} /> : null}
                <DetailRow label="Description" value={transfer.narration} />
              </>
            ) : null}

            {isTransfer && (detailRows.length > 0 || transfer?.narration) ? (
              <View style={styles.cardDivider} />
            ) : null}

            {detailRows.map((row, index) => (
              <DetailRow
                key={row.label}
                label={row.label}
                value={row.value}
                copyValue={row.copyValue}
                onCopy={handleCopy}
                mono={row.mono}
                isLast={index === detailRows.length - 1}
              />
            ))}
          </GlassCard>

          {disputeEligibility?.existingDisputeId ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push(`/profile/disputes/${disputeEligibility.existingDisputeId}`)}
            >
              <GlassCard borderRadius={Radius.xl} padding={16} contentStyle={styles.disputeCard}>
                <Ionicons name="shield-outline" size={20} color={Colors.primary} />
                <View style={styles.disputeCopy}>
                  <Text style={styles.disputeTitle}>Dispute in progress</Text>
                  <Text style={styles.disputeSub}>View your open case for this transaction</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.mutedLight} />
              </GlassCard>
            </TouchableOpacity>
          ) : disputeEligibility?.allowed ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push({
                pathname: '/profile/disputes/new',
                params: { transactionId: tx.id },
              })}
            >
              <GlassCard borderRadius={Radius.xl} padding={16} contentStyle={styles.disputeCard}>
                <Ionicons name="alert-circle-outline" size={20} color={Palette.amber600} />
                <View style={styles.disputeCopy}>
                  <Text style={styles.disputeTitle}>Report an issue</Text>
                  <Text style={styles.disputeSub}>Open a dispute if this transaction did not go as expected</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.mutedLight} />
              </GlassCard>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      <ShareReceiptSheet
        visible={showShareSheet}
        transaction={tx}
        onClose={() => setShowShareSheet(false)}
      />
    </ThemedScreen>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  centered: { justifyContent: 'center' },
  headerShell: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.page,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  headerTitle: { ...Typography.h4, color: colors.dark },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: colors.primaryMuted,
  },
  shareBtnDisabled: { backgroundColor: colors.surfaceAlt },
  shareText: { ...Typography.captionMed, color: colors.primary },
  shareTextDisabled: { color: colors.mutedLight },
  disputeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  disputeCopy: { flex: 1, gap: 2 },
  disputeTitle: { ...Typography.captionMed, color: colors.dark, fontWeight: '700' },
  disputeSub: { ...Typography.small, color: colors.muted },
  content: { paddingBottom: 40 },
  skeletonWrap: { flex: 1 },
  skeletonBody: { marginTop: -18, paddingHorizontal: Spacing.page, gap: 14 },
  skeletonTimelineRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  heroGradient: {
    alignItems: 'center',
    paddingHorizontal: Spacing.page,
    paddingTop: 28,
    paddingBottom: 36,
    overflow: 'hidden',
  },
  heroBlob1: {
    position: 'absolute',
    top: -24,
    right: -20,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: Overlays.white07,
  },
  heroBlob2: {
    position: 'absolute',
    bottom: 8,
    left: -18,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Overlays.rgba255_255_255_005,
  },
  heroAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 14,
  },
  heroAvatarOnDark: {
    backgroundColor: Overlays.white14,
    borderWidth: 2,
    borderColor: Overlays.white28,
    ...Shadow.sm,
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Overlays.white95,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '92%',
  },
  heroWhen: {
    ...Typography.caption,
    color: Overlays.white72,
    textAlign: 'center',
    marginTop: 4,
  },
  heroTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Overlays.white12,
    borderWidth: 1,
    borderColor: Overlays.white18,
  },
  heroTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Overlays.white90,
    letterSpacing: 0.2,
  },
  heroStatusWrap: { marginTop: 14 },
  heroStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Overlays.white16,
    borderWidth: 1,
    borderColor: Overlays.rgba255_255_255_022,
  },
  heroStatusDot: { width: 8, height: 8, borderRadius: 4 },
  heroStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.2,
  },
  bodyStack: {
    marginTop: -20,
    paddingHorizontal: Spacing.page,
    gap: 14,
  },
  sectionCard: {
    gap: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { ...Typography.h4, color: colors.dark },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: Radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  recipientLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  recipientLogoFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientInfo: { flex: 1, gap: 2 },
  recipientLabel: {
    ...Typography.label,
    color: colors.muted,
    fontSize: 9,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark,
    lineHeight: 18,
  },
  recipientMeta: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
    marginTop: 1,
  },
  sentBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.surfaceAlt,
    marginVertical: 14,
  },
  detailRow: {
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceAlt,
    gap: 5,
  },
  detailRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  detailLabel: { ...Typography.label, color: colors.muted, fontSize: 9 },
  detailValueWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  detailValue: { flex: 1, ...Typography.bodyMed, color: colors.dark, lineHeight: 20 },
  detailValueMono: { ...Typography.mono, fontSize: 12, color: colors.mid },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: colors.primaryMuted,
  },
  copyBtnPressed: { opacity: 0.75 },
  copyText: { ...Typography.captionMed, color: colors.primary },
  timelineStep: { flexDirection: 'row', gap: 12, minHeight: 68 },
  timelineRail: { width: 28, alignItems: 'center' },
  timelineDotRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.borderMid,
    marginTop: 4,
    borderRadius: 1,
  },
  timelineBody: { flex: 1, paddingBottom: 14 },
  timelineBodyLast: { paddingBottom: 0 },
  timelineTitle: { ...Typography.smallMed, color: colors.dark, fontWeight: '700' },
  timelineTitleMuted: { color: colors.mutedLight },
  timelineSub: { ...Typography.caption, color: colors.muted, marginTop: 3, lineHeight: 17 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { ...Typography.h4, color: colors.dark },
  emptySub: { ...Typography.small, color: colors.muted, textAlign: 'center', lineHeight: 18 },
  backLink: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: colors.primaryMuted,
  },
  backLinkText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
