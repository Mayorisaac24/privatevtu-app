import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProfileSubScreen } from '../../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../../src/components/ui/GlassCard';
import { api, isResponseSuccess } from '../../../src/lib/api';
import { DISPUTE_REASONS, type DisputeReason } from '../../../src/lib/support';
import { Colors, Radius } from '../../../src/theme';
import { showToast } from '../../../src/components/ui/Toast';
import { useNotificationsStore } from '../../../src/stores/notifications-store';

export default function NewDisputeScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId?: string }>();
  const [reason, setReason] = useState<DisputeReason>('NOT_RECEIVED');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState<{ allowed: boolean; reason?: string } | null>(null);

  useEffect(() => {
    if (!transactionId) return;
    void api.getDisputeEligibility(String(transactionId)).then((res) => {
      if (isResponseSuccess(res) && res.data) setEligibility(res.data);
    });
  }, [transactionId]);

  const submit = useCallback(async () => {
    if (description.trim().length < 10) {
      showToast({ type: 'error', text1: 'Description required', text2: 'Please provide at least 10 characters.' });
      return;
    }
    if (transactionId && eligibility && !eligibility.allowed) {
      showToast({ type: 'error', text1: 'Cannot dispute', text2: eligibility.reason });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createDispute({
        transactionId: transactionId ? String(transactionId) : undefined,
        reason,
        description: description.trim(),
      });
      if (isResponseSuccess(res) && res.data) {
        const { invalidateDisputesCache } = await import('../../../src/lib/support-cache');
        invalidateDisputesCache();
        const { fetchNotifications, fetchUnreadCount } = useNotificationsStore.getState();
        void fetchNotifications({ refresh: true, page: 1 });
        void fetchUnreadCount();
        showToast({ type: 'success', text1: 'Dispute submitted', text2: res.data.reference });
        router.replace(`/profile/disputes/${res.data.id}`);
      } else {
        showToast({ type: 'error', text1: 'Failed', text2: res.message || 'Could not create dispute' });
      }
    } finally {
      setSubmitting(false);
    }
  }, [description, eligibility, reason, transactionId]);

  return (
    <ProfileSubScreen
      title="Open Dispute"
      subtitle={transactionId ? 'Linked to transaction' : 'General support case'}
      headerIcon="alert-circle-outline"
      footer={(
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={() => void submit()}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? <ActivityIndicator color={Colors.white} /> : (
            <>
              <Ionicons name="paper-plane" size={18} color={Colors.white} />
              <Text style={styles.submitText}>Submit dispute</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    >
      {transactionId && eligibility && !eligibility.allowed ? (
        <GlassCard variant="light" contentStyle={styles.warnCard}>
          <Ionicons name="warning-outline" size={20} color="#D97706" />
          <Text style={styles.warnText}>{eligibility.reason}</Text>
        </GlassCard>
      ) : null}

      <Text style={styles.label}>What went wrong?</Text>
      <View style={styles.reasonList}>
        {DISPUTE_REASONS.map((entry) => {
          const active = reason === entry.value;
          return (
            <TouchableOpacity key={entry.value} onPress={() => setReason(entry.value)} activeOpacity={0.85}>
              <GlassCard variant={active ? 'tinted' : 'light'} borderRadius={Radius.lg} padding={12} contentStyle={styles.reasonRow}>
                <View style={[styles.radio, active && styles.radioActive]} />
                <View style={styles.reasonBody}>
                  <Text style={styles.reasonTitle}>{entry.label}</Text>
                  <Text style={styles.reasonHint}>{entry.hint}</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Describe the issue</Text>
      <TextInput
        style={styles.textarea}
        multiline
        textAlignVertical="top"
        placeholder="Include what you expected, what happened, and any reference numbers..."
        placeholderTextColor={Colors.mutedLight}
        value={description}
        onChangeText={setDescription}
        maxLength={1000}
      />
      <Text style={styles.hint}>{description.length}/1000 · minimum 10 characters</Text>
    </ProfileSubScreen>
  );
}

const styles = StyleSheet.create({
  warnCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 },
  warnText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.muted, marginTop: 8, marginBottom: 8, marginLeft: 2 },
  reasonList: { gap: 8 },
  reasonRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.borderSubtle,
    marginTop: 2,
  },
  radioActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  reasonBody: { flex: 1, gap: 2 },
  reasonTitle: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  reasonHint: { fontSize: 12, color: Colors.muted, lineHeight: 17 },
  textarea: {
    minHeight: 140,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.white,
    padding: 14,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.dark,
  },
  hint: { fontSize: 11, color: Colors.mutedLight, marginTop: 6, marginLeft: 2 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
