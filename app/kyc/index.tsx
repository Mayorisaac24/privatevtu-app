import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, BackHandler, RefreshControl,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState, memo, type ReactNode } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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
import { useKeyboardInsets } from '../../src/hooks/useKeyboardInsets';
import {Colors, Radius, Shadow, Spacing, Gradients , Palette, FormColors, BRAND, Overlays, useColors, useThemedStyles } from '../../src/theme';
import { showToast } from '../../src/components/ui/Toast';
import { navigateBack } from '../../src/lib/navigation';
import { hiddenNumericInputStyle } from '../../src/lib/platform-ui';
import {
  getKycStatusData,
  hasKycStatusCache,
  peekKycStatusCache,
  pullToRefreshKycStatus,
  setKycStatusCache,
  subscribeKycStatusInvalidation,
} from '../../src/lib/kyc-status-cache';
import { DateOfBirthField } from '../../src/components/DateOfBirthField';
import { ThemedScreen } from '../../src/components/ui/ThemedScreen';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { useGradients } from '../../src/theme/hooks';
import { gradientStops } from '../../src/theme/gradient-utils';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { LocationPickerModal } from '../../src/components/LocationPickerModal';
import { FaceLivenessScannerGate } from '../../src/components/FaceLivenessScannerGate';
import type { FaceLivenessResult, LivenessSessionResponse } from '../../src/lib/face-liveness-types';
import {
  formatStateLabel,
  getCitiesForState,
  getNigeriaLocationsCached,
  peekNigeriaLocations,
  POPULAR_NIGERIA_STATES,
  preloadNigeriaLocations,
  type NigeriaLocationsSnapshot,
} from '../../src/lib/nigeria-locations-cache';

import {
  enrichKycStatusData,
  formatKycDocumentStatus,
  getKycDocumentStatusStyle,
  getTier3ActionLabel,
  getTier3DocumentSummary,
  getTier3SubmissionHeadline,
  hasSavedKycAddress,
  isKycDocumentLocked,
  isTier3AwaitingReview,
  isTier3SubmissionActive,
  kycDocumentNeedsUpload,
  KYC_ID_TYPE_LABELS,
  KYC_ID_TYPES,
  KYC_ID_TYPE_VALUES,
} from '../../src/lib/kyc-status-utils';

type Step = 'status' | 'tier2' | 'phone-verify' | 'phone-otp' | 'tier3' | 'tier3-docs';

const MAX_KYC_IMAGE_BYTES = 5 * 1024 * 1024;

function docReviewStatusStyle(status?: string) {
  const styles = useStyles();

  const tone = getKycDocumentStatusStyle(status);
  if (tone === 'approved') return styles.docReviewStatusApproved;
  if (tone === 'rejected') return styles.docReviewStatusRejected;
  if (tone === 'pending') return styles.docReviewStatusPending;
  return styles.docReviewStatusMuted;
}

function getTierMeta(colors: import('../../src/theme/types').ThemeColors, tier: string) {
  const base = {
    TIER_1: { icon: 'phone-portrait-outline' as const },
    TIER_2: { icon: 'finger-print-outline' as const },
    TIER_3: { icon: 'shield-checkmark-outline' as const },
  }[tier] ?? { icon: 'shield-outline' as const };
  return {
    ...base,
    accent: colors.primary,
    accentBg: colors.primaryMuted,
  };
}

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
  TIER_3: ['address', 'proof_of_address', 'id', 'selfie'],
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
  const styles = useStyles();

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

const MemoLimitRow = memo(LimitRow);

const REQ_COMPACT_LABELS: Record<string, string> = {
  id: 'Gov ID',
  proof_of_address: 'Address proof',
  selfie: 'Face scan',
};

function RequirementPills({
  requirements,
  dimmed,
}: {
  requirements: Array<{ id: string; label: string; completed: boolean }>;
  dimmed?: boolean;
}) {
  const styles = useStyles();
  const colors = useColors();

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
            color={req.completed ? colors.primaryLight : dimmed ? colors.mid : colors.primaryLight}
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

const MemoRequirementPills = memo(RequirementPills);

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
  const styles = useStyles();

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

const MemoTierRail = memo(TierRail);

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
  const styles = useStyles();
  const colors = useColors();
  const meta = getTierMeta(colors, tierKey);
  const level = Number(tierKey.replace('TIER_', ''));
  const currentIdx = tierIndex(currentTier);
  const isLocked = level > currentIdx + 1 && !showVerified;
  const isCurrent = !showVerified && !isLocked && !!actionLabel;
  const isComplete = !!showVerified;
  const stepRequirements = getTierStepRequirements(tierKey, tier?.requirements ?? []);
  const showLimits = hasMeaningfulLimits(tier?.limits);

  return (
    <View style={styles.stepRow}>
      <MemoTierRail
        isComplete={isComplete}
        isCurrent={isCurrent}
        isLocked={isLocked}
        level={level}
        isLast={isLast}
      />

      <GlassCard
        variant="solid"
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
        {isCurrent ? <View style={styles.tierPanelAccent} /> : null}

        <View style={styles.tierPanelHeader}>
          <View style={[
            styles.tierPanelIcon,
            { backgroundColor: isLocked ? colors.surfaceAlt : meta.accentBg },
          ]}>
            <Ionicons
              name={meta.icon}
              size={22}
              color={isLocked ? colors.mid : meta.accent}
            />
          </View>
          <View style={styles.tierPanelHeaderText}>
            <View style={styles.tierPanelTitleRow}>
              <Text style={[styles.tierPanelTitle, isLocked && styles.tierPanelTitleLocked]}>
                {tier?.title ?? `Tier ${level}`}
              </Text>
              {isComplete && (
                <View style={styles.doneBadge}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.primaryLight} />
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
            <MemoRequirementPills requirements={stepRequirements} dimmed={isLocked} />
          </View>
        )}

        {showLimits && tier?.limits && (
          <View style={styles.limitsSection}>
            <Text style={styles.reqSectionLabel}>Transaction limits</Text>
            <MemoLimitRow limits={tier.limits} dimmed={isLocked} />
          </View>
        )}

        {isLocked && (
          <View style={styles.lockedHint}>
            <Ionicons name="lock-closed-outline" size={13} color={colors.mid} />
            <Text style={styles.lockedHintText}>Complete the previous tier to unlock</Text>
          </View>
        )}

        {isCurrent && actionLabel && onAction ? (
          <GradientButton
            title={actionLabel}
            onPress={onAction}
            disabled={disabled}
            inactive={disabled}
            size="compact"
            rightIcon={<Ionicons name="arrow-forward" size={17} color={Colors.white} />}
          />
        ) : null}
      </GlassCard>
    </View>
  );
}

