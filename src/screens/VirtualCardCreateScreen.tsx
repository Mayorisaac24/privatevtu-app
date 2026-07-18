import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProfileSubScreen } from '../components/profile/ProfileSubScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { TransactionLockSheet } from '../components/security/TransactionLockSheet';
import type { TransactionAuthPayload } from '../hooks/useTransactionLockAuth';
import {
  api,
  formatCurrency,
  hasTier2IdentityVerified,
  isResponseSuccess,
  type VirtualCardConfig,
} from '../lib/api';
import { getKycStatusData } from '../lib/kyc-status-cache';
import {
  getVirtualCardConfig,
  peekVirtualCardConfig,
  setVirtualCardDetailCache,
} from '../lib/virtual-cards-cache';
import { Colors, Radius, Spacing, useThemedStyles } from '../theme';
import {
  formatUsd,
  parseUsdInput,
  sanitizeUsdInput,
} from '../lib/virtual-card-utils';
import { useWalletAffordability } from '../hooks/useWalletAffordability';
import { showToast } from '../components/ui/Toast';
import {
  virtualCardUserMessage,
  VIRTUAL_CARD_RATE_UNAVAILABLE,
  VIRTUAL_CARD_RATE_REQUIRED,
} from '../lib/virtual-card-user-message';
import { refreshDashboardData } from '../lib/dashboard-data';

const BRAND_LABELS: Record<'VISA' | 'MASTERCARD', string> = {
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
};

