import { useRef, useState, type RefObject } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { api, isResponseSuccess } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores';
import { Colors, Radius, Spacing } from '../../src/theme';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { LoadingOverlay } from '../../src/components/ui/LoadingOverlay';
import { showToast } from '../../src/components/ui/Toast';
import { navigateBack } from '../../src/lib/navigation';
import { hiddenNumericInputStyle } from '../../src/lib/platform-ui';


type Mode = 'change' | 'reset';
type ChangeStep = 'current' | 'new' | 'confirm';
type ResetStep = 'otp' | 'new' | 'confirm';

const CHANGE_STEPS: ChangeStep[] = ['current', 'new', 'confirm'];
const RESET_STEPS: ResetStep[] = ['otp', 'new', 'confirm'];

const CHANGE_COPY: Record<ChangeStep, { title: string; subtitle: string }> = {
  current: { title: 'Current PIN', subtitle: 'Enter your existing 4-digit PIN' },
  new: { title: 'New PIN', subtitle: 'Choose a fresh 4-digit PIN' },
  confirm: { title: 'Confirm PIN', subtitle: 'Re-enter your new PIN to confirm' },
};

const RESET_COPY: Record<ResetStep, { title: string; subtitle: string }> = {
  otp: { title: 'Verification code', subtitle: 'Enter the 6-digit code we sent you' },
  new: { title: 'New PIN', subtitle: 'Choose your new 4-digit PIN' },
  confirm: { title: 'Confirm PIN', subtitle: 'Re-enter your new PIN to confirm' },
};

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.length <= 2 ? local[0] : `${local.slice(0, 2)}***`;
  return `${visible}@${domain}`;
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return `***${digits.slice(-4)}`;
}

