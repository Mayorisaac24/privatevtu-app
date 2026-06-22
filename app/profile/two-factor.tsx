import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { LoadingOverlay } from '../../src/components/ui/LoadingOverlay';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import {
  api,
  isResponseSuccess,
  type Enable2FAResponse,
  type TwoFactorMethodOption,
  type TwoFactorMethodType,
} from '../../src/lib/api';
import {
  getTwoFactorMethods,
  peekTwoFactorMethods,
} from '../../src/lib/two-factor-methods-cache';
import { useAuthStore } from '../../src/stores';
import { refreshUserProfile } from '../../src/lib/profile-sync';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Radius, Spacing } from '../../src/theme';
import { useGradients } from '../../src/theme/hooks';
import { gradientStops } from '../../src/theme/gradient-utils';
import { SERVICE_ICON } from '../../src/lib/service-catalog-ui';
import { showToast } from '../../src/components/ui/Toast';
import { Disable2FAVerifyCard } from '../../src/components/security/Disable2FAVerifyCard';
import { PremiumOtpInput } from '../../src/components/security/PremiumOtpInput';


const METHOD_META: Record<TwoFactorMethodType, {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  color: string;
  bg: string;
}> = {
  EMAIL: { icon: 'mail-outline', title: 'Email', ...SERVICE_ICON },
  AUTHENTICATOR: { icon: 'phone-portrait-outline', title: 'Authenticator app', ...SERVICE_ICON },
  SMS: { icon: 'chatbubble-ellipses-outline', title: 'SMS', ...SERVICE_ICON },
};

type Step = 'choose' | 'verify' | 'disable';

function methodLabel(method?: TwoFactorMethodType | null) {
  if (!method) return 'Not set';
  return METHOD_META[method]?.title || method;
}

function resolveActiveTwoFactorMethod(
  user: {
    twoFactorEnabled?: boolean;
    twoFactorMethod?: TwoFactorMethodType | null;
    email?: string | null;
    isEmailVerified?: boolean;
    phone?: string | null;
    isPhoneVerified?: boolean;
  } | null | undefined,
): TwoFactorMethodType | null {
  if (!user?.twoFactorEnabled) return null;
  if (user.twoFactorMethod) return user.twoFactorMethod;
  if (user.email && user.isEmailVerified) return 'EMAIL';
  if (user.phone && user.isPhoneVerified) return 'SMS';
  return 'AUTHENTICATOR';
}

function isMethodInactive(item: TwoFactorMethodOption) {
  return item.available === false || item.enabled === false;
}

