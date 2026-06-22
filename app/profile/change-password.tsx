import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { LoadingOverlay } from '../../src/components/ui/LoadingOverlay';
import { api, isResponseSuccess } from '../../src/lib/api';
import { Colors, Radius, Spacing } from '../../src/theme';
import { useGradients } from '../../src/theme/hooks';
import { gradientStops } from '../../src/theme/gradient-utils';
import { showToast } from '../../src/components/ui/Toast';
import { navigateBack } from '../../src/lib/navigation';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

type Step = 'current' | 'new' | 'confirm';

const STEPS: Step[] = ['current', 'new', 'confirm'];

const STEP_COPY: Record<Step, { title: string; subtitle: string }> = {
  current: { title: 'Current password', subtitle: 'Enter the password you use to sign in' },
  new: { title: 'New password', subtitle: 'Create a strong password for your account' },
  confirm: { title: 'Confirm password', subtitle: 'Re-enter your new password to confirm' },
};

type Requirement = { key: string; label: string; met: boolean };

function getRequirements(password: string): Requirement[] {
  return [
    { key: 'length', label: '8+ characters', met: password.length >= 8 },
    { key: 'upper', label: 'Uppercase', met: /[A-Z]/.test(password) },
    { key: 'lower', label: 'Lowercase', met: /[a-z]/.test(password) },
    { key: 'number', label: 'Number', met: /\d/.test(password) },
    { key: 'special', label: 'Special char', met: /[@$!%*?&]/.test(password) },
  ];
}

function strengthMeta(password: string) {
  const score = getRequirements(password).filter((item) => item.met).length;
  if (score <= 2) return { label: 'Weak', color: Colors.error };
  if (score === 3) return { label: 'Fair', color: Colors.warning };
  if (score === 4) return { label: 'Good', color: Colors.primary };
  return { label: 'Strong', color: Colors.success };
}

