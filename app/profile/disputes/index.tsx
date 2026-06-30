import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProfileSubScreen } from '../../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../../src/components/ui/GlassCard';
import { disputeStatusColor, disputeStatusLabel } from '../../../src/lib/support';
import { useDisputesList } from '../../../src/hooks/useSupportContent';
import { Colors, Radius } from '../../../src/theme';

export default function DisputesListScreen() {
  const { items, loading, refreshing, refresh } = useDisputesList();

  return (
    <ProfileSubScreen
      title="My Disputes"
      subtitle="Track support cases"
      headerIcon="shield-outline"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
      footer={(
        <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/profile/disputes/new')} activeOpacity={0.85}>
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.createBtnText}>New dispute</Text>
        </TouchableOpacity>
      )}
    >
      {loading && items.length === 0 ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
      ) : items.length === 0 ? (
        <GlassCard contentStyle={styles.empty}>
          <Ionicons name="document-outline" size={32} color={Colors.mutedLight} />
          <Text style={styles.emptyTitle}>No disputes yet</Text>
          <Text style={styles.emptySub}>Open a dispute if a transaction did not go as expected.</Text>
        </GlassCard>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              onPress={() => router.push(`/profile/disputes/${item.id}`)}
            >
              <GlassCard variant="light" borderRadius={Radius.lg} padding={14} contentStyle={styles.row}>
                <View style={styles.rowTop}>
                  <Text style={styles.ref}>{item.reference}</Text>
                  <View style={[styles.badge, { backgroundColor: `${disputeStatusColor(item.status)}18` }]}>
                    <Text style={[styles.badgeText, { color: disputeStatusColor(item.status) }]}>
                      {disputeStatusLabel(item.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.reason}>{item.reason.replace(/_/g, ' ')}</Text>
                {item.transaction?.reference ? (
                  <Text style={styles.tx}>Tx: {item.transaction.reference} · {item.transaction.formattedAmount}</Text>
                ) : null}
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ProfileSubScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: { gap: 6 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  ref: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  reason: { fontSize: 13, color: Colors.mid, textTransform: 'capitalize' },
  tx: { fontSize: 12, color: Colors.muted },
  date: { fontSize: 11, color: Colors.mutedLight, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.dark },
  emptySub: { fontSize: 13, color: Colors.muted, textAlign: 'center', paddingHorizontal: 20 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
  },
  createBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
