import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, BackHandler,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  api,
  getKycTierLabel,
  hasBvnVerified,
  isResponseSuccess,
  type KycStatusData,
  type KycTierRequirement,
} from '../../src/lib/api';
import { useAuthStore } from '../../src/stores';
import { useStatusBarStyle } from '../../src/hooks/useStatusBarStyle';
import { Colors, Radius, Shadow, Spacing, Gradients } from '../../src/theme';
import { showToast } from '../../src/components/ui/Toast';
import { navigateBack } from '../../src/lib/navigation';
import {
  getKycStatusData,
  hasKycStatusCache,
  peekKycStatusCache,
  pullToRefreshKycStatus,
  setKycStatusCache,
} from '../../src/lib/kyc-status-cache';
import { DateOfBirthField } from '../../src/components/DateOfBirthField';
import { ThemedScreen } from '../../src/components/ui/ThemedScreen';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { useGradients } from '../../src/theme/hooks';
import { gradientStops } from '../../src/theme/gradient-utils';
import { GlassCard } from '../../src/components/ui/GlassCard';

type Step = 'status' | 'tier2' | 'phone-verify' | 'phone-otp' | 'tier3';

const TIER_META: Record<string, {
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  accentBg: string;
}> = {
  TIER_1: { icon: 'phone-portrait-outline', accent: Colors.primary, accentBg: Colors.primaryMuted },
  TIER_2: { icon: 'finger-print-outline', accent: Colors.primary, accentBg: Colors.primaryMuted },
  TIER_3: { icon: 'shield-checkmark-outline', accent: Colors.primary, accentBg: Colors.primaryMuted },
};

function tierProgress(currentTier: string): number {
  if (currentTier === 'TIER_3') return 100;
  if (currentTier === 'TIER_2') return 66;
  if (currentTier === 'TIER_1') return 33;
  return 8;
}

function tierIndex(tier: string): number {
  if (tier === 'TIER_3') return 3;
  if (tier === 'TIER_2') return 2;
  if (tier === 'TIER_1') return 1;
  return 0;
}

/** Requirements introduced at this tier only — excludes carry-over from earlier steps. */
const TIER_STEP_REQ_IDS: Record<string, string[]> = {
  TIER_1: ['email', 'phone'],
  TIER_2: ['dob', 'bvn'],
  TIER_3: ['address', 'id', 'selfie'],
};

function getTierStepRequirements(
  tierKey: string,
  requirements: Array<{ id: string; label: string; completed: boolean }>,
) {
  const ids = TIER_STEP_REQ_IDS[tierKey];
  if (!ids) return requirements;
  return requirements.filter((r) => ids.includes(r.id));
}