const MemoTierStep = memo(TierStep);

const STEP_HEADER: Record<Step, string> = {
  status: 'Verify your identity to unlock limits',
  tier2: 'BVN verification',
  'phone-verify': 'Phone verification',
  'phone-otp': 'Enter verification code',
  tier3: 'Residential address',
  'tier3-docs': 'Identity documents',
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
  const styles = useStyles();

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

function FormSelectField({
  label,
  icon,
  value,
  placeholder,
  disabled,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  placeholder: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <FormField label={label} icon={icon}>
      <TouchableOpacity
        style={[styles.selectTrigger, disabled && styles.selectTriggerDisabled]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.75}
      >
        <Text style={[styles.selectText, !value && styles.selectPlaceholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.mutedLight} />
      </TouchableOpacity>
    </FormField>
  );
}

function KycUploadTile({
  label,
  hint,
  imageUrl,
  uploading,
  statusLabel,
  onCamera,
  onGallery,
  onClear,
}: {
  label: string;
  hint: string;
  imageUrl: string;
  uploading: boolean;
  statusLabel?: string;
  onCamera: () => void;
  onGallery?: () => void;
  onClear: () => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.uploadWrap}>
      <View style={styles.uploadLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {statusLabel ? (
          <View style={styles.uploadStatusPill}>
            <Text style={styles.uploadStatusText}>{statusLabel}</Text>
          </View>
        ) : null}
      </View>
      {imageUrl ? (
        <View style={styles.uploadPreviewWrap}>
          <Image source={{ uri: imageUrl }} style={styles.uploadPreview} contentFit="cover" />
          <TouchableOpacity style={styles.uploadClearBtn} onPress={onClear} activeOpacity={0.85}>
            <Ionicons name="close" size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.uploadDropzone}>
          {uploading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <>
              <View style={styles.uploadDropIcon}>
                <Ionicons name="cloud-upload-outline" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.uploadDropTitle}>{hint}</Text>
              <Text style={styles.uploadDropSub}>PNG or JPG, up to 5MB</Text>
              <View style={styles.uploadActionRow}>
                <TouchableOpacity style={styles.uploadActionBtn} onPress={onCamera} activeOpacity={0.85}>
                  <Ionicons name="camera-outline" size={16} color={Colors.primary} />
                  <Text style={styles.uploadActionText}>{onGallery ? 'Camera' : 'Take photo'}</Text>
                </TouchableOpacity>
                {onGallery ? (
                  <TouchableOpacity style={styles.uploadActionBtn} onPress={onGallery} activeOpacity={0.85}>
                    <Ionicons name="images-outline" size={16} color={Colors.primary} />
                    <Text style={styles.uploadActionText}>Gallery</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

function Tier3Progress({ currentStep }: { currentStep: 'address' | 'documents' }) {
  const styles = useStyles();

  const stepIndex = currentStep === 'address' ? 0 : 1;

  return (
    <View style={styles.tier3Progress}>
      <View style={styles.tier3ProgressTrack}>
        <View style={[styles.tier3ProgressFill, { width: stepIndex === 0 ? '50%' : '100%' }]} />
      </View>
      <View style={styles.tier3ProgressLabels}>
        <Text style={[styles.tier3ProgressLabel, stepIndex >= 0 && styles.tier3ProgressLabelActive]}>
          1 · Address
        </Text>
        <Text style={[styles.tier3ProgressLabel, stepIndex >= 1 && styles.tier3ProgressLabelActive]}>
          2 · Documents
        </Text>
      </View>
    </View>
  );
}

function DocStatusBanner({
  title,
  subtitle,
  tone,
}: {
  title: string;
  subtitle: string;
  tone: 'pending' | 'rejected';
}) {
  const styles = useStyles();

  return (
    <View style={[styles.docStatusBanner, tone === 'rejected' ? styles.docStatusBannerRejected : styles.docStatusBannerPending]}>
      <Ionicons
        name={tone === 'rejected' ? 'alert-circle' : 'time-outline'}
        size={18}
        color={tone === 'rejected' ? Colors.error : Colors.warning}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.docStatusTitle}>{title}</Text>
        <Text style={styles.docStatusSub}>{subtitle}</Text>
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
  const styles = useStyles();
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
        pointerEvents="none"
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
  const styles = useStyles();
  const colors = useColors();
  const gradients = useGradients();

  return (
    <View style={styles.formShell}>
      <View style={styles.formHero}>
        <LinearGradient
          colors={gradientStops(gradients.heroAuth)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.formHeroGradient}
        >
          <View style={styles.formHeroBlob} />
          <View style={styles.formStepBadge}>
            <Text style={styles.formStepBadgeText}>{stepBadge}</Text>
          </View>
          <View style={styles.formHeroIconRing}>
            <LinearGradient colors={gradientStops([gradients.button[0], gradients.button[1]])} style={styles.formHeroIcon}>
              <Ionicons name={icon} size={22} color={colors.white} />
            </LinearGradient>
          </View>
          <Text style={styles.formTitle}>{title}</Text>
          <Text style={styles.formSub} numberOfLines={2}>{subtitle}</Text>
          {perks && perks.length > 0 && (
            <View style={styles.formPerkChip}>
              <Ionicons name="checkmark-circle" size={11} color={colors.primaryLight} />
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
  const styles = useStyles();
  const colors = useColors();
  const gradients = useGradients();

  useStatusBarStyle('light');
  const insets = useSafeAreaInsets();
  const { keyboardVisible, keyboardHeight } = useKeyboardInsets();
  const { updateUser } = useAuthStore();

  const [kycData, setKycData] = useState<KycStatusData | null>(() => {
    const cached = peekKycStatusCache();
    return cached ? enrichKycStatusData(cached) : null;
  });
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
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showDocTypePicker, setShowDocTypePicker] = useState(false);
  const [locationsSnapshot, setLocationsSnapshot] = useState<NigeriaLocationsSnapshot | null>(
    () => peekNigeriaLocations(),
  );
  const [locationsLoading, setLocationsLoading] = useState(() => !peekNigeriaLocations());

  const [documentType, setDocumentType] = useState<string>(KYC_ID_TYPES[0].value);
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [proofOfAddressUrl, setProofOfAddressUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');
  const [selfieLivenessMeta, setSelfieLivenessMeta] = useState<FaceLivenessResult['metadata'] | null>(null);
  const [livenessSession, setLivenessSession] = useState<LivenessSessionResponse | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [startingFaceScan, setStartingFaceScan] = useState(false);
  const [showFaceScan, setShowFaceScan] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    if (step === 'tier3-docs') {
      setStep(hasSavedKycAddress(kycData) ? 'status' : 'tier3');
      return;
    }
    setStep('status');
  }, [step, kycData]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'status') return false;
      handleHeaderBack();
      return true;
    });
    return () => sub.remove();
  }, [step, handleHeaderBack]);

  useEffect(() => {
    preloadNigeriaLocations();
    let cancelled = false;
    if (!peekNigeriaLocations()) {
      setLocationsLoading(true);
    }
    void getNigeriaLocationsCached()
      .then((snapshot) => {
        if (!cancelled) {
          setLocationsSnapshot(snapshot);
          setLocationsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLocationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cityOptions = useMemo(
    () => {
      const options = getCitiesForState(state, locationsSnapshot);
      if (city && !options.includes(city)) return [city, ...options];
      return options;
    },
    [city, locationsSnapshot, state],
  );

  const stateOptions = useMemo(() => {
    const options = locationsSnapshot?.states ?? [];
    if (state && !options.includes(state)) return [state, ...options];
    return options;
  }, [locationsSnapshot?.states, state]);

  const tier3DocSummary = useMemo(
    () => getTier3DocumentSummary(kycData),
    [kycData],
  );

  const applyKycData = useCallback((data: KycStatusData) => {
    const enriched = enrichKycStatusData(data);
    setKycData(enriched);
    setKycStatusCache(enriched);
    if (enriched.user.address) setAddress(enriched.user.address);
    if (enriched.user.city) setCity(enriched.user.city);
    if (enriched.user.state) setState(enriched.user.state);
    if (enriched.user.country) setCountry(enriched.user.country);
    if (enriched.user.dateOfBirth) setDateOfBirth(enriched.user.dateOfBirth.slice(0, 10));
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchStatus({ silent: true, force: true });
    } finally {
      setRefreshing(false);
    }
  }, [fetchStatus]);

  useFocusEffect(useCallback(() => {
    void fetchStatus({ silent: hasKycStatusCache(), force: true });
  }, [fetchStatus]));

  useEffect(() => {
    return subscribeKycStatusInvalidation((data) => {
      if (data) applyKycData(data);
    });
  }, [applyKycData]);

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

  const startTier3 = useCallback(() => {
    setStep(hasSavedKycAddress(kycData) ? 'tier3-docs' : 'tier3');
  }, [kycData]);

  const uploadKycImage = useCallback(async (asset: ImagePicker.ImagePickerAsset, folder: string) => {
    if (asset.fileSize && asset.fileSize > MAX_KYC_IMAGE_BYTES) {
      throw new Error('Image must be 5MB or smaller');
    }
    if (!asset.base64) {
      throw new Error('Could not read the selected image');
    }
    const mime = asset.mimeType || 'image/jpeg';
    const dataUri = `data:${mime};base64,${asset.base64}`;
    const uploadRes = await api.uploadDocument(dataUri, folder);
    if (!isResponseSuccess(uploadRes) || !uploadRes.data?.url) {
      throw new Error(uploadRes.message || 'Upload failed');
    }
    return uploadRes.data.url;
  }, []);

  const captureKycImage = useCallback(async (
    kind: 'document' | 'proof_of_address',
    source: 'camera' | 'library',
  ) => {
    const setUploading = kind === 'proof_of_address' ? setUploadingProof : setUploadingDocument;
    const setUrl = kind === 'proof_of_address' ? setProofOfAddressUrl : setDocumentUrl;
    const folder = kind === 'proof_of_address' ? 'kyc-proof-of-address' : 'kyc-documents';

    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({
        type: 'error',
        text1: source === 'camera' ? 'Camera access needed' : 'Photo access needed',
      });
      return;
    }

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
      base64: true,
    };

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const url = await uploadKycImage(result.assets[0], folder);
      setUrl(url);
      showToast({
        type: 'success',
        text1: kind === 'proof_of_address' ? 'Proof of address added' : 'Document added',
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        text1: err?.message || (kind === 'proof_of_address' ? 'Could not add proof of address' : 'Could not add document'),
      });
    } finally {
      setUploading(false);
    }
  }, [uploadKycImage]);

  const handleStartFaceScan = useCallback(async () => {
    setStartingFaceScan(true);
    try {
      if (
        livenessSession
        && new Date(livenessSession.expiresAt).getTime() > Date.now()
      ) {
        setShowFaceScan(true);
        return;
      }

      const sessionRes = await api.createLivenessSession();
      if (!isResponseSuccess(sessionRes) || !sessionRes.data) {
        throw new Error(sessionRes.message || 'Could not start live face scan');
      }
      setLivenessSession({
        sessionId: sessionRes.data.sessionId,
        spokenPhrase: sessionRes.data.spokenPhrase,
        flowType: sessionRes.data.flowType,
        expiresAt: sessionRes.data.expiresAt,
        expiresInSeconds: sessionRes.data.expiresInSeconds,
      });
      setShowFaceScan(true);
    } catch (err: unknown) {
      showToast({
        type: 'error',
        text1: err instanceof Error ? err.message : 'Could not start live face scan',
      });
    } finally {
      setStartingFaceScan(false);
    }
  }, [livenessSession]);

  const handleFaceScanComplete = useCallback(async (result: FaceLivenessResult) => {
    setUploadingSelfie(true);
    try {
      const uploadRes = await api.uploadDocument(result.dataUri, 'kyc-selfies');
      if (!isResponseSuccess(uploadRes) || !uploadRes.data?.url) {
        throw new Error(uploadRes.message || 'Upload failed');
      }
      setSelfieUrl(uploadRes.data.url);
      setSelfieLivenessMeta(result.metadata);
      setLivenessSession(null);
      showToast({ type: 'success', text1: 'Live face scan captured' });
    } catch (err: any) {
      showToast({ type: 'error', text1: err?.message || 'Could not save face scan' });
    } finally {
      setUploadingSelfie(false);
    }
  }, []);

  const handleSaveAddress = async () => {
    if (!state.trim()) {
      showToast({ type: 'error', text1: 'Select your state' });
      return;
    }
    if (!city.trim()) {
      showToast({ type: 'error', text1: 'Select your city' });
      return;
    }
    if (!address.trim()) {
      showToast({ type: 'error', text1: 'Enter your street address' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.updateKycAddress({ address, city, state, country });
      if (isResponseSuccess(res)) {
        showToast({
          type: 'success',
          text1: 'Address saved',
          text2: 'Next, upload your documents and complete the live face scan.',
        });
        await fetchStatus({ silent: true, force: true });
        setStep('tier3-docs');
      } else {
        showToast({ type: 'error', text1: res.message || 'Could not save address' });
      }
    } catch (err: any) {
      showToast({ type: 'error', text1: err?.message || 'Could not save address' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitDocuments = async () => {
    if (isTier3AwaitingReview(tier3DocSummary)) {
      showToast({ type: 'error', text1: 'Your documents are already under review' });
      return;
    }

    const needsId = kycDocumentNeedsUpload(tier3DocSummary.idDoc?.status);
    const needsProof = kycDocumentNeedsUpload(tier3DocSummary.proofDoc?.status);
    const needsSelfie = kycDocumentNeedsUpload(tier3DocSummary.selfieDoc?.status);

    if (needsId && !documentUrl) {
      showToast({ type: 'error', text1: 'Upload your government ID' });
      return;
    }
    if (needsProof && !proofOfAddressUrl) {
      showToast({ type: 'error', text1: 'Upload proof of address' });
      return;
    }
    if (needsId && !documentNumber.trim()) {
      showToast({ type: 'error', text1: 'Document number is required' });
      return;
    }
    if (needsSelfie && (!selfieUrl || !selfieLivenessMeta)) {
      showToast({ type: 'error', text1: 'Complete the live face scan' });
      return;
    }
    setSubmitting(true);
    try {
      if (needsId) {
        const idRes = await api.submitKycDocument({
          documentType,
          documentUrl,
          documentNumber: documentNumber.trim(),
        });
        if (!isResponseSuccess(idRes)) {
          throw new Error(idRes.message || 'Could not submit ID document');
        }
      }

      if (needsProof) {
        const proofRes = await api.submitKycDocument({
          documentType: 'PROOF_OF_ADDRESS',
          documentUrl: proofOfAddressUrl,
        });
        if (!isResponseSuccess(proofRes)) {
          throw new Error(proofRes.message || 'Could not submit proof of address');
        }
      }

      if (needsSelfie) {
        if (!selfieUrl || !selfieLivenessMeta) {
          throw new Error('Complete the live face scan');
        }
        const selfieRes = await api.submitKycDocument({
          documentType: 'SELFIE',
          documentUrl: selfieUrl,
          metadata: selfieLivenessMeta,
        });
        if (!isResponseSuccess(selfieRes)) {
          throw new Error(selfieRes.message || 'Could not submit selfie');
        }
      }

      showToast({
        type: 'success',
        text1: 'Documents submitted',
        text2: 'Our team will review them shortly.',
      });
      setDocumentUrl('');
      setDocumentNumber('');
      setProofOfAddressUrl('');
      setSelfieUrl('');
      setSelfieLivenessMeta(null);
      setStep('status');
      await fetchStatus({ silent: true, force: true });
    } catch (err: any) {
      showToast({ type: 'error', text1: err?.message || 'Could not submit documents' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectState = useCallback((nextState: string) => {
    setState((prev) => {
      if (prev === nextState) return prev;
      setCity('');
      return nextState;
    });
    setShowStatePicker(false);
  }, []);

  const handleSelectCity = useCallback((nextCity: string) => {
    setCity(nextCity);
    setShowCityPicker(false);
  }, []);

  const renderPrimaryBtn = (label: string, onPress: () => void, disabled?: boolean) => (
    <GradientButton
      title={label}
      onPress={onPress}
      disabled={disabled || submitting}
      inactive={Boolean(disabled || submitting)}
      isLoading={submitting}
      size="compact"
      style={styles.primaryBtn}
      rightIcon={<Ionicons name="arrow-forward" size={17} color={Colors.white} />}
    />
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
          stepBadge="Tier 3 · Step 1 of 2"
          perks={['All steps completed in-app']}
        >
          <Tier3Progress currentStep="address" />
          <FormSelectField
            label="State"
            icon="map-outline"
            value={state ? formatStateLabel(state) : ''}
            placeholder="Choose state"
            onPress={() => setShowStatePicker(true)}
          />
          <FormSelectField
            label="City"
            icon="business-outline"
            value={city}
            placeholder={state ? 'Choose city / LGA' : 'Select state first'}
            disabled={!state}
            onPress={() => setShowCityPicker(true)}
          />
          <FormField label="Street address" icon="home-outline">
            <TextInput
              style={styles.inputField}
              value={address}
              onChangeText={setAddress}
              placeholder="House no, street"
              placeholderTextColor={Colors.mutedLight}
            />
          </FormField>
          {renderPrimaryBtn('Save address', handleSaveAddress)}
        </FormShell>
      );
    }

    if (step === 'tier3-docs') {
      const submissionActive = isTier3SubmissionActive(tier3DocSummary);
      const submissionHeadline = getTier3SubmissionHeadline(tier3DocSummary);
      const awaitingReview = isTier3AwaitingReview(tier3DocSummary);
      const needsId = kycDocumentNeedsUpload(tier3DocSummary.idDoc?.status);
      const needsProof = kycDocumentNeedsUpload(tier3DocSummary.proofDoc?.status);
      const needsSelfie = kycDocumentNeedsUpload(tier3DocSummary.selfieDoc?.status);
      const showUploadForm = !awaitingReview && (needsId || needsProof || needsSelfie);
      const canSubmit = showUploadForm && (
        (!needsId || (documentUrl && documentNumber.trim()))
        && (!needsProof || proofOfAddressUrl)
        && (!needsSelfie || (selfieUrl && selfieLivenessMeta))
      );

      return (
        <FormShell
          icon="id-card-outline"
          title={submissionActive ? submissionHeadline.title : 'Upload documents'}
          subtitle={
            submissionActive
              ? submissionHeadline.subtitle
              : 'Government ID, proof of address, and a live face scan for Tier 3.'
          }
          stepBadge="Tier 3 · Step 2 of 2"
          perks={['Reviewed by our team in admin']}
        >
          <Tier3Progress currentStep="documents" />

          {submissionActive ? (
            <>
              <DocStatusBanner
                tone={submissionHeadline.tone === 'rejected' ? 'rejected' : submissionHeadline.tone === 'progress' ? 'pending' : 'pending'}
                title={submissionHeadline.title}
                subtitle={submissionHeadline.subtitle}
              />
              <View style={styles.docReviewList}>
                <View style={styles.docReviewRow}>
                  <Text style={styles.docReviewLabel}>Government ID</Text>
                  <Text style={[styles.docReviewStatus, docReviewStatusStyle(tier3DocSummary.idDoc?.status)]}>
                    {formatKycDocumentStatus(tier3DocSummary.idDoc?.status)}
                  </Text>
                </View>
                <View style={styles.docReviewRow}>
                  <Text style={styles.docReviewLabel}>Proof of address</Text>
                  <Text style={[styles.docReviewStatus, docReviewStatusStyle(tier3DocSummary.proofDoc?.status)]}>
                    {formatKycDocumentStatus(tier3DocSummary.proofDoc?.status)}
                  </Text>
                </View>
                <View style={[styles.docReviewRow, !showUploadForm && styles.docReviewRowLast]}>
                  <Text style={styles.docReviewLabel}>Live face scan</Text>
                  <Text style={[styles.docReviewStatus, docReviewStatusStyle(tier3DocSummary.selfieDoc?.status)]}>
                    {formatKycDocumentStatus(tier3DocSummary.selfieDoc?.status)}
                  </Text>
                </View>
                {tier3DocSummary.idDoc?.status === 'REJECTED' && tier3DocSummary.idDoc.rejectionReason ? (
                  <Text style={styles.docReviewNote}>ID: {tier3DocSummary.idDoc.rejectionReason}</Text>
                ) : null}
                {tier3DocSummary.proofDoc?.status === 'REJECTED' && tier3DocSummary.proofDoc.rejectionReason ? (
                  <Text style={styles.docReviewNote}>Proof: {tier3DocSummary.proofDoc.rejectionReason}</Text>
                ) : null}
                {tier3DocSummary.selfieDoc?.status === 'REJECTED' && tier3DocSummary.selfieDoc.rejectionReason ? (
                  <Text style={[styles.docReviewNote, styles.docReviewRowLast]}>Face scan: {tier3DocSummary.selfieDoc.rejectionReason}</Text>
                ) : null}
              </View>
              {!showUploadForm ? (
                renderPrimaryBtn('Back to overview', () => setStep('status'))
              ) : null}
            </>
          ) : null}

          {showUploadForm ? (
            <>
              {needsId ? (
                <>
                  <FormSelectField
                    label="Document type"
                    icon="card-outline"
                    value={KYC_ID_TYPE_LABELS[documentType] ?? documentType}
                    placeholder="Choose document type"
                    onPress={() => setShowDocTypePicker(true)}
                  />
                  <FormField label="Document number" icon="keypad-outline">
                    <TextInput
                      style={styles.inputField}
                      value={documentNumber}
                      onChangeText={setDocumentNumber}
                      placeholder="Enter ID number"
                      placeholderTextColor={Colors.mutedLight}
                      autoCapitalize="characters"
                    />
                  </FormField>
                  <KycUploadTile
                    label="Government ID"
                    hint="Add a clear photo of your ID"
                    imageUrl={documentUrl}
                    uploading={uploadingDocument}
                    statusLabel={
                      !documentUrl && tier3DocSummary.idDoc?.status === 'REJECTED' ? 'Rejected' : undefined
                    }
                    onCamera={() => { void captureKycImage('document', 'camera'); }}
                    onGallery={() => { void captureKycImage('document', 'library'); }}
                    onClear={() => setDocumentUrl('')}
                  />
                </>
              ) : isKycDocumentLocked(tier3DocSummary.idDoc?.status) ? (
                <View style={styles.docReviewRow}>
                  <Text style={styles.docReviewLabel}>Government ID</Text>
                  <Text style={[styles.docReviewStatus, docReviewStatusStyle(tier3DocSummary.idDoc?.status)]}>
                    {formatKycDocumentStatus(tier3DocSummary.idDoc?.status)}
                  </Text>
                </View>
              ) : null}

              {needsProof ? (
                <KycUploadTile
                  label="Proof of address"
                  hint="Utility bill, tenancy, or bank statement"
                  imageUrl={proofOfAddressUrl}
                  uploading={uploadingProof}
                  statusLabel={
                    !proofOfAddressUrl && tier3DocSummary.proofDoc?.status === 'REJECTED' ? 'Rejected' : undefined
                  }
                  onCamera={() => { void captureKycImage('proof_of_address', 'camera'); }}
                  onGallery={() => { void captureKycImage('proof_of_address', 'library'); }}
                  onClear={() => setProofOfAddressUrl('')}
                />
              ) : isKycDocumentLocked(tier3DocSummary.proofDoc?.status) ? (
                <View style={styles.docReviewRow}>
                  <Text style={styles.docReviewLabel}>Proof of address</Text>
                  <Text style={[styles.docReviewStatus, docReviewStatusStyle(tier3DocSummary.proofDoc?.status)]}>
                    {formatKycDocumentStatus(tier3DocSummary.proofDoc?.status)}
                  </Text>
                </View>
              ) : null}

              {needsSelfie ? (
                <View style={styles.uploadWrap}>
                  <View style={styles.uploadLabelRow}>
                    <Text style={styles.fieldLabel}>Live face scan</Text>
                    {selfieUrl ? (
                      <View style={[styles.uploadStatusPill, styles.uploadStatusPillSuccess]}>
                        <Text style={[styles.uploadStatusText, styles.uploadStatusTextSuccess]}>Verified live</Text>
                      </View>
                    ) : tier3DocSummary.selfieDoc?.status === 'REJECTED' ? (
                      <View style={styles.uploadStatusPill}>
                        <Text style={styles.uploadStatusText}>Rejected</Text>
                      </View>
                    ) : null}
                  </View>
                  {selfieUrl ? (
                    <View style={styles.uploadPreviewWrap}>
                      <Image source={{ uri: selfieUrl }} style={styles.uploadPreview} contentFit="cover" />
                      <TouchableOpacity
                        style={styles.uploadClearBtn}
                        onPress={() => {
                          setSelfieUrl('');
                          setSelfieLivenessMeta(null);
                          setLivenessSession(null);
                        }}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="close" size={16} color={Colors.white} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.faceScanBtn}
                      onPress={() => void handleStartFaceScan()}
                      disabled={uploadingSelfie || startingFaceScan}
                      activeOpacity={0.85}
                    >
                      {uploadingSelfie || startingFaceScan ? (
                        <ActivityIndicator color={Colors.primary} />
                      ) : (
                        <>
                          <View style={styles.uploadDropIcon}>
                            <Ionicons name="scan-outline" size={22} color={Colors.primary} />
                          </View>
                          <Text style={styles.uploadDropTitle}>Start live face scan</Text>
                          <Text style={styles.uploadDropSub}>Camera + mic · say a short word on screen</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : isKycDocumentLocked(tier3DocSummary.selfieDoc?.status) ? (
                <View style={styles.docReviewRow}>
                  <Text style={styles.docReviewLabel}>Live face scan</Text>
                  <Text style={[styles.docReviewStatus, docReviewStatusStyle(tier3DocSummary.selfieDoc?.status)]}>
                    {formatKycDocumentStatus(tier3DocSummary.selfieDoc?.status)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.secureNote}>
                <View style={styles.secureNoteIcon}>
                  <Ionicons name="shield-checkmark" size={16} color={Colors.primary} />
                </View>
                <Text style={styles.secureNoteText}>
                  Documents upload to secure storage. Face scan must be captured live on camera.
                </Text>
              </View>
              {renderPrimaryBtn(
                tier3DocSummary.anyRejected ? 'Resubmit for review' : 'Submit for review',
                handleSubmitDocuments,
                !canSubmit,
              )}
            </>
          ) : null}
        </FormShell>
      );
    }

    const bvnDone = hasBvnVerified(kycData);

    return (
      <View style={styles.overview}>
        {bvnDone && (
          <GlassCard borderRadius={Radius.lg} padding={14} variant="solid" contentStyle={styles.perkBanner}>
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

        <MemoTierStep
          tierKey="TIER_1"
          tier={tiers.TIER_1}
          currentTier={currentTier}
          onAction={currentTier === 'PENDING' ? handleInitiateTier1 : undefined}
          actionLabel={currentTier === 'PENDING' ? (kycData?.user.isPhoneVerified ? 'Complete Tier 1' : 'Verify phone') : undefined}
          showVerified={['TIER_1', 'TIER_2', 'TIER_3'].includes(currentTier)}
          disabled={submitting}
        />

        <MemoTierStep
          tierKey="TIER_2"
          tier={tiers.TIER_2}
          currentTier={currentTier}
          onAction={currentTier === 'TIER_1' ? () => setStep('tier2') : undefined}
          actionLabel={currentTier === 'TIER_1' ? 'Verify BVN' : undefined}
          showVerified={['TIER_2', 'TIER_3'].includes(currentTier)}
        />

        <MemoTierStep
          tierKey="TIER_3"
          tier={tiers.TIER_3}
          currentTier={currentTier}
          onAction={currentTier === 'TIER_2' ? startTier3 : undefined}
          actionLabel={currentTier === 'TIER_2' ? getTier3ActionLabel(kycData) : undefined}
          showVerified={currentTier === 'TIER_3'}
          isLast
        />

        {currentTier === 'TIER_2' && isTier3SubmissionActive(tier3DocSummary) ? (
          <GlassCard borderRadius={Radius.lg} padding={14} variant="solid" contentStyle={styles.reviewBanner}>
            <View style={styles.perkIcon}>
              <Ionicons
                name={tier3DocSummary.anyRejected ? 'alert-circle-outline' : 'time-outline'}
                size={18}
                color={tier3DocSummary.anyRejected ? Colors.error : Colors.warning}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.perkTitle}>{getTier3SubmissionHeadline(tier3DocSummary).title}</Text>
              <Text style={styles.perkSub}>{getTier3SubmissionHeadline(tier3DocSummary).subtitle}</Text>
            </View>
          </GlassCard>
        ) : null}

        <View style={styles.trustFooter}>
          <Ionicons name="lock-closed" size={13} color={Colors.muted} />
          <Text style={styles.trustFooterText}>256-bit encryption · NDPR compliant</Text>
        </View>
      </View>
    );
  };

  return (
    <ThemedScreen withAmbient={false}>
      <LinearGradient
        colors={gradientStops(gradients.heroAuth)}
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
                <Ionicons name="shield-checkmark" size={14} color={Palette.heroTextMuted} />
                <Text style={styles.headerTierText}>{getKycTierLabel(currentTier)}</Text>
              </View>
              <Text style={styles.headerPct}>{progress}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={gradientStops([colors.primaryLight, colors.primary])}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progress}%` }]}
              />
            </View>
          </View>
        )}
      </LinearGradient>

      <View style={styles.contentCurve} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>Loading verification status…</Text>
          </View>
        ) : (
          <View style={styles.flex}>
            <ScrollView
              contentContainerStyle={[
                styles.scroll,
                {
                  paddingBottom: insets.bottom + 32 + (keyboardVisible ? keyboardHeight + 12 : 0),
                },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              removeClippedSubviews
              nestedScrollEnabled={false}
              overScrollMode="never"
              refreshControl={(
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => { void onRefresh(); }}
                  tintColor={Colors.primary}
                  colors={[Colors.primary]}
                />
              )}
            >
              {renderStepContent()}
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>

      <LocationPickerModal
        visible={showStatePicker}
        title="Select state"
        subtitle="Choose your state of residence"
        options={stateOptions}
        popularOptions={POPULAR_NIGERIA_STATES}
        formatLabel={formatStateLabel}
        loading={locationsLoading}
        selectedValue={state || null}
        onClose={() => setShowStatePicker(false)}
        onSelect={handleSelectState}
      />

      <LocationPickerModal
        visible={showCityPicker}
        title="Select city"
        subtitle={state ? `Cities and LGAs in ${formatStateLabel(state)}` : undefined}
        options={cityOptions}
        loading={locationsLoading}
        selectedValue={city || null}
        onClose={() => setShowCityPicker(false)}
        onSelect={handleSelectCity}
      />

      <LocationPickerModal
        visible={showDocTypePicker}
        title="Document type"
        subtitle="Choose the ID you want to submit"
        options={[...KYC_ID_TYPE_VALUES]}
        formatLabel={(value) => KYC_ID_TYPE_LABELS[value] ?? value}
        selectedValue={documentType}
        onClose={() => setShowDocTypePicker(false)}
        onSelect={(value) => {
          setDocumentType(value);
          setShowDocTypePicker(false);
        }}
      />

      {livenessSession ? (
        <FaceLivenessScannerGate
          visible={showFaceScan}
          sessionId={livenessSession.sessionId}
          spokenPhrase={livenessSession.spokenPhrase}
          expiresAt={livenessSession.expiresAt}
          onClose={() => {
            setShowFaceScan(false);
          }}
          onComplete={(result) => {
            setShowFaceScan(false);
            void handleFaceScanComplete(result);
          }}
        />
      ) : null}
    </ThemedScreen>
  );
}

const createStyles = (colors: import('../../src/theme/types').ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  contentCurve: {
    height: 20,
    marginTop: -20,
    backgroundColor: colors.pageBg,
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
    backgroundColor: Overlays.rgba255_255_255_005,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Overlays.white12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.white, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: Overlays.white65, marginTop: 3 },
  headerProgress: { marginTop: 20, gap: 10 },
  headerProgressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Overlays.white12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Overlays.rgba255_255_255_015,
  },
  headerTierText: { fontSize: 13, fontWeight: '700', color: colors.white },
  headerPct: { fontSize: 22, fontWeight: '800', color: colors.white },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Overlays.white18,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: colors.muted },
  scroll: { paddingHorizontal: Spacing.page, paddingTop: 4 },

  overview: { gap: 8 },
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
    backgroundColor: colors.pinFilled,
    justifyContent: 'center',
    alignItems: 'center',
  },
  perkTitle: { fontSize: 14, fontWeight: '700', color: colors.dark },
  perkSub: { fontSize: 12, color: colors.darkAlt, marginTop: 2, lineHeight: 17 },
  pathLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mid,
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
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.borderMid,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  railDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  railDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  railDotLocked: { backgroundColor: colors.surfaceAlt, borderColor: colors.borderMid },
  railDotNum: { fontSize: 11, fontWeight: '800', color: colors.muted },
  railDotNumActive: { color: colors.white },
  railLine: {
    flex: 1,
    width: 2.5,
    backgroundColor: colors.borderMid,
    marginVertical: 6,
    minHeight: 24,
    borderRadius: 2,
  },
  railLineDone: { backgroundColor: colors.primaryLight },

  tierPanel: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  tierPanelContent: {
    gap: 12,
    overflow: 'hidden',
  },
  tierPanelDone: {
    borderColor: Overlays.rgba124_58_237_02,
  },
  tierPanelActive: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  tierPanelLocked: {
    opacity: 0.92,
  },
  tierPanelAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
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
  tierPanelTitle: { fontSize: 16, fontWeight: '800', color: colors.dark, letterSpacing: -0.2 },
  tierPanelTitleLocked: { color: colors.mid },
  tierPanelDesc: { fontSize: 13, color: colors.darkAlt, lineHeight: 18 },
  tierPanelDescLocked: { color: colors.mid },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Overlays.rgba124_58_237_015,
  },
  doneBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primaryLight },
  nextBadge: {
    backgroundColor: colors.inputFilled,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  nextBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primaryLight },

  reqSection: { gap: 8, alignItems: 'center' },
  reqSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mid,
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
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
    backgroundColor: colors.primaryMuted,
    borderColor: Overlays.rgba124_58_237_02,
  },
  reqPillPending: {
    backgroundColor: colors.primaryMuted,
    borderColor: Overlays.borderPrimary14,
  },
  reqPillDimmed: {
    backgroundColor: colors.surfaceAlt,
    borderColor: 'transparent',
  },
  reqPillText: { fontSize: 11, fontWeight: '600', color: colors.darkAlt, flexShrink: 1 },
  reqPillTextSingleRow: { fontSize: 10, textAlign: 'center' },
  reqPillTextDone: { color: colors.primaryLight },
  reqPillTextPending: { color: colors.primaryLight },
  reqPillTextDimmed: { color: colors.mid },

  lockedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  lockedHintText: { fontSize: 12, color: colors.mid, fontWeight: '500' },

  limitsSection: { gap: 8, alignItems: 'center' },
  limitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderMid,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  limitsRowDimmed: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  limitItem: { flex: 1, alignItems: 'center', gap: 3 },
  limitLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mid,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  limitValue: { fontSize: 13, fontWeight: '800', color: colors.dark, letterSpacing: -0.2 },
  limitValueDimmed: { color: colors.mid },
  limitDivider: { width: 1, height: 28, backgroundColor: colors.borderMid },
  limitDividerDimmed: { backgroundColor: colors.borderSubtle },

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
    backgroundColor: Overlays.rgba255_255_255_005,
  },
  formStepBadge: {
    backgroundColor: Overlays.white14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Overlays.rgba255_255_255_02,
  },
  formStepBadgeText: { fontSize: 10, fontWeight: '700', color: Palette.heroTextMuted, letterSpacing: 0.3 },
  formHeroIconRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Overlays.white12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Overlays.rgba255_255_255_02,
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
    color: colors.white,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  formSub: {
    fontSize: 12,
    color: Overlays.rgba255_255_255_07,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  formPerkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Overlays.white10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Overlays.white12,
    maxWidth: '100%',
  },
  formPerkText: { fontSize: 10, fontWeight: '600', color: colors.primaryLight, flexShrink: 1 },
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
  formTrustText: { fontSize: 11, color: colors.muted },
  fieldWrap: { gap: 8 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  fieldCounter: { fontSize: 11, fontWeight: '700', color: colors.primary },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.formBgAlt,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Overlays.borderPrimary14,
    overflow: 'hidden',
  },
  inputIconWrap: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Overlays.violet10,
    alignSelf: 'stretch',
    paddingVertical: 14,
  },
  inputField: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.dark,
    fontWeight: '500',
  },
  selectTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  selectTriggerDisabled: {
    opacity: 0.55,
  },
  selectText: {
    flex: 1,
    fontSize: 16,
    color: colors.dark,
    fontWeight: '500',
  },
  selectPlaceholder: {
    color: colors.mutedLight,
    fontWeight: '400',
  },
  uploadWrap: { gap: 8 },
  uploadDropzone: {
    minHeight: 132,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Overlays.borderPrimary22,
    backgroundColor: colors.formBgAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 6,
  },
  uploadDropIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  uploadDropTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark,
    textAlign: 'center',
  },
  uploadDropSub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
  },
  uploadPreviewWrap: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Overlays.borderPrimary14,
  },
  uploadPreview: {
    width: '100%',
    height: 180,
    backgroundColor: colors.surfaceAlt,
  },
  uploadClearBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Overlays.rgba15_23_42_072,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  uploadStatusPill: {
    backgroundColor: Palette.emerald200,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  uploadStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.error,
    textTransform: 'uppercase',
  },
  uploadStatusPillSuccess: {
    backgroundColor: Palette.green100,
  },
  uploadStatusTextSuccess: {
    color: colors.success,
  },
  faceScanBtn: {
    minHeight: 132,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Overlays.borderPrimary22,
    backgroundColor: colors.formBgAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 6,
  },
  uploadActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  uploadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  uploadActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  tier3Progress: { gap: 8, marginBottom: 4 },
  tier3ProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.inputFilled,
    overflow: 'hidden',
  },
  tier3ProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  tier3ProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tier3ProgressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedLight,
  },
  tier3ProgressLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  docStatusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  docStatusBannerPending: {
    backgroundColor: Palette.amber50,
    borderColor: Overlays.rgba245_158_11_02,
  },
  docStatusBannerRejected: {
    backgroundColor: Palette.red50,
    borderColor: Overlays.rgba239_68_68_018,
  },
  docStatusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark,
  },
  docStatusSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 3,
    lineHeight: 17,
  },
  docReviewList: {
    backgroundColor: colors.formBgAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Overlays.darkAmbientPrimary,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  docReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  docReviewRowLast: {
    borderBottomWidth: 0,
  },
  docReviewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark,
  },
  docReviewStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  docReviewStatusPending: {
    color: colors.warning,
  },
  docReviewStatusApproved: {
    color: Palette.emerald600,
  },
  docReviewStatusRejected: {
    color: colors.error,
  },
  docReviewStatusMuted: {
    color: colors.muted,
  },
  docReviewNote: {
    fontSize: 12,
    color: colors.error,
    lineHeight: 17,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  otpWrap: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  otpBox: {
    width: 46,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Overlays.borderPrimary18,
    backgroundColor: colors.formBgAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.pinFilled,
    borderWidth: 2,
  },
  otpBoxFilled: { backgroundColor: colors.inputFilled },
  otpDigit: { fontSize: 22, fontWeight: '800', color: colors.heroDark },
  otpHiddenInput: hiddenNumericInputStyle,
  otpHint: { fontSize: 12, color: colors.mutedLight, fontWeight: '500' },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.pinFilled,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Overlays.darkAmbientPrimary,
  },
  secureNoteIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secureNoteText: { fontSize: 12, color: colors.muted, flex: 1, lineHeight: 18 },
  primaryBtn: {
    marginTop: 8,
  },
  phoneCard: {
    backgroundColor: colors.pinFilled,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: Overlays.rgba124_58_237_015,
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  phoneCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  phoneLabel: { fontSize: 11, color: colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  phoneValue: { fontSize: 26, fontWeight: '800', color: colors.heroDark, letterSpacing: 0.5 },
  phoneHint: { fontSize: 12, color: colors.mutedLight, marginTop: 2 },
  resendBtn: { alignSelf: 'center', paddingVertical: 6 },
  resendText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  resendTextMuted: { color: colors.mutedLight },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
  },
  trustFooterText: { fontSize: 12, color: colors.muted },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
