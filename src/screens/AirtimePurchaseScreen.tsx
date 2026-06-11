import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Keyboard, Image,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, formatCurrency, isResponseSuccess, parseWalletBalanceKobo, type AirtimeProvider } from '../lib/api';
import { useWalletStore } from '../stores';
import { Colors, Spacing, Typography, Radius, Shadow, Gradients } from '../theme';
import { Toast } from '../components/ui/Toast';
import { NetworkProviderGrid } from '../components/NetworkProviderGrid';
import { getProviderLogo, getProviderShortName } from '../lib/providers';
import { useHardwareBack } from '../hooks/useHardwareBack';
import { navigateBack } from '../lib/navigation';

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

function SectionLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
    </View>
  );
}

function StepProgress({ step }: { step: 'details' | 'confirm' }) {
  const onConfirm = step === 'confirm';
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressStep, !onConfirm && styles.progressStepActive]}>
        <View style={[styles.progressDot, !onConfirm && styles.progressDotActive]}>
          {onConfirm ? (
            <Ionicons name="checkmark" size={11} color={Colors.white} />
          ) : (
            <Text style={styles.progressDotNum}>1</Text>
          )}
        </View>
        <Text style={[styles.progressText, !onConfirm && styles.progressTextActive]}>Details</Text>
      </View>
      <View style={[styles.progressLine, onConfirm && styles.progressLineDone]} />
      <View style={[styles.progressStep, onConfirm && styles.progressStepActive]}>
        <View style={[styles.progressDot, onConfirm && styles.progressDotActive]}>
          <Text style={[styles.progressDotNum, onConfirm && { color: Colors.white }]}>2</Text>
        </View>
        <Text style={[styles.progressText, onConfirm && styles.progressTextActive]}>Confirm</Text>
      </View>
    </View>
  );
}