export default function ChangePasswordScreen() {
  const gradients = useGradients();
  const [step, setStep] = useState<Step>('current');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const copy = STEP_COPY[step];
  const requirements = useMemo(() => getRequirements(newPassword), [newPassword]);
  const strength = strengthMeta(newPassword);
  const metCount = requirements.filter((item) => item.met).length;
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const canContinue = step === 'current'
    ? currentPassword.length > 0
    : step === 'new'
      ? PASSWORD_PATTERN.test(newPassword)
      : passwordsMatch && !saving;

  const goBack = () => {
    if (step === 'confirm') {
      setConfirmPassword('');
      setStep('new');
      return;
    }
    if (step === 'new') {
      setNewPassword('');
      setConfirmPassword('');
      setStep('current');
    }
  };

  const handleContinue = () => {
    if (step === 'current') {
      if (!currentPassword) {
        showToast({ type: 'error', text1: 'Required', text2: 'Enter your current password' });
        return;
      }
      setStep('new');
      return;
    }
    if (step === 'new') {
      if (!PASSWORD_PATTERN.test(newPassword)) {
        showToast({ type: 'error', text1: 'Weak password', text2: 'Meet all requirements to continue' });
        return;
      }
      if (currentPassword === newPassword) {
        showToast({ type: 'error', text1: 'Choose a different password', text2: 'New password must differ from current' });
        return;
      }
      setStep('confirm');
      return;
    }
    void handleSave();
  };

  const handleSave = async () => {
    if (!PASSWORD_PATTERN.test(newPassword) || newPassword !== confirmPassword) return;

    setSaving(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword, confirmPassword);
      if (!isResponseSuccess(res)) throw new Error(res.message || 'Could not change password');
      showToast({ type: 'success', text1: 'Password updated', text2: 'Your login password has been changed' });
      navigateBack();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not change password';
      showToast({ type: 'error', text1: 'Update failed', text2: message });
      if (/current password/i.test(message)) {
        setConfirmPassword('');
        setNewPassword('');
        setCurrentPassword('');
        setStep('current');
      } else {
        setConfirmPassword('');
        setStep('confirm');
      }
    } finally {
      setSaving(false);
    }
  };

  const footerLabel = step === 'confirm' ? 'Update password' : 'Continue';
  const footerIcon = step === 'confirm' ? 'shield-checkmark' : 'arrow-forward';

  return (
    <>
      <ProfileSubScreen
        title="Change Password"
        subtitle="Keep your login credentials secure"
        footer={(
          <GradientButton
            title={footerLabel}
            onPress={handleContinue}
            inactive={!canContinue}
            disabled={!canContinue}
            size="compact"
            rightIcon={<Ionicons name={footerIcon} size={17} color={Colors.white} />}
          />
        )}
      >
        <GlassSurface variant="tinted" borderRadius={Radius.lg} contentStyle={styles.securityBanner}>
          <View style={styles.securityIcon}>
            <Ionicons name="lock-closed" size={20} color={Colors.primary} />
          </View>
          <View style={styles.securityCopy}>
            <Text style={styles.securityTitle}>Account security</Text>
            <Text style={styles.securityBody}>
              Your login password is separate from your 4-digit transaction PIN.
            </Text>
          </View>
        </GlassSurface>

        <GlassCard variant="solid" borderRadius={20} padding={0} contentStyle={styles.card}>
          <LinearGradient
            colors={gradientStops([gradients.header[1], gradients.header[0]])}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.cardHero}
          />

          <View style={styles.progressRow}>
            {STEPS.map((item, index) => (
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
                {index < STEPS.length - 1 ? (
                  <View style={[styles.progressLine, index < stepIndex && styles.progressLineDone]} />
                ) : null}
              </View>
            ))}
          </View>

          <View style={styles.toolbar}>
            <View style={styles.toolbarSide}>
              {stepIndex > 0 ? (
                <TouchableOpacity style={styles.backPill} onPress={goBack} hitSlop={8} activeOpacity={0.8}>
                  <Ionicons name="chevron-back" size={18} color={Colors.primary} />
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={styles.toolbarCenter}>
              <Text style={styles.stepBadge}>Step {stepIndex + 1} of {STEPS.length}</Text>
            </View>
            <View style={styles.toolbarSide} />
          </View>

          <View style={styles.stepHeader}>
            <Text style={styles.stepTitle}>{copy.title}</Text>
            <Text style={styles.stepSubtitle}>{copy.subtitle}</Text>
          </View>

          {step === 'current' ? (
            <PasswordField
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              icon="lock-closed-outline"
              autoFocus
            />
          ) : null}

          {step === 'new' ? (
            <>
              <PasswordField
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Create a new password"
                icon="sparkles-outline"
                autoFocus
              />

              {newPassword.length > 0 ? (
                <View style={styles.strengthBlock}>
                  <View style={styles.strengthHead}>
                    <Text style={styles.strengthTitle}>Password strength</Text>
                    <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                  </View>
                  <View style={styles.strengthTrack}>
                    {[0, 1, 2, 3, 4].map((index) => (
                      <View
                        key={index}
                        style={[
                          styles.strengthSegment,
                          index < metCount && { backgroundColor: strength.color },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.requirementGrid}>
                {requirements.map((item) => (
                  <View
                    key={item.key}
                    style={[styles.requirementChip, item.met && styles.requirementChipMet]}
                  >
                    <Ionicons
                      name={item.met ? 'checkmark-circle' : 'ellipse-outline'}
                      size={13}
                      color={item.met ? Colors.success : Colors.mutedLight}
                    />
                    <Text style={[styles.requirementText, item.met && styles.requirementMet]}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {step === 'confirm' ? (
            <>
              <PasswordField
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                icon="shield-checkmark-outline"
                autoFocus
              />

              {passwordsMatch ? (
                <View style={styles.matchRow}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.matchText}>Passwords match</Text>
                </View>
              ) : null}

              {passwordsMismatch ? (
                <View style={styles.matchRow}>
                  <Ionicons name="close-circle" size={16} color={Colors.error} />
                  <Text style={styles.mismatchText}>Passwords do not match</Text>
                </View>
              ) : null}
            </>
          ) : null}
        </GlassCard>

        <View style={styles.tipsCard}>
          <TipRow icon="eye-off-outline" text="Never share your password with anyone" />
          <TipRow icon="refresh-outline" text="Use a password you do not reuse on other apps" />
          <TipRow icon="finger-print-outline" text="Login password and transaction PIN are different" />
        </View>
      </ProfileSubScreen>

      <LoadingOverlay
        visible={saving}
        message="Updating your password…"
        submessage="Securing your account"
        icon="shield-checkmark"
      />
    </>
  );
}

function PasswordField({
  value,
  onChangeText,
  placeholder,
  icon,
  autoFocus,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.fieldWrap, focused && styles.fieldWrapFocused]}>
      <View style={styles.fieldIcon}>
        <Ionicons name={icon} size={18} color={focused ? Colors.primary : Colors.muted} />
      </View>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.mutedLight}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <TouchableOpacity onPress={() => setShow((prev) => !prev)} style={styles.eyeBtn} hitSlop={8}>
        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.muted} />
      </TouchableOpacity>
    </View>
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
    paddingTop: 0,
    paddingBottom: 24,
    gap: 16,
    overflow: 'hidden',
  },
  cardHero: {
    height: 6,
    marginHorizontal: -20,
    marginBottom: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginTop: 14,
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
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.borderSubtle,
    borderRadius: 16,
    backgroundColor: '#FAFBFC',
    paddingHorizontal: 14,
    minHeight: 56,
  },
  fieldWrapFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#FAF5FF',
  },
  fieldIcon: {
    marginRight: 10,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark,
    paddingVertical: 14,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  strengthBlock: {
    gap: 8,
    marginTop: -4,
  },
  strengthHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  strengthTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  strengthTrack: {
    flexDirection: 'row',
    gap: 6,
  },
  strengthSegment: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: Colors.borderMid,
  },
  requirementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -4,
  },
  requirementChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  requirementChipMet: {
    backgroundColor: Colors.successLight,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  requirementText: {
    fontSize: 12,
    color: Colors.mutedLight,
    fontWeight: '500',
  },
  requirementMet: {
    color: Colors.successDark,
    fontWeight: '600',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: -4,
  },
  matchText: { fontSize: 13, fontWeight: '600', color: Colors.success },
  mismatchText: { fontSize: 13, fontWeight: '600', color: Colors.error },
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
