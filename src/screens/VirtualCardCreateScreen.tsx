import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { ProfileSubScreen } from '../components/profile/ProfileSubScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { TransactionLockSheet } from '../components/security/TransactionLockSheet';
import { VirtualCardDesignPicker } from '../components/virtual-cards/VirtualCardDesignPicker';
import { VirtualCardVisual } from '../components/virtual-cards/VirtualCardVisual';
import type { TransactionAuthPayload } from '../hooks/useTransactionLockAuth';
import {
  api,
  formatCurrency,
  isResponseSuccess,
  type VirtualCardConfig,
} from '../lib/api';
import { getKycStatusData } from '../lib/kyc-status-cache';
import { isVirtualCardCreationEligible } from '../lib/kyc-status-utils';
import {
  DEFAULT_VIRTUAL_CARD_DESIGN,
  type VirtualCardDesignId,
} from '../lib/virtual-card-designs';
import {
  getVirtualCardConfig,
  peekVirtualCardConfig,
  setVirtualCardDetailCache,
} from '../lib/virtual-cards-cache';
import { useAuthStore } from '../stores';
import { Colors, Radius, Spacing, useThemedStyles } from '../theme';
import { useColors } from '../theme/hooks';
import { formatUsd, parseUsdInput, sanitizeUsdInput, virtualCardIssuanceNotice } from '../lib/virtual-card-utils';
import { useWalletAffordability } from '../hooks/useWalletAffordability';
import { showToast } from '../components/ui/Toast';
import { refreshDashboardData } from '../lib/dashboard-data';
import { newVirtualCardIdempotencyKey } from '../lib/virtual-card-idempotency';

const BRAND_LABELS: Record<'VISA' | 'MASTERCARD', string> = {
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
};

function readCreatePrefundBounds(config: VirtualCardConfig | null) {
  const minRaw = config?.minCreatePrefundUsd ?? config?.initialPrefundUsd ?? '1.00';
  const maxRaw = config?.maxCreatePrefundUsd ?? config?.maxPrefundUsd ?? '1000.00';
  const min = Number(minRaw);
  const max = Number(maxRaw);
  return {
    min: Number.isFinite(min) && min > 0 ? min : 1,
    max: Number.isFinite(max) && max > 0 ? max : 1000,
  };
}