function formatKobo(kobo?: string): string {
  if (!kobo) return '—';
  const n = Number(kobo) / 100;
  if (!n) return '₦0';
  return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function hasMeaningfulLimits(limits?: { daily: string; monthly: string; single: string }) {
  if (!limits) return false;
  return [limits.daily, limits.monthly, limits.single].some((v) => Number(v) > 0);
}

function LimitRow({
  limits,
  dimmed,
}: {
  limits: { daily: string; monthly: string; single: string };
  dimmed?: boolean;
}) {
  const valueStyle = dimmed ? styles.limitValueDimmed : undefined;
  return (
    <View style={[styles.limitsRow, dimmed && styles.limitsRowDimmed]}>
      <View style={styles.limitItem}>
        <Text style={styles.limitLabel}>Daily</Text>
        <Text style={[styles.limitValue, valueStyle]}>{formatKobo(limits.daily)}</Text>
      </View>
      <View style={[styles.limitDivider, dimmed && styles.limitDividerDimmed]} />
      <View style={styles.limitItem}>
        <Text style={styles.limitLabel}>Monthly</Text>
        <Text style={[styles.limitValue, valueStyle]}>{formatKobo(limits.monthly)}</Text>
      </View>
      <View style={[styles.limitDivider, dimmed && styles.limitDividerDimmed]} />
      <View style={styles.limitItem}>
        <Text style={styles.limitLabel}>Per txn</Text>
        <Text style={[styles.limitValue, valueStyle]}>{formatKobo(limits.single)}</Text>
      </View>
    </View>
  );
}

const REQ_COMPACT_LABELS: Record<string, string> = {
  id: 'Gov ID',
  selfie: 'Selfie',
};

function RequirementPills({
  requirements,
  dimmed,
}: {
  requirements: Array<{ id: string; label: string; completed: boolean }>;
  dimmed?: boolean;
}) {
  if (!requirements.length) return null;

  const singleRow = requirements.length <= 3;

  return (
    <View style={[styles.reqPills, singleRow && styles.reqPillsSingleRow]}>
      {requirements.map((req) => (
        <View
          key={req.id}
          style={[
            styles.reqPill,
            singleRow && styles.reqPillSingleRow,
            req.completed && styles.reqPillDone,
            dimmed && styles.reqPillDimmed,
            !req.completed && !dimmed && styles.reqPillPending,
          ]}
        >
          <Ionicons
            name={req.completed ? 'checkmark-circle' : 'ellipse-outline'}
            size={singleRow ? 12 : 14}
            color={req.completed ? Colors.primary : dimmed ? Colors.mutedLight : Colors.primaryLight}
          />
          <Text
            style={[
              styles.reqPillText,
              singleRow && styles.reqPillTextSingleRow,
              req.completed && styles.reqPillTextDone,
              !req.completed && !dimmed && styles.reqPillTextPending,
              dimmed && styles.reqPillTextDimmed,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {singleRow ? (REQ_COMPACT_LABELS[req.id] ?? req.label) : req.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TierRail({
  isComplete,
  isCurrent,
  isLocked,
  level,
  isLast,
}: {
  isComplete: boolean;
  isCurrent: boolean;
  isLocked: boolean;
  level: number;
  isLast?: boolean;
}) {
  return (
    <View style={styles.rail}>
      <View style={[
        styles.railDot,
        isComplete && styles.railDotDone,
        isCurrent && styles.railDotActive,
        isLocked && styles.railDotLocked,
      ]}>
        {isComplete ? (
          <Ionicons name="checkmark" size={13} color={Colors.white} />
        ) : isLocked ? (
          <Ionicons name="lock-closed" size={11} color={Colors.mutedLight} />
        ) : (
          <Text style={[styles.railDotNum, isCurrent && styles.railDotNumActive]}>{level}</Text>
        )}
      </View>
      {!isLast && (
        <View style={[styles.railLine, isComplete && styles.railLineDone]} />
      )}
    </View>
  );
}

function TierStep({
  tierKey,
  tier,
  currentTier,
  onAction,
  actionLabel,
  showVerified,
  disabled,
  isLast,
}: {
  tierKey: string;
  tier?: KycTierRequirement;
  currentTier: string;
  onAction?: () => void;
  actionLabel?: string;
  showVerified?: boolean;
  disabled?: boolean;
  isLast?: boolean;
}) {
  const meta = TIER_META[tierKey] ?? TIER_META.TIER_1;
  const level = Number(tierKey.replace('TIER_', ''));
  const currentIdx = tierIndex(currentTier);
  const isLocked = level > currentIdx + 1 && !showVerified;
  const isCurrent = !showVerified && !isLocked && !!actionLabel;
  const isComplete = !!showVerified;
  const stepRequirements = getTierStepRequirements(tierKey, tier?.requirements ?? []);
  const showLimits = hasMeaningfulLimits(tier?.limits);

  return (
    <View style={styles.stepRow}>
      <TierRail
        isComplete={isComplete}
        isCurrent={isCurrent}
        isLocked={isLocked}
        level={level}
        isLast={isLast}
      />

      <GlassCard
        variant={isComplete ? 'tinted' : 'light'}
        borderRadius={Radius.lg}
        padding={16}
        style={[
          styles.tierPanel,
          isComplete && styles.tierPanelDone,
          isCurrent && styles.tierPanelActive,
          isLocked && styles.tierPanelLocked,
        ]}
        contentStyle={styles.tierPanelContent}
      >
        {isCurrent && (
          <>
            <LinearGradient
              colors={['rgba(124, 58, 237, 0.07)', 'transparent']}
              style={styles.tierPanelGlow}
            />
            <View style={styles.tierPanelAccent} />
          </>
        )}

        <View style={styles.tierPanelHeader}>
          <View style={[
            styles.tierPanelIcon,
            { backgroundColor: isLocked ? '#F1F5F9' : meta.accentBg },
          ]}>
            <Ionicons
              name={meta.icon}
              size={22}
              color={isLocked ? Colors.mutedLight : meta.accent}
            />
          </View>
          <View style={styles.tierPanelHeaderText}>
            <View style={styles.tierPanelTitleRow}>
              <Text style={[styles.tierPanelTitle, isLocked && styles.tierPanelTitleLocked]}>
                {tier?.title ?? `Tier ${level}`}
              </Text>
              {isComplete && (
                <View style={styles.doneBadge}>
                  <Ionicons name="checkmark-circle" size={13} color={Colors.primary} />
                  <Text style={styles.doneBadgeText}>Verified</Text>
                </View>
              )}
              {isCurrent && (
                <View style={styles.nextBadge}>
                  <Text style={styles.nextBadgeText}>Current</Text>
                </View>
              )}
            </View>
            {tier?.description ? (
              <Text style={[styles.tierPanelDesc, isLocked && styles.tierPanelDescLocked]}>
                {tier.description}
              </Text>
            ) : null}
          </View>
        </View>

        {stepRequirements.length > 0 && (
          <View style={styles.reqSection}>
            <Text style={styles.reqSectionLabel}>Requirements</Text>
            <RequirementPills requirements={stepRequirements} dimmed={isLocked} />
          </View>
        )}

        {showLimits && tier?.limits && (
          <View style={styles.limitsSection}>
            <Text style={styles.reqSectionLabel}>Transaction limits</Text>
            <LimitRow limits={tier.limits} dimmed={isLocked} />
          </View>
        )}

        {isLocked && (
          <View style={styles.lockedHint}>
            <Ionicons name="lock-closed-outline" size={13} color={Colors.mutedLight} />
            <Text style={styles.lockedHintText}>Complete the previous tier to unlock</Text>
          </View>
        )}

        {isCurrent && actionLabel && onAction ? (
          <TouchableOpacity onPress={onAction} disabled={disabled} activeOpacity={0.88}>
            <LinearGradient
              colors={gradientStops([Gradients.button[0], Gradients.button[1]])}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.ctaBtn, disabled && styles.ctaBtnDisabled, Shadow.sm]}
            >
              <Text style={styles.ctaBtnText}>{actionLabel}</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        ) : null}
      </GlassCard>
    </View>
  );
}

const STEP_HEADER: Record<Step, string> = {
  status: 'Verify your identity to unlock limits',
  tier2: 'BVN verification',
  'phone-verify': 'Phone verification',
  'phone-otp': 'Enter verification code',
  tier3: 'Residential address',
};

function FormField({
  label,
  icon,
  counter,
  children,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  counter?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {counter ? <Text style={styles.fieldCounter}>{counter}</Text> : null}
      </View>
      <View style={styles.inputShell}>
        <View style={styles.inputIconWrap}>
          <Ionicons name={icon} size={18} color={Colors.primary} />
        </View>
        {children}
      </View>
    </View>
  );
}

function OtpInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.padEnd(6, ' ').split('').slice(0, 6);
  const activeIndex = Math.min(value.length, 5);

  return (
    <TouchableOpacity
      style={styles.otpWrap}
      onPress={() => inputRef.current?.focus()}
      activeOpacity={1}
    >
      <View style={styles.otpRow}>
        {digits.map((digit, i) => (
          <View
            key={i}
            style={[
              styles.otpBox,
              value.length === i && styles.otpBoxActive,
              digit.trim() && styles.otpBoxFilled,
            ]}
          >
            <Text style={styles.otpDigit}>{digit.trim()}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.otpHiddenInput}
        caretHidden
      />
      <Text style={styles.otpHint}>Tap to enter · digit {activeIndex + 1} of 6</Text>
    </TouchableOpacity>
  );
}

function FormShell({
  icon,
  title,
  subtitle,
  stepBadge,
  perks,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  stepBadge: string;
  perks?: string[];
  children: ReactNode;
}) {
  return (
    <View style={styles.formShell}>
      <View style={styles.formHero}>
        <LinearGradient
          colors={[Colors.heroDark, '#2E1065', '#4C1D95']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.formHeroGradient}
        >
          <View style={styles.formHeroBlob} />
          <View style={styles.formStepBadge}>
            <Text style={styles.formStepBadgeText}>{stepBadge}</Text>
          </View>
          <View style={styles.formHeroIconRing}>
            <LinearGradient colors={gradientStops([Gradients.button[0], Gradients.button[1]])} style={styles.formHeroIcon}>
              <Ionicons name={icon} size={22} color={Colors.white} />
            </LinearGradient>
          </View>
          <Text style={styles.formTitle}>{title}</Text>
          <Text style={styles.formSub} numberOfLines={2}>{subtitle}</Text>
          {perks && perks.length > 0 && (
            <View style={styles.formPerkChip}>
              <Ionicons name="checkmark-circle" size={11} color={Colors.primaryLight} />
              <Text style={styles.formPerkText} numberOfLines={1}>{perks.join(' · ')}</Text>
            </View>
          )}
        </LinearGradient>
      </View>

      <GlassCard borderRadius={Radius.xl} padding={20} contentStyle={styles.formBody}>{children}</GlassCard>

      <View style={styles.formTrust}>
        <Ionicons name="lock-closed" size={12} color={Colors.muted} />
        <Text style={styles.formTrustText}>256-bit encryption · NDPR compliant</Text>
      </View>
    </View>
  );
}

export default function KycScreen() {
  useStatusBarStyle('light');
  const insets = useSafeAreaInsets();
  const { updateUser } = useAuthStore();

  const [kycData, setKycData] = useState<KycStatusData | null>(() => peekKycStatusCache());
  const [loading, setLoading] = useState(() => !hasKycStatusCache());
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('status');

  const [bvn, setBvn] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('Nigeria');

  const currentTier = kycData?.currentTier ?? 'PENDING';
  const tiers = kycData?.tierRequirements ?? {};
  const progress = useMemo(() => tierProgress(currentTier), [currentTier]);
  const onOverview = step === 'status';

  const handleHeaderBack = useCallback(() => {
    if (step === 'status') {
      navigateBack();
      return;
    }
    if (step === 'phone-otp') {
      setStep('phone-verify');
      return;
    }
    setStep('status');
  }, [step]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'status') return false;
      handleHeaderBack();
      return true;
    });
    return () => sub.remove();
  }, [step, handleHeaderBack]);

  const applyKycData = useCallback((data: KycStatusData) => {
    setKycData(data);
    setKycStatusCache(data);
    if (data.user.address) setAddress(data.user.address);
    if (data.user.city) setCity(data.user.city);
    if (data.user.state) setState(data.user.state);
    if (data.user.country) setCountry(data.user.country);
    if (data.user.dateOfBirth) setDateOfBirth(data.user.dateOfBirth.slice(0, 10));
  }, []);

  const fetchStatus = useCallback(async (options?: { silent?: boolean; force?: boolean }) => {
    const cached = peekKycStatusCache();
    if (cached && !options?.force) {
      applyKycData(cached);
      setLoading(false);
    } else if (!options?.silent) {
      setLoading(true);
    }

    try {
      const data = options?.force
        ? await pullToRefreshKycStatus()
        : await getKycStatusData({ force: false });
      if (data) applyKycData(data);
    } catch {
      if (!cached) {
        showToast({ type: 'error', text1: 'Could not load KYC status' });
      }
    } finally {
      setLoading(false);
    }
  }, [applyKycData]);

  useFocusEffect(useCallback(() => {
    void fetchStatus({ silent: hasKycStatusCache() });
  }, [fetchStatus]));

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((v) => (v <= 1 ? 0 : v - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const syncUserKyc = (tier?: string) => {
    if (tier === 'TIER_3' || tier === 'TIER_2') {
      updateUser({ kycStatus: 'VERIFIED' });
    } else if (tier === 'TIER_1') {
      updateUser({ kycStatus: 'PENDING' });
    }
  };

  const handleInitiateTier1 = async () => {
    if (!kycData?.user.isPhoneVerified) {
      setStep('phone-verify');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.initiateKycTier1();
      if (isResponseSuccess(res)) {
        showToast({ type: 'success', text1: res.message || 'Tier 1 completed' });
        await fetchStatus({ silent: true, force: true });
        syncUserKyc('TIER_1');
      } else {
        showToast({ type: 'error', text1: res.message || 'Could not complete Tier 1' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: err?.message || 'Could not complete Tier 1' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    setSubmitting(true);
    try {
      const res = await api.initiatePhoneVerification();
      if (isResponseSuccess(res)) {
        showToast({ type: 'success', text1: 'OTP sent to your phone' });
        setStep('phone-otp');
        setResendCooldown(60);
      } else {
        showToast({ type: 'error', text1: res.message || 'Could not send OTP' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: err?.message || 'Could not send OTP' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (phoneOtp.length !== 6) {
      showToast({ type: 'error', text1: 'Enter the 6-digit OTP' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.verifyPhoneOtp(phoneOtp);
      if (isResponseSuccess(res)) {
        const tierRes = await api.initiateKycTier1();
        showToast({
          type: 'success',
          text1: isResponseSuccess(tierRes) ? 'Tier 1 completed' : 'Phone verified',
        });
        setPhoneOtp('');
        syncUserKyc('TIER_1');
        setStep('status');
        await fetchStatus({ silent: true, force: true });
      } else {
        showToast({ type: 'error', text1: res.message || 'Invalid OTP' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: err?.message || 'Invalid OTP' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setSubmitting(true);
    try {
      const res = await api.resendPhoneVerificationOtp();
      if (isResponseSuccess(res)) {
        showToast({ type: 'success', text1: 'OTP resent' });
        setResendCooldown(60);
      } else {
        showToast({ type: 'error', text1: res.message || 'Could not resend OTP' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: err?.message || 'Could not resend OTP' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyBvn = async () => {
    if (bvn.length !== 11) {
      showToast({ type: 'error', text1: 'Enter a valid 11-digit BVN' });
      return;
    }
    if (!dateOfBirth) {
      showToast({ type: 'error', text1: 'Date of birth is required' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      showToast({ type: 'error', text1: 'Use a valid date (YYYY-MM-DD)' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.verifyBvn(bvn, dateOfBirth);
      if (isResponseSuccess(res)) {
        showToast({ type: 'success', text1: 'BVN verified successfully' });
        updateUser({ kycStatus: 'VERIFIED' });
        setStep('status');
        await fetchStatus({ silent: true, force: true });
      } else {
        showToast({ type: 'error', text1: res.message || 'BVN verification failed' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: err?.message || 'BVN verification failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!address.trim() || !city.trim() || !state.trim()) {
      showToast({ type: 'error', text1: 'Complete your address details' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.updateKycAddress({ address, city, state, country });
      if (isResponseSuccess(res)) {
        showToast({
          type: 'success',
          text1: 'Address saved',
          text2: 'Upload ID documents on the web app to finish Tier 3.',
        });
        setStep('status');
        await fetchStatus({ silent: true, force: true });
      } else {
        showToast({ type: 'error', text1: res.message || 'Could not save address' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: err?.message || 'Could not save address' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderPrimaryBtn = (label: string, onPress: () => void, disabled?: boolean) => (
    <TouchableOpacity onPress={onPress} disabled={disabled || submitting} activeOpacity={0.88}>
      <LinearGradient
        colors={gradientStops([Gradients.button[0], Gradients.button[1]])}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.primaryBtn, (disabled || submitting) && styles.primaryBtnDisabled, Shadow.sm]}
      >
        {submitting ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Text style={styles.primaryBtnText}>{label}</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderStepContent = () => {
    if (step === 'tier2') {
      return (
        <FormShell
          icon="finger-print-outline"
          title="BVN verification"
          subtitle="Verify with your BVN and date of birth."
          stepBadge="Tier 2 · BVN"
          perks={['Permanent VA', 'Higher limits']}
        >
          <FormField label="BVN" icon="card-outline" counter={`${bvn.length}/11`}>
            <TextInput
              style={styles.inputField}
              placeholder="Enter 11-digit BVN"
              placeholderTextColor={Colors.mutedLight}
              value={bvn}
              onChangeText={(v) => setBvn(v.replace(/\D/g, '').slice(0, 11))}
              keyboardType="number-pad"
              maxLength={11}
            />
          </FormField>
          <FormField label="Date of birth" icon="calendar-outline">
            <DateOfBirthField value={dateOfBirth} onChange={setDateOfBirth} />
          </FormField>
          <View style={styles.secureNote}>
            <View style={styles.secureNoteIcon}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.secureNoteText}>
              Your BVN is encrypted end-to-end and never shared with third parties.
            </Text>
          </View>
          {renderPrimaryBtn('Verify BVN', handleVerifyBvn, bvn.length !== 11 || !dateOfBirth)}
        </FormShell>
      );
    }

    if (step === 'phone-verify' && kycData) {
      return (
        <FormShell
          icon="phone-portrait-outline"
          title="Verify your phone"
          subtitle="We'll send a one-time SMS code."
          stepBadge="Tier 1 · Phone"
          perks={['Unlocks Tier 1']}
        >
          <View style={styles.phoneCard}>
            <View style={styles.phoneCardIcon}>
              <Ionicons name="call-outline" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.phoneLabel}>Registered number</Text>
            <Text style={styles.phoneValue}>{kycData.user.phone}</Text>
            <Text style={styles.phoneHint}>Standard SMS rates may apply</Text>
          </View>
          {renderPrimaryBtn('Send verification code', handleSendPhoneOtp)}
        </FormShell>
      );
    }

    if (step === 'phone-otp') {
      return (
        <FormShell
          icon="keypad-outline"
          title="Enter code"
          subtitle="6-digit code from your SMS."
          stepBadge="Tier 1 · OTP"
        >
          <OtpInput value={phoneOtp} onChange={setPhoneOtp} />
          <TouchableOpacity
            style={styles.resendBtn}
            onPress={handleResendOtp}
            disabled={resendCooldown > 0 || submitting}
          >
            <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextMuted]}>
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Didn\'t receive it? Resend code'}
            </Text>
          </TouchableOpacity>
          {renderPrimaryBtn('Verify & complete Tier 1', handleVerifyPhoneOtp, phoneOtp.length !== 6)}
        </FormShell>
      );
    }

    if (step === 'tier3') {
      return (
        <FormShell
          icon="location-outline"
          title="Residential address"
          subtitle="Your home address for Tier 3."
          stepBadge="Tier 3 · Address"
          perks={['ID & selfie on web app']}
        >
          <FormField label="Street address" icon="home-outline">
            <TextInput
              style={styles.inputField}
              value={address}
              onChangeText={setAddress}
              placeholder="House no, street"
              placeholderTextColor={Colors.mutedLight}
            />
          </FormField>
          <FormField label="City" icon="business-outline">
            <TextInput
              style={styles.inputField}
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor={Colors.mutedLight}
            />
          </FormField>
          <FormField label="State" icon="map-outline">
            <TextInput
              style={styles.inputField}
              value={state}
              onChangeText={setState}
              placeholder="State"
              placeholderTextColor={Colors.mutedLight}
            />
          </FormField>
          {renderPrimaryBtn('Save address', handleSaveAddress)}
        </FormShell>
      );
    }

    const bvnDone = hasBvnVerified(kycData);

    return (
      <View style={styles.overview}>
        {bvnDone && (
          <GlassCard borderRadius={Radius.lg} padding={14} variant="tinted" contentStyle={styles.perkBanner}>
            <View style={styles.perkIcon}>
              <Ionicons name="wallet" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.perkTitle}>Permanent accounts unlocked</Text>
              <Text style={styles.perkSub}>You can now generate a dedicated virtual account</Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
          </GlassCard>
        )}

        <Text style={styles.pathLabel}>Your verification path</Text>

        <TierStep
          tierKey="TIER_1"
          tier={tiers.TIER_1}
          currentTier={currentTier}
          onAction={currentTier === 'PENDING' ? handleInitiateTier1 : undefined}
          actionLabel={currentTier === 'PENDING' ? (kycData?.user.isPhoneVerified ? 'Complete Tier 1' : 'Verify phone') : undefined}
          showVerified={['TIER_1', 'TIER_2', 'TIER_3'].includes(currentTier)}
          disabled={submitting}
        />

        <TierStep
          tierKey="TIER_2"
          tier={tiers.TIER_2}
          currentTier={currentTier}
          onAction={currentTier === 'TIER_1' ? () => setStep('tier2') : undefined}
          actionLabel={currentTier === 'TIER_1' ? 'Verify BVN' : undefined}
          showVerified={['TIER_2', 'TIER_3'].includes(currentTier)}
        />

        <TierStep
          tierKey="TIER_3"
          tier={tiers.TIER_3}
          currentTier={currentTier}
          onAction={currentTier === 'TIER_2' ? () => setStep('tier3') : undefined}
          actionLabel={currentTier === 'TIER_2' ? 'Start Tier 3' : undefined}
          showVerified={currentTier === 'TIER_3'}
          isLast
        />

        <View style={styles.trustFooter}>
          <Ionicons name="lock-closed" size={13} color={Colors.muted} />
          <Text style={styles.trustFooterText}>256-bit encryption · NDPR compliant</Text>
        </View>
      </View>
    );
  };

  return (
    <ThemedScreen>
      <LinearGradient
        colors={[Colors.heroDark, '#2E1065', '#4C1D95']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerBlob} />

        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={handleHeaderBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>KYC Verification</Text>
            <Text style={styles.headerSub}>{STEP_HEADER[step]}</Text>
          </View>
        </View>

        {onOverview && !loading && (
          <View style={styles.headerProgress}>
            <View style={styles.headerProgressTop}>
              <View style={styles.headerTierPill}>
                <Ionicons name="shield-checkmark" size={14} color="#E9D5FF" />
                <Text style={styles.headerTierText}>{getKycTierLabel(currentTier)}</Text>
              </View>
              <Text style={styles.headerPct}>{progress}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={gradientStops([Colors.primaryLight, Colors.primary])}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progress}%` }]}
              />
            </View>
          </View>
        )}
      </LinearGradient>

      <View style={styles.contentCurve} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>Loading verification status…</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderStepContent()}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contentCurve: {
    height: 20,
    marginTop: -20,
    backgroundColor: Colors.pageBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  header: {
    paddingHorizontal: Spacing.page,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  headerBlob: {
    position: 'absolute',
    top: -30,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  headerProgress: { marginTop: 20, gap: 10 },
  headerProgressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  headerTierText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  headerPct: { fontSize: 22, fontWeight: '800', color: Colors.white },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: Colors.muted },
  scroll: { paddingHorizontal: Spacing.page, paddingTop: 4 },

  overview: { gap: 4 },
  perkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  perkIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FAF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  perkTitle: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  perkSub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  pathLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 2,
  },

  stepRow: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  rail: { width: 28, alignItems: 'center' },
  railDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  railDotDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  railDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  railDotLocked: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
  railDotNum: { fontSize: 11, fontWeight: '800', color: Colors.muted },
  railDotNumActive: { color: Colors.white },
  railLine: {
    flex: 1,
    width: 2.5,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
    minHeight: 24,
    borderRadius: 2,
  },
  railLineDone: { backgroundColor: Colors.primaryLight },

  tierPanel: {
    flex: 1,
    overflow: 'hidden',
  },
  tierPanelContent: {
    gap: 12,
    overflow: 'hidden',
  },
  tierPanelDone: {},
  tierPanelActive: {},
  tierPanelLocked: {
    opacity: 0.88,
  },
  tierPanelGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.lg,
  },
  tierPanelAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.primary,
  },
  tierPanelHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  tierPanelIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierPanelHeaderText: { flex: 1, gap: 4 },
  tierPanelTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  tierPanelTitle: { fontSize: 16, fontWeight: '800', color: Colors.dark, letterSpacing: -0.2 },
  tierPanelTitleLocked: { color: Colors.muted },
  tierPanelDesc: { fontSize: 13, color: Colors.muted, lineHeight: 18 },
  tierPanelDescLocked: { color: Colors.mutedLight },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
  },
  doneBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  nextBadge: {
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.18)',
  },
  nextBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary },

  reqSection: { gap: 8, alignItems: 'center' },
  reqSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  reqPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  reqPillsSingleRow: {
    flexWrap: 'nowrap',
    gap: 5,
  },
  reqPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    maxWidth: '100%',
  },
  reqPillSingleRow: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 4,
  },
  reqPillDone: {
    backgroundColor: Colors.primaryMuted,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  reqPillPending: {
    backgroundColor: Colors.primaryMuted,
    borderColor: 'rgba(124, 58, 237, 0.14)',
  },
  reqPillDimmed: {
    backgroundColor: '#F1F5F9',
    borderColor: 'transparent',
  },
  reqPillText: { fontSize: 11, fontWeight: '600', color: Colors.mid, flexShrink: 1 },
  reqPillTextSingleRow: { fontSize: 10, textAlign: 'center' },
  reqPillTextDone: { color: Colors.primary },
  reqPillTextPending: { color: Colors.primaryDeep },
  reqPillTextDimmed: { color: Colors.mutedLight },

  lockedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  lockedHintText: { fontSize: 12, color: Colors.mutedLight, fontWeight: '500' },

  limitsSection: { gap: 8, alignItems: 'center' },
  limitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  limitsRowDimmed: {
    backgroundColor: '#F1F5F9',
    borderColor: 'transparent',
  },
  limitItem: { flex: 1, alignItems: 'center', gap: 2 },
  limitLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  limitValue: { fontSize: 12, fontWeight: '800', color: Colors.heroDark },
  limitValueDimmed: { color: Colors.mutedLight },
  limitDivider: { width: 1, height: 28, backgroundColor: 'rgba(124, 58, 237, 0.12)' },
  limitDividerDimmed: { backgroundColor: '#E2E8F0' },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: Radius.lg,
  },
  ctaBtnDisabled: { opacity: 0.45 },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },

  formShell: { gap: 0 },
  formHero: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: 12,
    ...Shadow.card,
  },
  formHeroGradient: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  formHeroBlob: {
    position: 'absolute',
    top: -24,
    right: -16,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  formStepBadge: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  formStepBadgeText: { fontSize: 10, fontWeight: '700', color: '#E9D5FF', letterSpacing: 0.3 },
  formHeroIconRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  formHeroIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  formSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  formPerkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    maxWidth: '100%',
  },
  formPerkText: { fontSize: 10, fontWeight: '600', color: '#EDE9FE', flexShrink: 1 },
  formBody: {
    gap: 14,
  },
  formTrust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
  },
  formTrustText: { fontSize: 11, color: Colors.muted },
  fieldWrap: { gap: 8 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  fieldCounter: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFE',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.14)',
    overflow: 'hidden',
  },
  inputIconWrap: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(124, 58, 237, 0.1)',
    alignSelf: 'stretch',
    paddingVertical: 14,
  },
  inputField: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.dark,
    fontWeight: '500',
  },
  otpWrap: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  otpBox: {
    width: 46,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.18)',
    backgroundColor: '#FAFAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FAF5FF',
    borderWidth: 2,
  },
  otpBoxFilled: { backgroundColor: '#F5F3FF' },
  otpDigit: { fontSize: 22, fontWeight: '800', color: Colors.heroDark },
  otpHiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  otpHint: { fontSize: 12, color: Colors.mutedLight, fontWeight: '500' },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FAF5FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
  },
  secureNoteIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secureNoteText: { fontSize: 12, color: Colors.muted, flex: 1, lineHeight: 18 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  phoneCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  phoneCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
  },
  phoneLabel: { fontSize: 11, color: Colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  phoneValue: { fontSize: 26, fontWeight: '800', color: Colors.heroDark, letterSpacing: 0.5 },
  phoneHint: { fontSize: 12, color: Colors.mutedLight, marginTop: 2 },
  resendBtn: { alignSelf: 'center', paddingVertical: 6 },
  resendText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  resendTextMuted: { color: Colors.mutedLight },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
  },
  trustFooterText: { fontSize: 12, color: Colors.muted },
});