export default function TwoFactorScreen() {
  const { user, updateUser } = useAuthStore();
  const gradients = useGradients();
  const enabled = Boolean(user?.twoFactorEnabled);
  const activeMethod = resolveActiveTwoFactorMethod(user);

  const [methods, setMethods] = useState<TwoFactorMethodOption[]>(() => peekTwoFactorMethods() ?? []);
  const [methodsLoading, setMethodsLoading] = useState(() => !(peekTwoFactorMethods()?.length));
  const [step, setStep] = useState<Step>('choose');
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethodType | null>(null);
  const [setup, setSetup] = useState<Enable2FAResponse | null>(null);
  const [otp, setOtp] = useState('');
  const [disableMethod, setDisableMethod] = useState<TwoFactorMethodType | null>(null);
  const [disableDestination, setDisableDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [disableDialogVisible, setDisableDialogVisible] = useState(false);

  const loadMethods = useCallback(async (force = false) => {
    const cached = peekTwoFactorMethods();
    if (cached?.length && !force) {
      setMethods(cached);
      setMethodsLoading(false);
    } else if (!cached?.length) {
      setMethodsLoading(true);
    }

    try {
      const next = await getTwoFactorMethods({ forceRefresh: force });
      setMethods(next);
    } catch {
      if (!cached?.length) setMethods([]);
    } finally {
      setMethodsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadMethods();
      if (enabled) {
        void refreshUserProfile();
      } else {
        setStep('choose');
        setSelectedMethod(null);
        setSetup(null);
        setOtp('');
        setDisableMethod(null);
        setDisableDestination('');
      }
    }, [enabled, loadMethods]),
  );

  const startEnable = async (method: TwoFactorMethodType) => {
    const option = methods.find((item) => item.method === method);
    if (option && isMethodInactive(option)) {
      showToast({
        type: 'info',
        text1: 'Unavailable',
        text2: option.inactiveReason || 'This 2FA method is currently inactive',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await api.enable2FA(method);
      if (!isResponseSuccess(res) || !res.data) {
        throw new Error(res.message || 'Could not start 2FA setup');
      }
      setSelectedMethod(method);
      setSetup(res.data);
      setStep('verify');
      setOtp('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not start 2FA setup';
      showToast({ type: 'error', text1: 'Setup failed', text2: message });
    } finally {
      setLoading(false);
    }
  };

  const confirmEnable = async () => {
    if (!selectedMethod || otp.length < 6) {
      showToast({ type: 'error', text1: 'Enter code', text2: 'Provide the 6-digit verification code' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.verify2FA(otp, selectedMethod);
      if (!isResponseSuccess(res)) throw new Error(res.message || 'Invalid code');
      updateUser({ twoFactorEnabled: true, twoFactorMethod: selectedMethod });
      setSetup(null);
      setOtp('');
      setStep('choose');
      showToast({ type: 'success', text1: '2FA enabled', text2: `${methodLabel(selectedMethod)} is now active` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      showToast({ type: 'error', text1: 'Could not verify', text2: message });
    } finally {
      setLoading(false);
    }
  };

  const prepareDisable = async () => {
    setDisableDialogVisible(false);
    setOtp('');

    const freshUser = (await refreshUserProfile()) ?? user;
    const method = resolveActiveTwoFactorMethod(freshUser);
    if (!method) {
      showToast({
        type: 'error',
        text1: 'Cannot disable 2FA',
        text2: 'Your active verification method could not be determined. Try again or contact support.',
      });
      return;
    }

    setDisableMethod(method);

    if (method === 'EMAIL' || method === 'SMS') {
      setLoading(true);
      try {
        const res = await api.send2FACode('disable');
        if (!isResponseSuccess(res)) throw new Error(res.message || 'Could not send code');
        const resolvedMethod = res.data?.method ?? method;
        const destination = res.data?.destination || '';
        setDisableMethod(resolvedMethod);
        setDisableDestination(destination);
        setStep('disable');
        showToast({
          type: 'success',
          text1: 'Verification code sent',
          text2: destination ? `Check ${destination}` : 'Enter the code to turn off 2FA',
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Could not send code';
        showToast({ type: 'error', text1: 'Request failed', text2: message });
        setDisableMethod(null);
        setDisableDestination('');
      } finally {
        setLoading(false);
      }
      return;
    }

    setDisableDestination('');
    setStep('disable');
  };

  const confirmDisable = async (code?: string) => {
    const otpCode = (code ?? otp).replace(/\D/g, '');
    if (otpCode.length < 6) {
      showToast({ type: 'error', text1: 'Enter code', text2: 'Verification code required to disable 2FA' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.disable2FA(otpCode);
      if (!isResponseSuccess(res)) throw new Error(res.message || 'Could not disable 2FA');
      updateUser({ twoFactorEnabled: false, twoFactorMethod: null });
      setOtp('');
      setDisableDestination('');
      setDisableMethod(null);
      setStep('choose');
      showToast({ type: 'success', text1: '2FA turned off', text2: 'Your account now uses password only' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not disable 2FA';
      showToast({ type: 'error', text1: 'Update failed', text2: message });
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const resendDisableCode = async () => {
    if (!disableMethod || disableMethod === 'AUTHENTICATOR') return;
    setLoading(true);
    try {
      const res = await api.send2FACode('disable');
      if (!isResponseSuccess(res)) throw new Error(res.message || 'Could not resend code');
      if (res.data?.destination) setDisableDestination(res.data.destination);
      if (res.data?.method) setDisableMethod(res.data.method);
      showToast({
        type: 'success',
        text1: 'Code resent',
        text2: res.data?.destination ? `Sent to ${res.data.destination}` : undefined,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not resend code';
      showToast({ type: 'error', text1: 'Resend failed', text2: message });
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!selectedMethod) return;
    setLoading(true);
    try {
      const res = await api.send2FACode('enable', { method: selectedMethod });
      if (!isResponseSuccess(res)) throw new Error(res.message || 'Could not resend code');
      showToast({ type: 'success', text1: 'Code resent', text2: res.data?.destination ? `Sent to ${res.data.destination}` : undefined });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not resend code';
      showToast({ type: 'error', text1: 'Resend failed', text2: message });
    } finally {
      setLoading(false);
    }
  };

  const qrImage = setup?.qrCode || setup?.qrCodeUrl;
  const showMethodLoading = methodsLoading && methods.length === 0;

  return (
    <>
      <ProfileSubScreen
        title="2-Factor Auth"
        subtitle={
          step === 'verify' && selectedMethod === 'AUTHENTICATOR'
            ? 'Link your app, then enter the 6-digit code'
            : step === 'verify'
              ? 'Enter the code we sent you'
              : step === 'disable'
                ? 'Confirm with your verification code'
                : 'Choose how you verify sign-in'
        }
        headerIcon={step === 'verify' || step === 'disable' ? 'shield-checkmark' : undefined}
        headerAccessory={
          step === 'verify' && selectedMethod ? (
            <VerifyFlowHeader method={selectedMethod} />
          ) : step === 'disable' && disableMethod ? (
            <VerifyFlowHeader method={disableMethod} variant="disable" />
          ) : null
        }
        footer={step === 'verify' ? (
          <GradientButton
            title="Activate 2FA"
            onPress={() => void confirmEnable()}
            inactive={otp.length < 6 || loading}
            disabled={otp.length < 6 || loading}
            isLoading={loading}
            size="compact"
            leftIcon={<Ionicons name="shield-checkmark" size={17} color={Colors.white} />}
          />
        ) : step === 'disable' ? (
          <GradientButton
            title="Confirm & turn off"
            onPress={() => void confirmDisable()}
            inactive={otp.length < 6 || loading}
            disabled={otp.length < 6 || loading}
            isLoading={loading}
            loadingLabel="Turning off 2FA…"
            size="compact"
            leftIcon={<Ionicons name="shield-outline" size={17} color={Colors.white} />}
          />
        ) : undefined}
      >
        {step === 'choose' ? (
          <SecurityHero enabled={enabled} activeMethod={activeMethod} />
        ) : null}

        {enabled && step === 'choose' ? (
          <GlassCard variant="solid" borderRadius={22} padding={0} contentStyle={styles.activeCard}>
            <LinearGradient
              colors={gradientStops(gradients.activeCard)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.activeHeader}>
              <View style={styles.activeIconWrap}>
                <Ionicons name="shield-checkmark" size={24} color={Colors.success} />
              </View>
              <View style={styles.activeCopy}>
                <View style={styles.activeTitleRow}>
                  <Text style={styles.activeTitle}>Protected</Text>
                  <View style={styles.liveDot} />
                </View>
                <Text style={styles.activeSub}>Active method</Text>
              </View>
            </View>

            {activeMethod ? (
              <View style={styles.methodChip}>
                <View style={[styles.methodChipIcon, { backgroundColor: METHOD_META[activeMethod].bg }]}>
                  <Ionicons
                    name={METHOD_META[activeMethod].icon}
                    size={18}
                    color={METHOD_META[activeMethod].color}
                  />
                </View>
                <Text style={styles.methodChipText}>{methodLabel(activeMethod)}</Text>
              </View>
            ) : null}

            <View style={styles.switchNote}>
              <Ionicons name="swap-horizontal-outline" size={16} color={Colors.primary} />
              <Text style={styles.switchNoteText}>
                To switch methods, turn off 2FA first, then set up your preferred option.
              </Text>
            </View>

            <TouchableOpacity style={styles.dangerOutline} onPress={() => setDisableDialogVisible(true)} activeOpacity={0.8}>
              <Ionicons name="power-outline" size={16} color={Colors.error} />
              <Text style={styles.dangerOutlineText}>Turn off 2FA</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : null}

        {!enabled && step === 'choose' ? (
          <View style={styles.methodSection}>
            <Text style={styles.sectionLabel}>Verification methods</Text>
            <Text style={styles.sectionHint}>Pick one — you can change it anytime after disabling the current method.</Text>

            {showMethodLoading ? (
              <GlassCard variant="solid" borderRadius={20} padding={28} contentStyle={styles.loadingCard}>
                <ActivityIndicator color={Colors.primary} size="large" />
              </GlassCard>
            ) : methods.length === 0 ? (
              <GlassCard variant="solid" borderRadius={Radius.lg} padding={20} contentStyle={styles.emptyCard}>
                <Ionicons name="cloud-offline-outline" size={28} color={Colors.mutedLight} />
                <Text style={styles.emptyTitle}>Could not load methods</Text>
                <Text style={styles.emptyText}>Check your connection and open this screen again.</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => void loadMethods(true)} activeOpacity={0.85}>
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              </GlassCard>
            ) : (
              <View style={styles.methodList}>
                {methods.map((item) => (
                  <MethodCard
                    key={item.method}
                    item={item}
                    onPress={() => void startEnable(item.method)}
                  />
                ))}
              </View>
            )}
          </View>
        ) : null}

        {step === 'verify' && selectedMethod ? (
          selectedMethod === 'AUTHENTICATOR' ? (
            <AuthenticatorVerifyCard
              qrImage={qrImage}
              secret={setup?.secret}
              otp={otp}
              onOtpChange={setOtp}
              onBack={() => {
                setStep('choose');
                setSetup(null);
                setOtp('');
              }}
            />
          ) : (
            <GlassCard variant="solid" borderRadius={22} padding={0} contentStyle={styles.flowCard}>
              <TouchableOpacity style={styles.backLink} onPress={() => { setStep('choose'); setSetup(null); setOtp(''); }} activeOpacity={0.8}>
                <Ionicons name="chevron-back" size={18} color={Colors.primary} />
                <Text style={styles.backLinkText}>Choose another method</Text>
              </TouchableOpacity>

              <View style={styles.stepBadge}>
                <View style={[styles.stepBadgeIcon, { backgroundColor: METHOD_META[selectedMethod].bg }]}>
                  <Ionicons
                    name={METHOD_META[selectedMethod].icon}
                    size={22}
                    color={METHOD_META[selectedMethod].color}
                  />
                </View>
              </View>

              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>Verify {methodLabel(selectedMethod)}</Text>
                <Text style={styles.stepSubtitle}>
                  {`Enter the 6-digit code sent to ${setup?.destination || 'your contact'}`}
                </Text>
              </View>

              <OtpInput value={otp} onChange={setOtp} />

              <TouchableOpacity style={styles.resendBtn} onPress={() => void resendCode()} disabled={loading} activeOpacity={0.8}>
                <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
                <Text style={styles.resendText}>Resend code</Text>
              </TouchableOpacity>
            </GlassCard>
          )
        ) : null}

        {step === 'disable' && disableMethod ? (
          <Disable2FAVerifyCard
            method={disableMethod}
            destination={disableDestination || undefined}
            otp={otp}
            onOtpChange={setOtp}
            onComplete={(code) => void confirmDisable(code)}
            onCancel={() => {
              setStep('choose');
              setOtp('');
              setDisableDestination('');
              setDisableMethod(null);
            }}
            onResend={disableMethod !== 'AUTHENTICATOR' ? () => void resendDisableCode() : undefined}
            resendDisabled={loading}
          />
        ) : null}

        {step === 'choose' ? (
          <GlassCard variant="solid" borderRadius={Radius.lg} padding={0} contentStyle={styles.tipsCard}>
            <TipRow icon="shield-outline" text="2FA is required on every new sign-in after activation" />
            <View style={styles.tipDivider} />
            <TipRow icon="key-outline" text="Keep backup access to your email or phone" />
            <View style={styles.tipDivider} />
            <TipRow icon="phone-portrait-outline" text="Authenticator apps work offline once set up" />
          </GlassCard>
        ) : null}
      </ProfileSubScreen>

      <ConfirmDialog
        visible={disableDialogVisible}
        onClose={() => setDisableDialogVisible(false)}
        title="Turn off 2FA?"
        message="Your account will only be protected by your password. You can set up a different 2FA method after this."
        confirmLabel="Continue"
        onConfirm={() => void prepareDisable()}
        icon="alert-circle-outline"
        loading={loading}
      />

      <LoadingOverlay
        visible={loading && step !== 'disable'}
        message="Working on your security settings…"
        submessage="This will only take a moment"
        icon="shield-checkmark"
      />
    </>
  );
}

function SecurityHero({
  enabled,
  activeMethod,
}: {
  enabled: boolean;
  activeMethod: TwoFactorMethodType | null;
}) {
  const gradients = useGradients();

  return (
    <LinearGradient
      colors={gradientStops(enabled ? gradients.hero : gradients.heroAlt)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      <View style={styles.heroBlob} />
      <View style={styles.heroRow}>
        <View style={styles.heroIcon}>
          <Ionicons name={enabled ? 'shield-checkmark' : 'shield-outline'} size={22} color={Colors.white} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>
            {enabled ? 'Extra protection is on' : 'Add a second sign-in step'}
          </Text>
          <Text style={styles.heroBody}>
            {enabled
              ? `${methodLabel(activeMethod)} verifies every new sign-in on this account.`
              : 'Choose email, authenticator app or SMS. Only one method can be active at a time.'}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function MethodCard({
  item,
  onPress,
}: {
  item: TwoFactorMethodOption;
  onPress: () => void;
}) {
  const meta = METHOD_META[item.method];
  const inactive = isMethodInactive(item);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={inactive ? 1 : 0.9} disabled={inactive}>
      <GlassCard
        variant="solid"
        borderRadius={20}
        padding={0}
        contentStyle={[styles.methodCard, inactive && styles.methodCardInactive]}
      >
        <View style={[styles.methodIcon, { backgroundColor: meta.bg }, inactive && styles.methodIconInactive]}>
          <Ionicons name={meta.icon} size={26} color={meta.color} />
        </View>

        <View style={styles.methodCopy}>
          <Text style={[styles.methodTitle, inactive && styles.methodTitleInactive]}>
            {item.label || meta.title}
          </Text>
          <Text style={[styles.methodBody, inactive && styles.methodBodyInactive]}>
            {inactive && item.inactiveReason ? item.inactiveReason : item.description}
          </Text>
        </View>

        <View style={[styles.methodArrow, inactive && styles.methodArrowInactive]}>
          <Ionicons name="chevron-forward" size={18} color={inactive ? Colors.mutedLight : Colors.primary} />
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

function VerifyFlowHeader({
  method,
  variant = 'setup',
}: {
  method: TwoFactorMethodType;
  variant?: 'setup' | 'disable';
}) {
  const meta = METHOD_META[method];

  return (
    <View style={styles.verifyHeaderRow}>
      <View style={styles.verifyHeaderPill}>
        <Ionicons name={meta.icon} size={13} color={Colors.white} />
        <Text style={styles.verifyHeaderPillText}>{meta.title}</Text>
      </View>

      {variant === 'setup' && method === 'AUTHENTICATOR' ? (
        <View style={styles.verifyHeaderTrack}>
          <Text style={styles.verifyHeaderTrackLabel}>Scan</Text>
          <View style={styles.verifyHeaderTrackLine} />
          <Text style={styles.verifyHeaderTrackLabel}>Confirm</Text>
        </View>
      ) : null}
    </View>
  );
}

function truncateSetupKey(secret: string, max = 20): string {
  const clean = secret.replace(/\s/g, '').toUpperCase();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max)}…`;
}

function AuthenticatorVerifyCard({
  qrImage,
  secret,
  otp,
  onOtpChange,
  onBack,
}: {
  qrImage?: string;
  secret?: string;
  otp: string;
  onOtpChange: (value: string) => void;
  onBack: () => void;
}) {
  const setupKey = secret?.trim() ?? '';
  const otpInputRef = useRef<TextInput>(null);

  const copySetupKey = async () => {
    if (!setupKey) return;
    try {
      await Clipboard.setStringAsync(setupKey);
      showToast({ type: 'success', text1: 'Setup key copied' });
    } catch {
      showToast({ type: 'error', text1: 'Could not copy setup key' });
    }
  };

  return (
    <GlassCard variant="solid" borderRadius={22} padding={0} contentStyle={styles.authCard}>
      <TouchableOpacity style={styles.backLink} onPress={onBack} activeOpacity={0.8}>
        <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        <Text style={styles.backLinkText}>Choose another method</Text>
      </TouchableOpacity>

      <View style={styles.authStepBlock}>
        <Text style={styles.stepLabel}>Step 1</Text>
        <Text style={styles.stepHint}>Scan the QR code with your authenticator app.</Text>

        {qrImage ? (
          <View style={styles.qrFrame}>
            <View style={styles.qrInner}>
              <Image source={{ uri: qrImage }} style={styles.qrImage} resizeMode="contain" />
            </View>
          </View>
        ) : null}

        {setupKey ? (
          <>
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR enter the code manually</Text>
              <View style={styles.orLine} />
            </View>

            <View style={styles.keyInputRow}>
              <Text style={styles.keyInputText} numberOfLines={1}>
                {truncateSetupKey(setupKey)}
              </Text>
              <TouchableOpacity
                style={styles.keyCopyBtn}
                onPress={() => void copySetupKey()}
                activeOpacity={0.85}
                hitSlop={6}
              >
                <Ionicons name="copy-outline" size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.authStepBlock}>
        <Text style={styles.stepLabel}>Step 2</Text>
        <Text style={styles.stepHint}>Enter the 6 digit confirmation code shown on the app.</Text>
        <PremiumOtpInput ref={otpInputRef} value={otp} onChange={onOtpChange} />
      </View>
    </GlassCard>
  );
}

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<TextInput>(null);
  return <PremiumOtpInput ref={inputRef} value={value} onChange={onChange} />;
}

function TipRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tipIcon}>
        <Ionicons name={icon} size={15} color={Colors.primary} />
      </View>
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 22,
    padding: 18,
    overflow: 'hidden',
    marginBottom: 4,
  },
  heroBlob: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(124, 58, 237, 0.28)',
  },
  heroRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, gap: 6 },
  heroTitle: { fontSize: 16, fontWeight: '800', color: Colors.white, letterSpacing: -0.2 },
  heroBody: { fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 19 },

  verifyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  verifyHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  verifyHeaderPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  verifyHeaderTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  verifyHeaderTrackLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.82)',
    letterSpacing: 0.2,
  },
  verifyHeaderTrackLine: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  methodSection: { gap: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '800', color: Colors.dark, letterSpacing: -0.2 },
  sectionHint: { fontSize: 13, color: Colors.muted, lineHeight: 18, marginBottom: 4 },

  methodList: { gap: 12 },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    minHeight: 120,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  methodCardInactive: { opacity: 0.58 },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconInactive: { opacity: 0.72 },
  methodCopy: { flex: 1, gap: 5 },
  methodTitle: { fontSize: 16, fontWeight: '700', color: Colors.dark },
  methodTitleInactive: { color: Colors.muted },
  methodBody: { fontSize: 13, color: Colors.muted, lineHeight: 18 },
  methodBodyInactive: { color: Colors.mutedLight },
  methodArrow: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodArrowInactive: {
    backgroundColor: Colors.surfaceAlt,
    opacity: 0.85,
  },

  activeCard: {
    padding: 20,
    gap: 16,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  activeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCopy: { flex: 1, gap: 2 },
  activeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeTitle: { fontSize: 18, fontWeight: '800', color: Colors.dark },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  activeSub: { fontSize: 13, color: Colors.muted },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  methodChipIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodChipText: { fontSize: 15, fontWeight: '700', color: Colors.dark },
  switchNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    borderRadius: Radius.md,
    padding: 14,
  },
  switchNoteText: {
    flex: 1,
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 18,
  },
  dangerOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: Radius.lg,
    paddingVertical: 13,
    backgroundColor: Colors.errorLight,
  },
  dangerOutlineText: { fontSize: 14, fontWeight: '700', color: Colors.error },

  flowCard: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    gap: 16,
  },
  authCard: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
    gap: 20,
  },
  authStepBlock: {
    gap: 10,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  stepLabelSpaced: {
    marginTop: 4,
  },
  stepHint: {
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 18,
  },
  qrFrame: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  qrInner: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.18)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  qrImage: {
    width: 168,
    height: 168,
    borderRadius: 6,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  orText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(124, 58, 237, 0.55)',
    letterSpacing: 0.2,
  },
  keyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.22)',
    borderRadius: 14,
    backgroundColor: Colors.primaryMuted,
    paddingLeft: 14,
    paddingRight: 6,
    minHeight: 50,
    gap: 8,
  },
  keyInputText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#5B21B6',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  keyCopyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 2,
  },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backLinkText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  stepBadge: { alignSelf: 'center' },
  stepBadgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepHeader: { alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  stepTitle: { fontSize: 20, fontWeight: '800', color: Colors.dark, textAlign: 'center' },
  stepSubtitle: { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 19 },

  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  resendText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  emptyCard: { alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.dark },
  emptyText: { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 18 },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primaryMuted,
  },
  retryText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  tipsCard: {
    backgroundColor: Colors.white,
    padding: 18,
    gap: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  tipIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: { flex: 1, fontSize: 13, color: Colors.muted, lineHeight: 18 },
  tipDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderSubtle,
    marginLeft: 46,
  },

});