export default function VirtualCardCreateScreen() {
  const styles = useStyles();
  const colors = useColors();
  const user = useAuthStore((s) => s.user);
  const initialConfig = peekVirtualCardConfig();
  const [config, setConfig] = useState<VirtualCardConfig | null>(initialConfig);
  const [brand, setBrand] = useState<'VISA' | 'MASTERCARD'>(initialConfig?.allowedBrands[0] || 'VISA');
  const [cardDesign, setCardDesign] = useState<VirtualCardDesignId>(DEFAULT_VIRTUAL_CARD_DESIGN);
  const [cardName, setCardName] = useState('');
  const [isContactless, setIsContactless] = useState(false);
  const [prefundAmount, setPrefundAmount] = useState('1.00');
  const [loading, setLoading] = useState(!initialConfig);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showLock, setShowLock] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [chargeQuote, setChargeQuote] = useState<{
    amountUsd: string;
    providerFeesUsd: string;
    totalChargeUsd: string;
    totalDebitKobo: string;
  } | null>(null);
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createIdempotencyKeyRef = useRef<string | null>(null);

  const prefundBounds = useMemo(() => readCreatePrefundBounds(config), [config]);
  const prefundUsd = parseUsdInput(prefundAmount);
  const totalDebitKobo = Number(chargeQuote?.totalDebitKobo || 0);
  const holderName = useMemo(
    () => `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    [user?.firstName, user?.lastName],
  );

  const affordability = useWalletAffordability(Number(totalDebitKobo), true);

  const loadConfig = useCallback(async () => {
    const nextConfig = await getVirtualCardConfig();
    if (nextConfig) {
      setConfig(nextConfig);
      setBrand((current) => (
        nextConfig.allowedBrands.includes(current)
          ? current
          : (nextConfig.allowedBrands[0] || 'VISA')
      ));
      const defaultPrefund = nextConfig.defaultCreatePrefundUsd
        ?? nextConfig.minCreatePrefundUsd
        ?? nextConfig.initialPrefundUsd
        ?? '1.00';
      setPrefundAmount(defaultPrefund);
    }
  }, []);

  const requestQuote = useCallback(async (amount: number) => {
    if (amount < prefundBounds.min || amount > prefundBounds.max) {
      setChargeQuote(null);
      setQuoteError(
        `Starting balance must be between ${formatUsd(prefundBounds.min)} and ${formatUsd(prefundBounds.max)}`,
      );
      return;
    }
    setQuoting(true);
    try {
      const res = await api.quoteVirtualCardCharge({
        action: 'issuance',
        amountUsd: amount.toFixed(2),
      });
      if (isResponseSuccess(res) && res.data) {
        setChargeQuote({
          amountUsd: res.data.amountUsd,
          providerFeesUsd: res.data.providerFeesUsd,
          totalChargeUsd: res.data.totalChargeUsd,
          totalDebitKobo: res.data.totalDebitKobo,
        });
        setQuoteError(null);
      } else {
        setChargeQuote(null);
        setQuoteError(res.message || 'Could not calculate card charges');
      }
    } catch (error) {
      setChargeQuote(null);
      setQuoteError(error instanceof Error ? error.message : 'Could not calculate card charges');
    } finally {
      setQuoting(false);
    }
  }, [prefundBounds.max, prefundBounds.min]);

  useEffect(() => {
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    if (prefundUsd <= 0) {
      setChargeQuote(null);
      setQuoteError(null);
      return;
    }
    quoteTimer.current = setTimeout(() => {
      void requestQuote(prefundUsd);
    }, 400);
    return () => {
      if (quoteTimer.current) clearTimeout(quoteTimer.current);
    };
  }, [prefundUsd, requestQuote]);

  useEffect(() => {
    void (async () => {
      if (!initialConfig) setLoading(true);
      try {
        const kyc = await getKycStatusData();
        const eligibility = isVirtualCardCreationEligible(kyc);
        if (!eligibility.ok) {
          Alert.alert(
            'Verification required',
            eligibility.reason || 'Complete verification before creating a virtual card.',
            [
              { text: 'Go to KYC', onPress: () => router.replace('/kyc') },
              { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
            ],
          );
          return;
        }
        await loadConfig();
      } finally {
        setLoading(false);
      }
    })();
  }, [initialConfig, loadConfig]);

  useFocusEffect(
    useCallback(() => {
      void loadConfig();
    }, [loadConfig]),
  );

  const validate = (): string | null => {
    if (!config) return 'Configuration unavailable';
    if (!config.allowedBrands.includes(brand)) return `${brand} cards are not enabled`;
    if (prefundUsd < prefundBounds.min || prefundUsd > prefundBounds.max) {
      return `Starting balance must be between ${formatUsd(prefundBounds.min)} and ${formatUsd(prefundBounds.max)}`;
    }
    if (affordability.insufficientFunds) return 'Insufficient wallet balance';
    return null;
  };

  const handleCreate = async (auth: TransactionAuthPayload) => {
    setSubmitting(true);
    try {
      if (!createIdempotencyKeyRef.current) {
        createIdempotencyKeyRef.current = await newVirtualCardIdempotencyKey('vc-create');
      }
      const res = await api.createVirtualCard({
        brand,
        cardDesign,
        cardName: cardName.trim() || undefined,
        initialPrefundUsd: prefundUsd.toFixed(2),
        isContactless,
        idempotencyKey: createIdempotencyKeyRef.current,
        ...auth,
      });
      if (!isResponseSuccess(res) || !res.data?.card) {
        showToast({ type: 'error', text1: 'Could not create card', text2: res.message });
        return;
      }
      showToast({
        type: 'success',
        text1: 'Card created',
        text2: res.data.message || `Your card starts with ${formatUsd(prefundUsd)}.`,
      });
      setVirtualCardDetailCache(res.data.card);
      void refreshDashboardData();
      router.replace(`/wallet/virtual-cards/${res.data.card.id}`);
      createIdempotencyKeyRef.current = null;
    } catch (error) {
      showToast({
        type: 'error',
        text1: 'Could not create card',
        text2: error instanceof Error ? error.message : 'Try again',
      });
    } finally {
      setSubmitting(false);
      setShowLock(false);
    }
  };

  const onContinue = () => {
    const error = validate();
    if (error) {
      showToast({ type: 'error', text1: 'Check details', text2: error });
      return;
    }
    if (quoting) {
      showToast({ type: 'error', text1: 'Please wait', text2: 'Calculating charges…' });
      return;
    }
    if (!chargeQuote || totalDebitKobo <= 0) {
      showToast({
        type: 'error',
        text1: 'Charges unavailable',
        text2: quoteError || 'Could not calculate wallet debit. Try again shortly.',
      });
      return;
    }
    setShowLock(true);
  };

  if (loading) {
    return (
      <ProfileSubScreen title="New Virtual Card" subtitle="Loading…">
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      </ProfileSubScreen>
    );
  }

  return (
    <>
      <ProfileSubScreen
        title="New Virtual Card"
        subtitle="Choose starting balance and card style"
      >
        <View style={styles.previewWrap}>
          <VirtualCardVisual
            designId={cardDesign}
            brand={brand}
            cardName={cardName}
            holderName={holderName}
            balanceUsd={prefundUsd > 0 ? prefundUsd : prefundBounds.min}
            preview
            size="hero"
          />
        </View>

        <GlassCard contentStyle={styles.section}>
          <VirtualCardDesignPicker
            selected={cardDesign}
            onSelect={setCardDesign}
            brand={brand}
            cardName={cardName}
            holderName={holderName}
            balanceUsd={prefundUsd > 0 ? prefundUsd : prefundBounds.min}
          />
        </GlassCard>

        <GlassCard contentStyle={styles.section}>
          <Text style={styles.label}>Card brand</Text>
          <View style={styles.brandRow}>
            {(config?.allowedBrands || ['VISA', 'MASTERCARD']).map((entry) => (
              <TouchableOpacity
                key={entry}
                style={[styles.brandChip, brand === entry && styles.brandChipActive]}
                onPress={() => setBrand(entry)}
                activeOpacity={0.85}
              >
                <Text style={[styles.brandChipText, brand === entry && styles.brandChipTextActive]}>
                  {BRAND_LABELS[entry]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        <GlassCard contentStyle={styles.section}>
          <Text style={styles.label}>Starting balance (USD)</Text>
          <TextInput
            style={styles.input}
            value={prefundAmount}
            onChangeText={(value) => setPrefundAmount(sanitizeUsdInput(value))}
            placeholder="1.00"
            placeholderTextColor={Colors.mutedLight}
            keyboardType="decimal-pad"
          />
          <Text style={styles.hint}>
            {`Min ${formatUsd(prefundBounds.min)} · Max ${formatUsd(prefundBounds.max)}. A minimum starting balance applies at issuance.`}
          </Text>
        </GlassCard>

        <GlassCard contentStyle={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.label}>Contactless card</Text>
              <Text style={styles.hint}>
                Turn on to issue a contactless-enabled virtual card. Leave off for a standard online-only card.
              </Text>
            </View>
            <Switch
              value={isContactless}
              onValueChange={setIsContactless}
              trackColor={{ false: colors.border, true: `${Colors.primary}55` }}
              thumbColor={isContactless ? Colors.primary : colors.surface}
            />
          </View>
        </GlassCard>

        <GlassCard contentStyle={styles.section}>
          <Text style={styles.label}>Currency</Text>
          <View style={styles.staticField}>
            <Text style={styles.staticFieldText}>USD — United States Dollar</Text>
          </View>
        </GlassCard>

        <GlassCard contentStyle={styles.section}>
          <Text style={styles.label}>Card name (optional)</Text>
          <TextInput
            style={styles.input}
            value={cardName}
            onChangeText={setCardName}
            placeholder="e.g. Shopping card"
            placeholderTextColor={Colors.mutedLight}
            maxLength={40}
          />
        </GlassCard>

        <GlassCard contentStyle={styles.chargeSection}>
          <View style={styles.chargeHeader}>
            <Text style={styles.chargeTitle}>Issuance charge</Text>
            <Text style={styles.chargeSubtitle}>Prefund and fees — wallet is debited in Naira</Text>
          </View>

          <View style={styles.chargeBody}>
            <View style={styles.chargeRow}>
              <Text style={styles.chargeLabel}>Issuer fee</Text>
              {quoting ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.chargeUsdValue}>
                  {formatUsd(chargeQuote?.providerFeesUsd || 0)}
                </Text>
              )}
            </View>
            <View style={styles.chargeRow}>
              <Text style={styles.chargeLabel}>Prefund amount</Text>
              {quoting ? (
                <Text style={styles.chargeDebitValueMuted}>…</Text>
              ) : (
                <Text style={styles.chargeUsdValue}>
                  {formatUsd(chargeQuote?.amountUsd || prefundUsd)}
                </Text>
              )}
            </View>
            <View style={styles.chargeRow}>
              <Text style={styles.chargeLabel}>Total (USD)</Text>
              {quoting ? (
                <Text style={styles.chargeDebitValueMuted}>Calculating…</Text>
              ) : (
                <Text style={styles.chargeUsdValue}>
                  {formatUsd(chargeQuote?.totalChargeUsd || 0)}
                </Text>
              )}
            </View>

            <View style={styles.chargeDivider} />

            <View style={styles.chargeRow}>
              <Text style={styles.chargeDebitLabel}>Total amount</Text>
              {quoting ? (
                <Text style={styles.chargeDebitValueMuted}>Calculating…</Text>
              ) : (
                <Text style={styles.chargeDebitValue}>
                  {formatCurrency(String(totalDebitKobo))}
                </Text>
              )}
            </View>
          </View>

          {!affordability.insufficientFunds ? null : (
            <Text style={styles.chargeWarn}>Insufficient wallet balance</Text>
          )}
          {quoteError ? <Text style={styles.chargeWarn}>{quoteError}</Text> : null}
        </GlassCard>

        <GradientButton title="Create card" onPress={onContinue} disabled={submitting || quoting} />
        <Text style={styles.issuanceNotice}>
          {config?.cardIssuanceNotice || virtualCardIssuanceNotice()}
        </Text>
      </ProfileSubScreen>

      <TransactionLockSheet
        visible={showLock}
        onClose={() => setShowLock(false)}
        onAuthorized={handleCreate}
        title="Authorize card creation"
        subtitle={`Creating ${BRAND_LABELS[brand]} virtual card`}
        amount={formatCurrency(String(totalDebitKobo))}
        processing={submitting}
        processingMessage="Creating your card…"
      />
    </>
  );
}

const createStyles = (colors: import('../theme/types').ThemeColors) => StyleSheet.create({
  previewWrap: {
    marginBottom: 14,
  },
  section: { gap: Spacing.sm, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  brandRow: { flexDirection: 'row', gap: 8 },
  brandChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  brandChipActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}12`,
  },
  brandChipText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  brandChipTextActive: { color: Colors.primary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    backgroundColor: colors.card,
  },
  staticField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: `${colors.border}28`,
  },
  staticFieldText: { fontSize: 14, fontWeight: '600', color: colors.dark },
  hint: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleCopy: { flex: 1, gap: 4 },
  issuanceNotice: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  chargeSection: { gap: 0, marginBottom: 16, padding: 0, overflow: 'hidden' },
  chargeHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 4,
  },
  chargeTitle: { fontSize: 15, fontWeight: '700', color: colors.dark },
  chargeSubtitle: { fontSize: 12, color: colors.muted },
  chargeBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: `${colors.border}28`,
    gap: 12,
  },
  chargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  chargeLabel: { fontSize: 13, color: colors.muted },
  chargeUsdValue: { fontSize: 15, fontWeight: '700', color: colors.dark },
  chargeDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  chargeDebitLabel: { fontSize: 14, fontWeight: '700', color: colors.dark },
  chargeDebitValue: { fontSize: 18, fontWeight: '800', color: colors.dark },
  chargeDebitValueMuted: { fontSize: 14, fontWeight: '600', color: colors.muted },
  chargeWarn: { fontSize: 12, color: Colors.error, lineHeight: 18, paddingHorizontal: 16, paddingBottom: 12 },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