export default function VirtualCardCreateScreen() {
  const styles = useStyles();
  const initialConfig = peekVirtualCardConfig();
  const [config, setConfig] = useState<VirtualCardConfig | null>(initialConfig);
  const [brand, setBrand] = useState<'VISA' | 'MASTERCARD'>(initialConfig?.allowedBrands[0] || 'VISA');
  const [cardName, setCardName] = useState('');
  const [prefundUsd, setPrefundUsd] = useState('');
  const [loading, setLoading] = useState(!initialConfig);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showLock, setShowLock] = useState(false);
  const [chargeQuote, setChargeQuote] = useState<{
    totalProviderUsd: string;
    providerFeesUsd: string;
    totalDebitKobo: string;
    effectiveUsdRateNaira: string;
  } | null>(null);
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefundAmount = parseUsdInput(prefundUsd);
  const totalDebitKobo = Number(chargeQuote?.totalDebitKobo || 0);

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
    }
  }, []);

  const refreshQuotes = useCallback(async (amount: number) => {
    setQuoting(true);
    try {
      const res = await api.quoteVirtualCardCharge({
        action: 'issuance',
        amountUsd: amount > 0 ? amount.toFixed(2) : undefined,
      });
      if (isResponseSuccess(res) && res.data) {
        setChargeQuote({
          totalProviderUsd: res.data.totalProviderUsd,
          providerFeesUsd: res.data.providerFeesUsd,
          totalDebitKobo: res.data.totalDebitKobo,
          effectiveUsdRateNaira: res.data.effectiveUsdRateNaira,
        });
      } else {
        setChargeQuote(null);
        showToast({
          type: 'error',
          text1: 'Rate unavailable',
          text2: virtualCardUserMessage(res.message, VIRTUAL_CARD_RATE_UNAVAILABLE),
        });
      }
    } finally {
      setQuoting(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      if (!initialConfig) setLoading(true);
      try {
        const kyc = await getKycStatusData();
        if (!hasTier2IdentityVerified(kyc)) {
          Alert.alert(
            'Verification required',
            'Complete BVN and NIN verification before creating a virtual card.',
            [
              { text: 'Go to KYC', onPress: () => router.replace('/kyc') },
              { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
            ],
          );
          return;
        }
        await loadConfig();
        await refreshQuotes(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [initialConfig, loadConfig, refreshQuotes]);

  useFocusEffect(
    useCallback(() => {
      void loadConfig();
    }, [loadConfig]),
  );

  useEffect(() => {
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    quoteTimer.current = setTimeout(() => {
      void refreshQuotes(prefundAmount);
    }, 400);
    return () => {
      if (quoteTimer.current) clearTimeout(quoteTimer.current);
    };
  }, [prefundAmount, refreshQuotes]);

  const validate = (): string | null => {
    if (!config) return 'Configuration unavailable';
    if (!config.allowedBrands.includes(brand)) return `${brand} cards are not enabled`;
    const min = parseFloat(config.minPrefundUsd);
    const max = parseFloat(config.maxPrefundUsd);
    if (prefundAmount > 0 && prefundAmount < min) {
      return `Minimum prefund is ${formatUsd(min)}`;
    }
    if (prefundAmount > max) {
      return `Maximum prefund is ${formatUsd(max)}`;
    }
    if (affordability.insufficientFunds) {
      return 'Insufficient wallet balance';
    }
    return null;
  };

  const handleCreate = async (auth: TransactionAuthPayload) => {
    setSubmitting(true);
    try {
      const res = await api.createVirtualCard({
        brand,
        cardName: cardName.trim() || undefined,
        prefundUsd: prefundAmount > 0 ? prefundAmount : undefined,
        ...auth,
      });
      if (!isResponseSuccess(res) || !res.data?.card) {
        showToast({ type: 'error', text1: 'Could not create card', text2: res.message });
        return;
      }
      showToast({ type: 'success', text1: 'Card created', text2: res.data.message || res.message });
      setVirtualCardDetailCache(res.data.card);
      void refreshDashboardData();
      router.replace(`/wallet/virtual-cards/${res.data.card.id}`);
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
    if (!chargeQuote || totalDebitKobo <= 0) {
      showToast({
        type: 'error',
        text1: 'Rate unavailable',
        text2: VIRTUAL_CARD_RATE_REQUIRED,
      });
      return;
    }
    setShowLock(true);
  };

  if (loading) {
    return (
      <ProfileSubScreen title="New Virtual Card" subtitle="Create a USD card" headerIcon="add-circle-outline">
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
      </ProfileSubScreen>
    );
  }

  return (
    <>
      <ProfileSubScreen title="New Virtual Card" subtitle="Create a USD card" headerIcon="add-circle-outline">
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

        <GlassCard contentStyle={styles.section}>
          <Text style={styles.label}>Initial prefund (USD)</Text>
          <TextInput
            style={styles.input}
            value={prefundUsd}
            onChangeText={(v) => setPrefundUsd(sanitizeUsdInput(v))}
            placeholder="0.00"
            placeholderTextColor={Colors.mutedLight}
            keyboardType="decimal-pad"
          />
          {config ? (
            <Text style={styles.hint}>
              Optional. Min {formatUsd(config.minPrefundUsd)} · Max {formatUsd(config.maxPrefundUsd)} · Live rate ₦{chargeQuote?.effectiveUsdRateNaira || config.effectiveUsdRateNaira}/$
            </Text>
          ) : null}
        </GlassCard>

        <GlassCard contentStyle={styles.section}>
          <Text style={styles.summaryTitle}>Charge summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Prefund</Text>
            <Text style={styles.summaryValue}>{formatUsd(prefundAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Card fees (USD)</Text>
            <Text style={styles.summaryValue}>
              {quoting ? '…' : formatUsd(chargeQuote?.providerFeesUsd || 0)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total (USD equiv.)</Text>
            <Text style={styles.summaryValue}>
              {quoting ? '…' : formatUsd(chargeQuote?.totalProviderUsd || prefundAmount)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryTotalLabel}>Wallet debit</Text>
            <Text style={styles.summaryTotalValue}>{formatCurrency(String(totalDebitKobo))}</Text>
          </View>
          {!affordability.insufficientFunds ? null : (
            <Text style={styles.warn}>Insufficient wallet balance</Text>
          )}
        </GlassCard>

        <GradientButton title="Create card" onPress={onContinue} disabled={submitting || quoting} />
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
    color: colors.dark,
    backgroundColor: colors.surface,
  },
  hint: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: colors.dark },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: colors.muted },
  summaryValue: { fontSize: 13, fontWeight: '600', color: colors.dark },
  summaryTotal: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  summaryTotalLabel: { fontSize: 14, fontWeight: '700', color: colors.dark },
  summaryTotalValue: { fontSize: 16, fontWeight: '800', color: colors.dark },
  warn: { fontSize: 12, color: Colors.error, marginTop: 6 },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