export default function ChangePinScreen() {
  const { user } = useAuthStore();
  const inputRef = useRef<TextInput>(null);
  const [mode, setMode] = useState<Mode>('change');
  const [changeStep, setChangeStep] = useState<ChangeStep>('current');
  const [resetStep, setResetStep] = useState<ResetStep>('otp');
  const [currentPin, setCurrentPin] = useState('');
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [resetDialogVisible, setResetDialogVisible] = useState(false);

  const step = mode === 'change' ? changeStep : resetStep;
  const steps = mode === 'change' ? CHANGE_STEPS : RESET_STEPS;
  const stepIndex = steps.indexOf(step as ChangeStep & ResetStep);
  const copy = mode === 'change' ? CHANGE_COPY[changeStep] : RESET_COPY[resetStep];

  const activePinValue = step === 'current'
    ? currentPin
    : step === 'new'
      ? newPin
      : step === 'confirm'
        ? confirmPin
        : '';

  const pinsMatch = step === 'confirm' && confirmPin.length === 4 && newPin === confirmPin;
  const pinsMismatch = step === 'confirm' && confirmPin.length === 4 && newPin !== confirmPin;
  const canSubmit = step === 'confirm' && confirmPin.length === 4 && pinsMatch && !saving;

  const otpDestination = user?.email
    ? maskEmail(user.email)
    : user?.phone
      ? maskPhone(user.phone)
      : 'your registered contact';

  const focusInput = () => inputRef.current?.focus();

  const resetForm = (nextMode: Mode = 'change') => {
    setMode(nextMode);
    setChangeStep('current');
    setResetStep('otp');
    setCurrentPin('');
    setOtp('');
    setNewPin('');
    setConfirmPin('');
  };

  const canGoBack = stepIndex > 0 || (mode === 'reset' && resetStep === 'otp');

  const goBackStep = () => {
    if (mode === 'reset' && resetStep === 'otp') {
      resetForm('change');
      return;
    }

    if (mode === 'change') {
      if (changeStep === 'confirm') {
        setConfirmPin('');
        setChangeStep('new');
        return;
      }
      if (changeStep === 'new') {
        setNewPin('');
        setConfirmPin('');
        setChangeStep('current');
      }
      return;
    }

    if (resetStep === 'confirm') {
      setConfirmPin('');
      setResetStep('new');
      return;
    }
    if (resetStep === 'new') {
      setNewPin('');
      setConfirmPin('');
      setResetStep('otp');
    }
  };

  const requestResetOtp = async (): Promise<boolean> => {
    setRequestingOtp(true);
    try {
      const res = await api.requestPinReset();
      if (!isResponseSuccess(res)) throw new Error(res.message || 'Could not send verification code');
      showToast({
        type: 'success',
        text1: 'Code sent',
        text2: `Check ${otpDestination} for your verification code`,
      });
      resetForm('reset');
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not send verification code';
      showToast({ type: 'error', text1: 'Request failed', text2: message });
      return false;
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleForgotPin = () => setResetDialogVisible(true);

  const handleConfirmReset = async () => {
    setResetDialogVisible(false);
    const sent = await requestResetOtp();
    if (!sent) setResetDialogVisible(true);
  };

  const handlePinInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);

    if (mode === 'change') {
      if (changeStep === 'current') {
        setCurrentPin(digits);
        if (digits.length === 4) setTimeout(() => setChangeStep('new'), 220);
        return;
      }
      if (changeStep === 'new') {
        setNewPin(digits);
        if (digits.length === 4) setTimeout(() => setChangeStep('confirm'), 220);
        return;
      }
      setConfirmPin(digits);
      if (digits.length === 4) void handleChangeSave(currentPin, newPin, digits);
      return;
    }

    if (resetStep === 'new') {
      setNewPin(digits);
      if (digits.length === 4) setTimeout(() => setResetStep('confirm'), 220);
      return;
    }
    setConfirmPin(digits);
    if (digits.length === 4) void handleResetSave(otp, newPin, digits);
  };

  const handleOtpInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    if (digits.length === 6) setTimeout(() => setResetStep('new'), 220);
  };

  const handleChangeSave = async (
    current = currentPin,
    next = newPin,
    confirm = confirmPin,
  ) => {
    if (!/^\d{4}$/.test(current) || !/^\d{4}$/.test(next)) {
      showToast({ type: 'error', text1: 'Invalid PIN', text2: 'PIN must be exactly 4 digits' });
      return;
    }
    if (next !== confirm) {
      showToast({ type: 'error', text1: 'PIN mismatch', text2: 'New PIN and confirmation must match' });
      setConfirmPin('');
      focusInput();
      return;
    }
    if (current === next) {
      showToast({ type: 'error', text1: 'Choose a different PIN', text2: 'Your new PIN must differ from the current one' });
      setNewPin('');
      setConfirmPin('');
      setChangeStep('new');
      return;
    }

    setSaving(true);
    try {
      const res = await api.changePin(current, next, confirm);
      if (!isResponseSuccess(res)) throw new Error(res.message || 'Could not change PIN');
      showToast({ type: 'success', text1: 'PIN updated', text2: 'Your transaction PIN has been changed' });
      navigateBack();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not change PIN';
      showToast({ type: 'error', text1: 'Update failed', text2: message });
      resetForm('change');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSave = async (
    code = otp,
    next = newPin,
    confirm = confirmPin,
  ) => {
    if (!/^\d{6}$/.test(code)) {
      showToast({ type: 'error', text1: 'Invalid code', text2: 'Enter the 6-digit verification code' });
      setResetStep('otp');
      return;
    }
    if (!/^\d{4}$/.test(next)) {
      showToast({ type: 'error', text1: 'Invalid PIN', text2: 'PIN must be exactly 4 digits' });
      return;
    }
    if (next !== confirm) {
      showToast({ type: 'error', text1: 'PIN mismatch', text2: 'New PIN and confirmation must match' });
      setConfirmPin('');
      focusInput();
      return;
    }

    setSaving(true);
    try {
      const res = await api.resetPin(code, next, confirm);
      if (!isResponseSuccess(res)) throw new Error(res.message || 'Could not reset PIN');
      showToast({ type: 'success', text1: 'PIN reset', text2: 'Your transaction PIN has been updated' });
      navigateBack();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not reset PIN';
      showToast({ type: 'error', text1: 'Reset failed', text2: message });
      setOtp('');
      setNewPin('');
      setConfirmPin('');
      setResetStep('otp');
    } finally {
      setSaving(false);
    }
  };

  const handlePrimaryAction = () => {
    if (mode === 'change') void handleChangeSave();
    else void handleResetSave();
  };

  const overlayVisible = requestingOtp || saving;

  return (
    <>
    <ProfileSubScreen
      title={mode === 'change' ? 'Change PIN' : 'Reset PIN'}
      subtitle={mode === 'change' ? 'Update your 4-digit transaction PIN' : 'Verify your identity to set a new PIN'}
      footer={step === 'confirm' ? (
        <GradientButton
          title={mode === 'change' ? 'Update PIN' : 'Reset PIN'}
          onPress={handlePrimaryAction}
          inactive={!canSubmit || saving}
          disabled={!canSubmit || saving}
          isLoading={saving}
          size="compact"
          leftIcon={<Ionicons name="shield-checkmark" size={17} color={Colors.white} />}
        />
      ) : undefined}
    >
      <GlassSurface variant="tinted" borderRadius={Radius.lg} contentStyle={styles.securityBanner}>
        <View style={styles.securityIcon}>
          <Ionicons name={mode === 'change' ? 'lock-closed' : 'mail-unread-outline'} size={20} color={Colors.primary} />
        </View>
        <View style={styles.securityCopy}>
          <Text style={styles.securityTitle}>
            {mode === 'change' ? 'Secure your transactions' : 'Identity verification'}
          </Text>
          <Text style={styles.securityBody}>
            {mode === 'change'
              ? 'Your PIN authorizes transfers, airtime, data and other wallet purchases.'
              : `Enter the code sent to ${otpDestination}, then choose a new PIN.`}
          </Text>
        </View>
      </GlassSurface>

      <GlassCard variant="solid" borderRadius={20} padding={0} contentStyle={styles.card}>
        <View style={styles.progressRow}>
          {steps.map((item, index) => (
            <View key={item} style={styles.progressItem}>
              <View style={[
                styles.progressDot,
                index <= stepIndex && styles.progressDotActive,
                index < stepIndex && styles.progressDotDone,
              ]}>
                {index < stepIndex ? (
                  <Ionicons name="checkmark" size={12} color={Colors.white} />
                ) : (
                  <Text style={[styles.progressNum, index <= stepIndex && styles.progressNumActive]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              {index < steps.length - 1 ? (
                <View style={[styles.progressLine, index < stepIndex && styles.progressLineDone]} />
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.toolbar}>
          <View style={styles.toolbarSide}>
            {canGoBack ? (
              <TouchableOpacity style={styles.backPill} onPress={goBackStep} hitSlop={8} activeOpacity={0.8}>
                <Ionicons name="chevron-back" size={18} color={Colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.toolbarCenter}>
            <Text style={styles.stepBadge}>Step {stepIndex + 1} of {steps.length}</Text>
          </View>
          <View style={styles.toolbarSide} />
        </View>

        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>{copy.title}</Text>
          <Text style={styles.stepSubtitle}>{copy.subtitle}</Text>
        </View>

        {mode === 'reset' && resetStep === 'otp' ? (
          <OtpBoxes value={otp} onChange={handleOtpInput} inputRef={inputRef} />
        ) : (
          <TouchableOpacity style={styles.pinWrap} activeOpacity={1} onPress={focusInput}>
            <View style={styles.pinRow}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.pinBox,
                    activePinValue.length > index && styles.pinBoxFilled,
                    pinsMismatch && styles.pinBoxError,
                    pinsMatch && styles.pinBoxSuccess,
                  ]}
                >
                  {activePinValue.length > index ? <View style={styles.pinDot} /> : null}
                </View>
              ))}
            </View>
            <TextInput
              ref={inputRef}
              style={styles.pinInputOverlay}
              value={activePinValue}
              onChangeText={handlePinInput}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              autoFocus
              caretHidden
              pointerEvents="none"
            />
          </TouchableOpacity>
        )}

        {pinsMatch ? (
          <View style={styles.matchRow}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.matchText}>PINs match</Text>
          </View>
        ) : null}

        {pinsMismatch ? (
          <View style={styles.matchRow}>
            <Ionicons name="close-circle" size={16} color={Colors.error} />
            <Text style={styles.mismatchText}>PINs do not match</Text>
          </View>
        ) : null}

        {mode === 'change' && changeStep === 'current' ? (
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={handleForgotPin}
            disabled={requestingOtp}
            activeOpacity={0.8}
          >
            <Ionicons name="help-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.forgotText}>Forgot your PIN?</Text>
          </TouchableOpacity>
        ) : null}

        {mode === 'reset' && resetStep === 'otp' ? (
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => void requestResetOtp()}
            disabled={requestingOtp}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
            <Text style={styles.forgotText}>Resend verification code</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.tapHint}>
          {mode === 'reset' && resetStep === 'otp'
            ? 'Tap the boxes to enter your 6-digit code'
            : 'Tap the boxes to enter your PIN'}
        </Text>
      </GlassCard>

      <View style={styles.tipsCard}>
        <TipRow icon="eye-off-outline" text="Never share your PIN or verification code" />
        <TipRow icon="refresh-outline" text="Use a PIN you do not use on other apps" />
        <TipRow icon="key-outline" text="Required for transfers and service purchases" />
      </View>
    </ProfileSubScreen>

    <ConfirmDialog
      visible={resetDialogVisible && !requestingOtp}
      onClose={() => setResetDialogVisible(false)}
      title="Reset your PIN"
      message={`We will send a 6-digit verification code to ${otpDestination}. You can then set a new transaction PIN.`}
      confirmLabel="Send code"
      onConfirm={() => void handleConfirmReset()}
      icon="mail-unread-outline"
      loading={requestingOtp}
    />

    <LoadingOverlay
      visible={overlayVisible}
      message={
        requestingOtp
          ? 'Sending verification code…'
          : mode === 'change'
            ? 'Updating your PIN…'
            : 'Resetting your PIN…'
      }
      submessage={
        requestingOtp
          ? `Delivering to ${otpDestination}`
          : 'This will only take a moment'
      }
      icon={requestingOtp ? 'mail-outline' : 'shield-checkmark'}
    />
    </>
  );
}

function OtpBoxes({
  value,
  onChange,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  inputRef: RefObject<TextInput>;
}) {
  const digits = value.padEnd(6, ' ').split('').slice(0, 6);
  const activeIndex = Math.min(value.length, 5);

  return (
    <TouchableOpacity style={styles.otpWrap} onPress={() => inputRef.current?.focus()} activeOpacity={1}>
      <View style={styles.otpRow}>
        {digits.map((digit, index) => (
          <View
            key={index}
            style={[
              styles.otpBox,
              value.length === index && styles.otpBoxActive,
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
        onChangeText={onChange}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.pinInputOverlay}
        autoFocus
        caretHidden
        pointerEvents="none"
      />
      <Text style={styles.otpHint}>Digit {activeIndex + 1} of 6</Text>
    </TouchableOpacity>
  );
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
  securityBanner: {
    flexDirection: 'row',
    gap: 12,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityCopy: { flex: 1, gap: 3 },
  securityTitle: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  securityBody: { fontSize: 13, color: Colors.muted, lineHeight: 18 },
  card: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
    gap: 18,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  progressItem: { flexDirection: 'row', alignItems: 'center' },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.borderMid,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  progressDotActive: { borderColor: Colors.primary },
  progressDotDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  progressNum: { fontSize: 12, fontWeight: '700', color: Colors.mutedLight },
  progressNumActive: { color: Colors.primary },
  progressLine: {
    width: 42,
    height: 2,
    backgroundColor: Colors.borderMid,
    marginHorizontal: 6,
  },
  progressLineDone: { backgroundColor: Colors.primary },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  toolbarSide: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  toolbarCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  stepHeader: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  stepTitle: { fontSize: 20, fontWeight: '800', color: Colors.dark, letterSpacing: -0.3, textAlign: 'center' },
  stepSubtitle: { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 18 },
  pinWrap: { position: 'relative', alignItems: 'center', paddingVertical: 8 },
  pinRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  pinBox: {
    width: 56,
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.borderSubtle,
    backgroundColor: '#FAFBFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxFilled: { borderColor: Colors.primary, backgroundColor: '#FAF5FF' },
  pinBoxSuccess: { borderColor: Colors.success, backgroundColor: Colors.successLight },
  pinBoxError: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  pinInputOverlay: hiddenNumericInputStyle,
  otpWrap: { alignItems: 'center', paddingVertical: 8, gap: 10 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, position: 'relative' },
  otpBox: {
    width: 46,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderSubtle,
    backgroundColor: '#FAFBFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: { borderColor: Colors.primary, backgroundColor: '#FAF5FF' },
  otpBoxFilled: { borderColor: Colors.primary },
  otpDigit: { fontSize: 20, fontWeight: '800', color: Colors.dark },
  otpHint: { fontSize: 12, color: Colors.mutedLight },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  matchText: { fontSize: 13, fontWeight: '600', color: Colors.success },
  mismatchText: { fontSize: 13, fontWeight: '600', color: Colors.error },
  forgotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  forgotText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  tapHint: {
    fontSize: 12,
    color: Colors.mutedLight,
    textAlign: 'center',
  },
  tipsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: { flex: 1, fontSize: 13, color: Colors.muted, lineHeight: 18 },
});
