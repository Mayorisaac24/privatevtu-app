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
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProfileSubScreen } from '../../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../../src/components/ui/GlassCard';
import { api, isResponseSuccess } from '../../../src/lib/api';
import {
  disputeStatusColor,
  disputeStatusLabel,
  formatDisputeAgentName,
  type DisputeRecord,
  type DisputeStatus,
} from '../../../src/lib/support';
import { Colors, Radius , Palette, FormColors, BRAND, Overlays, useThemedStyles } from '../../../src/theme';
import { showToast } from '../../../src/components/ui/Toast';

const CLOSED: DisputeStatus[] = ['RESOLVED', 'REJECTED', 'CLOSED'];

export default function DisputeDetailScreen() {
  const styles = useStyles();

  const { id } = useLocalSearchParams<{ id: string }>();
  const [dispute, setDispute] = useState<DisputeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.getDispute(String(id));
      if (isResponseSuccess(res) && res.data) setDispute(res.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const sendMessage = async () => {
    if (!dispute || !message.trim()) return;
    setSending(true);
    try {
      const res = await api.addDisputeMessage(dispute.id, message.trim());
      if (isResponseSuccess(res)) {
        setMessage('');
        await load();
      } else {
        showToast({ type: 'error', text1: 'Failed to send message' });
      }
    } finally {
      setSending(false);
    }
  };

  if (loading || !dispute) {
    return (
      <ProfileSubScreen title="Dispute" subtitle="Loading...">
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      </ProfileSubScreen>
    );
  }

  const isClosed = CLOSED.includes(dispute.status);
  const agentName = formatDisputeAgentName(dispute.assignedTo);

  return (
    <ProfileSubScreen title={dispute.reference} subtitle={disputeStatusLabel(dispute.status)} headerIcon="shield-outline">
      <GlassCard variant="tinted" borderRadius={Radius.lg} padding={14} contentStyle={styles.summary}>
        <View style={[styles.statusPill, { backgroundColor: `${disputeStatusColor(dispute.status)}18` }]}>
          <Text style={[styles.statusText, { color: disputeStatusColor(dispute.status) }]}>
            {disputeStatusLabel(dispute.status)}
          </Text>
        </View>
        {agentName ? (
          <View style={styles.agentRow}>
            <Ionicons name="person-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.agentText}>Handled by {agentName}</Text>
          </View>
        ) : null}
        <Text style={styles.reason}>{dispute.reason.replace(/_/g, ' ')}</Text>
        {dispute.transaction ? (
          <Text style={styles.txMeta}>
            {dispute.transaction.reference} · {dispute.transaction.formattedAmount} · {dispute.transaction.type}
          </Text>
        ) : null}
        {dispute.resolutionNote ? (
          <View style={styles.resolutionBox}>
            <Text style={styles.resolutionLabel}>Resolution</Text>
            <Text style={styles.resolutionText}>{dispute.resolutionNote}</Text>
          </View>
        ) : null}
      </GlassCard>

      <Text style={styles.sectionLabel}>Conversation</Text>
      <View style={styles.thread}>
        {(dispute.messages || []).map((entry) => (
          <View
            key={entry.id}
            style={[
              styles.bubble,
              entry.authorType === 'ADMIN' ? styles.bubbleAdmin : styles.bubbleUser,
            ]}
          >
            <Text style={styles.bubbleMeta}>
              {entry.authorName || (entry.authorType === 'ADMIN' ? 'Support' : 'You')}
            </Text>
            <Text style={styles.bubbleBody}>{entry.body}</Text>
            <Text style={styles.bubbleTime}>
              {new Date(entry.createdAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        ))}
      </View>

      {!isClosed ? (
        <View style={styles.replyBox}>
          <TextInput
            style={styles.replyInput}
            multiline
            placeholder="Add more details for support..."
            placeholderTextColor={Colors.mutedLight}
            value={message}
            onChangeText={setMessage}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={() => void sendMessage()} disabled={sending}>
            {sending ? <ActivityIndicator color={Colors.white} size="small" /> : <Ionicons name="send" size={18} color={Colors.white} />}
          </TouchableOpacity>
        </View>
      ) : (
        <GlassCard contentStyle={styles.closedNote}>
          <Ionicons name="lock-closed-outline" size={16} color={Colors.muted} />
          <Text style={styles.closedText}>This dispute is closed. Open a new dispute if you need further help.</Text>
        </GlassCard>
      )}
    </ProfileSubScreen>
  );
}

const createStyles = (colors: import('../../../src/theme/types').ThemeColors) => StyleSheet.create({
  summary: { gap: 8 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  agentText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  reason: { fontSize: 15, fontWeight: '700', color: colors.dark, textTransform: 'capitalize' },
  txMeta: { fontSize: 12, color: colors.muted },
  resolutionBox: {
    marginTop: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: Overlays.rgba5_150_105_008,
    gap: 4,
  },
  resolutionLabel: { fontSize: 11, fontWeight: '700', color: Palette.emerald600 },
  resolutionText: { fontSize: 13, lineHeight: 19, color: colors.mid },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 12, marginBottom: 8, marginLeft: 2 },
  thread: { gap: 10 },
  bubble: { borderRadius: 16, padding: 12, maxWidth: '92%' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.primaryMuted },
  bubbleAdmin: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderSubtle },
  bubbleMeta: { fontSize: 10, fontWeight: '700', color: colors.muted, marginBottom: 4 },
  bubbleBody: { fontSize: 14, lineHeight: 20, color: colors.dark },
  bubbleTime: { fontSize: 10, color: colors.mutedLight, marginTop: 6 },
  replyBox: { flexDirection: 'row', gap: 8, marginTop: 14, alignItems: 'flex-end' },
  replyInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.dark,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedNote: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 },
  closedText: { flex: 1, fontSize: 12, color: colors.muted, lineHeight: 17 },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