export default function AirtimePurchaseScreen() {
  const insets = useSafeAreaInsets();
  const { balance, setBalance } = useWalletStore();
  const [providers, setProviders] = useState<AirtimeProvider[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'details' | 'confirm'>('details');
  const [loading, setLoading] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [detectedNet, setDetectedNet] = useState('');

  useEffect(() => { loadProviders(); }, []);

  const loadProviders = async () => {
    try {
      const res = await api.getAirtimeProviders();
      if (res.success) setProviders(res.data ?? []);
    } finally { setLoadingProviders(false); }
  };

  const onPhoneChange = async (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    setPhone(digits);
    setDetectedNet('');
    if (digits.length === 11) {
      setDetecting(true);
      try {
        const res = await api.validateNetwork(digits);
        if (res.success && res.data?.network) {
          setDetectedNet(res.data.networkName || res.data.network);
          if (!selectedNetwork) setSelectedNetwork(res.data.network);
        }
      } catch {} finally { setDetecting(false); }
    }
  };

  const handleContinue = () => {
    if (!selectedNetwork) { Toast.show({ type: 'error', text1: 'Select Network', text2: 'Please select a network provider' }); return; }
    if (!phone || phone.length < 11) { Toast.show({ type: 'error', text1: 'Invalid Phone', text2: 'Enter a valid 11-digit phone number' }); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt < 100) { Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Minimum airtime amount is ₦100' }); return; }
    Keyboard.dismiss();
    setStep('confirm');
  };

  const handlePurchase = async () => {
    if (!pin || pin.length !== 4) { Toast.show({ type: 'error', text1: 'Enter PIN', text2: 'Enter your 4-digit transaction PIN' }); return; }
    setLoading(true);
    try {
      const res = await api.purchaseAirtime({ network: selectedNetwork, phone, amount: parseFloat(amount), pin });
      if (res.success) {
        const balRes = await api.getWalletBalance();
        if (isResponseSuccess(balRes)) setBalance(parseWalletBalanceKobo(balRes.data));
        Toast.show({ type: 'success', text1: 'Airtime Sent! 🎉', text2: `₦${parseFloat(amount).toLocaleString()} sent to ${phone}` });
        setTimeout(() => { setPhone(''); setAmount(''); setPin(''); setStep('details'); setSelectedNetwork(''); setDetectedNet(''); }, 1500);
      } else {
        Toast.show({ type: 'error', text1: 'Purchase Failed', text2: res.message || 'Please try again' });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Purchase Failed', text2: err?.data?.message || err?.message || 'Please try again' });
    } finally { setLoading(false); }
  };

  const selectedProv = providers.find(p => p.code === selectedNetwork);
  const parsedAmount = parseFloat(amount);
  const showPreview = selectedNetwork && phone.length === 11 && parsedAmount >= 100;

  const handleBack = useCallback(() => {
    if (step === 'confirm') {
      setStep('details');
      setPin('');
      return;
    }
    navigateBack();
  }, [step]);

  useHardwareBack(handleBack);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#FFFFFF', '#FAF5FF', Colors.surface] as [string, string, ...string[]]}
        style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.dark} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <LinearGradient colors={Gradients.primary as [string, string, ...string[]]} style={styles.headerIcon}>
              <Ionicons name="phone-portrait-outline" size={18} color={Colors.white} />
            </LinearGradient>
            <View>
              <Text style={styles.headerTitle}>Buy Airtime</Text>
              <Text style={styles.headerSub}>Instant recharge</Text>
            </View>
          </View>
          <View style={styles.balPill}>
            <Ionicons name="wallet-outline" size={11} color={Colors.primaryLight} />
            <Text style={styles.balText}>{formatCurrency(balance)}</Text>
          </View>
        </View>
        <StepProgress step={step} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 'details' && (
          <>
            {/* Recipient card — network + phone */}
            <View style={styles.card}>
              <SectionLabel
                title="Network"
                hint={selectedProv ? getProviderShortName(selectedProv) : undefined}
              />
              <NetworkProviderGrid
                providers={providers}
                selectedCode={selectedNetwork}
                onSelect={setSelectedNetwork}
                loading={loadingProviders}
              />

              <View style={styles.cardDivider} />

              <SectionLabel title="Phone number" />
              <View style={[
                styles.inputWrap,
                phone.length === 11 && styles.inputWrapValid,
                detecting && styles.inputWrapDetecting,
              ]}>
                <View style={styles.prefixBox}>
                  <Text style={styles.flag}>🇳🇬</Text>
                  <Text style={styles.prefixCode}>+234</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="801 234 5678"
                  placeholderTextColor={Colors.mutedLight}
                  value={phone}
                  onChangeText={onPhoneChange}
                  keyboardType="phone-pad"
                  maxLength={11}
                />
                {detecting && <ActivityIndicator size="small" color={Colors.warning} style={styles.inputIcon} />}
                {!detecting && phone.length === 11 && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} style={styles.inputIcon} />
                )}
              </View>
              {detectedNet ? (
                <View style={styles.detectedBadge}>
                  <Ionicons name="sparkles" size={13} color={Colors.primary} />
                  <Text style={styles.detectedText}>Detected {detectedNet}</Text>
                </View>
              ) : null}
            </View>

            {/* Amount */}
            <View style={styles.card}>
              <SectionLabel title="Amount" hint="Min ₦100" />
              <View style={[styles.amountWrap, amount ? styles.amountWrapFilled : null]}>
                <Text style={styles.nairaSign}>₦</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={Colors.mutedLight}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.quickGrid}>
                {QUICK_AMOUNTS.map(a => {
                  const active = amount === String(a);
                  return (
                    <TouchableOpacity
                      key={a}
                      style={[styles.quickChip, active && styles.quickChipActive]}
                      onPress={() => setAmount(String(a))}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.quickText, active && styles.quickTextActive]}>
                        ₦{a >= 1000 ? `${a / 1000}k` : a}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {showPreview ? (
              <View style={styles.previewBar}>
                <View style={styles.previewLeft}>
                  {selectedProv ? (
                    <Image source={getProviderLogo(selectedProv)} style={styles.previewLogo} resizeMode="contain" />
                  ) : null}
                  <Text style={styles.previewText} numberOfLines={1}>
                    {getProviderShortName(selectedProv || { code: selectedNetwork, name: selectedNetwork, id: '' })}
                    {' · '}{phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')}
                  </Text>
                </View>
                <Text style={styles.previewAmount}>₦{parsedAmount.toLocaleString()}</Text>
              </View>
            ) : null}

            <TouchableOpacity onPress={handleContinue} activeOpacity={0.88} style={styles.ctaWrap}>
              <LinearGradient
                colors={Gradients.primary as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {step === 'confirm' && (
          <>
            <View style={[styles.card, styles.confirmCard]}>
              <LinearGradient
                colors={Gradients.cardSoft as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmHero}
              >
                {selectedProv ? (
                  <View style={styles.confirmLogoWrap}>
                    <Image source={getProviderLogo(selectedProv)} style={styles.confirmLogo} resizeMode="contain" />
                  </View>
                ) : (
                  <View style={[styles.confirmLogoWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Ionicons name="phone-portrait-outline" size={28} color={Colors.white} />
                  </View>
                )}
                <Text style={styles.confirmAmount}>₦{parsedAmount.toLocaleString()}</Text>
                <Text style={styles.confirmSubtitle}>Airtime to {selectedProv?.name || selectedNetwork}</Text>
              </LinearGradient>

              <View style={styles.summaryRows}>
                {[
                  ['Recipient', phone.replace(/(\d{3})(\d{3})(\d{4})/, '0$1 $2 $3')],
                  ['Network', selectedProv?.name || selectedNetwork],
                  ['You pay', `₦${parsedAmount.toLocaleString()}`],
                ].map(([k, v], i, arr) => (
                  <View key={k} style={[styles.summaryRow, i < arr.length - 1 && styles.summaryRowBorder]}>
                    <Text style={styles.summaryKey}>{k}</Text>
                    <Text style={[styles.summaryVal, k === 'You pay' && styles.summaryValHighlight]}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <SectionLabel title="Transaction PIN" />
              <Text style={styles.pinHint}>Enter your 4-digit PIN to authorize this purchase</Text>
              <View style={styles.pinWrap}>
                <View style={styles.pinRow}>
                  {[0, 1, 2, 3].map(i => (
                    <View key={i} style={[styles.pinBox, pin.length > i && styles.pinBoxFilled]}>
                      {pin.length > i ? <View style={styles.pinDot} /> : null}
                    </View>
                  ))}
                </View>
                <TextInput
                  style={styles.pinInputOverlay}
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  autoFocus
                  caretHidden
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handlePurchase}
              disabled={loading || pin.length < 4}
              activeOpacity={0.88}
              style={[styles.ctaWrap, (loading || pin.length < 4) && styles.ctaDisabled]}
            >
              <LinearGradient
                colors={Gradients.primary as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cta}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Text style={styles.ctaText}>Confirm Purchase</Text>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => { setStep('details'); setPin(''); }}>
              <Ionicons name="arrow-back" size={14} color={Colors.muted} />
              <Text style={styles.backLinkText}>Edit details</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  headerGradient: { paddingBottom: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.page,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: 'center', alignItems: 'center',
    ...Shadow.xs,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { ...Typography.h4, color: Colors.dark, fontWeight: '700' },
  headerSub: { ...Typography.caption, color: Colors.muted },
  balPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryDeep,
    paddingVertical: 7, paddingHorizontal: 11,
    borderRadius: Radius.full,
  },
  balText: { ...Typography.captionMed, color: Colors.white },

  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.page + 20,
    paddingBottom: 14,
    gap: 0,
  },
  progressStep: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressStepActive: {},
  progressDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.borderMid,
    justifyContent: 'center', alignItems: 'center',
  },
  progressDotActive: { backgroundColor: Colors.primary },
  progressDotNum: { fontSize: 10, fontWeight: '700', color: Colors.muted },
  progressText: { ...Typography.caption, color: Colors.muted },
  progressTextActive: { color: Colors.primary, fontWeight: '700' },
  progressLine: {
    flex: 1, height: 2, backgroundColor: Colors.borderMid,
    marginHorizontal: 10, maxWidth: 80,
  },
  progressLineDone: { backgroundColor: Colors.primary },

  scroll: { padding: Spacing.page, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.06)',
    ...Shadow.card,
  },
  confirmCard: { padding: 0, overflow: 'hidden' },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: { ...Typography.label, color: Colors.muted, letterSpacing: 0.8 },
  sectionHint: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.surface,
    marginVertical: 16,
  },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.borderMid,
    borderRadius: Radius.lg, backgroundColor: Colors.surface,
    height: 54, overflow: 'hidden',
  },
  inputWrapValid: { borderColor: Colors.success, backgroundColor: '#ECFDF5' },
  inputWrapDetecting: { borderColor: Colors.warning },
  prefixBox: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, height: '100%',
    backgroundColor: Colors.white,
    borderRightWidth: 1, borderRightColor: Colors.border,
  },
  flag: { fontSize: 16 },
  prefixCode: { ...Typography.smallMed, color: Colors.mid },
  input: { flex: 1, fontSize: 16, color: Colors.dark, paddingHorizontal: 14, letterSpacing: 0.5 },
  inputIcon: { marginRight: 12 },
  detectedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingVertical: 6,
  },
  detectedText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

  amountWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.borderMid,
    borderRadius: Radius.lg, backgroundColor: Colors.surface,
    paddingHorizontal: 18, height: 64, gap: 6,
  },
  amountWrapFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  nairaSign: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  amountInput: {
    flex: 1, fontSize: 32, fontWeight: '800',
    color: Colors.primaryDeep, paddingVertical: 0,
  },
  quickGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14,
  },
  quickChip: {
    width: '30%', flexGrow: 1,
    paddingVertical: 10, borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  quickChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  quickText: { ...Typography.smallMed, color: Colors.mid, fontWeight: '600' },
  quickTextActive: { color: Colors.white },

  previewBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primaryMuted,
    borderRadius: Radius.lg,
    paddingVertical: 12, paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  previewLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  previewLogo: { width: 28, height: 18 },
  previewText: { ...Typography.small, color: Colors.primaryDeep, fontWeight: '600', flex: 1 },
  previewAmount: { ...Typography.bodyMed, color: Colors.primary, fontWeight: '800' },

  ctaWrap: { borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.md },
  ctaDisabled: { opacity: 0.5 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 17,
  },
  ctaText: { ...Typography.bodyMed, color: Colors.white, fontWeight: '700', fontSize: 16 },

  confirmHero: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  confirmLogoWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.white,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    ...Shadow.sm,
  },
  confirmLogo: { width: 40, height: 24 },
  confirmAmount: { fontSize: 36, fontWeight: '800', color: Colors.white, letterSpacing: -1 },
  confirmSubtitle: { ...Typography.small, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  summaryRows: { padding: 18, gap: 4 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 11,
  },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surface },
  summaryKey: { ...Typography.small, color: Colors.muted },
  summaryVal: { ...Typography.smallMed, color: Colors.dark, fontWeight: '600' },
  summaryValHighlight: { color: Colors.primary, fontWeight: '800', fontSize: 15 },

  pinHint: { ...Typography.small, color: Colors.muted, marginBottom: 16, marginTop: -4 },
  pinWrap: { position: 'relative', height: 52 },
  pinRow: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  pinBox: {
    width: 52, height: 52, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.borderMid,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  pinBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  pinDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  pinInputOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    fontSize: 16,
    color: 'transparent',
  },

  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
  backLinkText: { ...Typography.small, color: Colors.muted },
});
