import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { TransactionLockSheet } from '../../src/components/security/TransactionLockSheet';
import {
  api,
  getErrorMessage,
  isResponseSuccess,
  parseWalletBalanceKobo,
  type UpgradeProgram,
  type UserTypeSnapshot,
  type UserTypeUpgradeRecord,
} from '../../src/lib/api';
import type { TransactionAuthPayload } from '../../src/hooks/useTransactionLockAuth';
import { useWalletStore } from '../../src/stores';
import { Colors, Radius, Spacing } from '../../src/theme';
import { showToast } from '../../src/components/ui/Toast';

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatUpgradeStatus(status: string) {
  switch (status) {
    case 'COMPLETED': return 'Completed';
    case 'FAILED': return 'Failed';
    case 'PENDING': return 'Pending';
    case 'CANCELLED': return 'Cancelled';
    default: return status;
  }
}

export default function ProgramsScreen() {
  const balanceKobo = useWalletStore((s) => s.balance);
  const [loading, setLoading] = useState(true);
  const [currentType, setCurrentType] = useState<UserTypeSnapshot | null>(null);
  const [programs, setPrograms] = useState<UpgradeProgram[]>([]);
  const [history, setHistory] = useState<UserTypeUpgradeRecord[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<UpgradeProgram | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [typeRes, programsRes, historyRes] = await Promise.all([
        api.getMyUserType(),
        api.getUpgradePrograms(),
        api.getUserTypeUpgrades(),
      ]);
      if (isResponseSuccess(typeRes) && typeRes.data) setCurrentType(typeRes.data);
      else if (!isResponseSuccess(typeRes)) {
        showToast({ type: 'error', text1: 'Could not load current plan', text2: typeRes.message });
      }
      if (isResponseSuccess(programsRes) && programsRes.data) setPrograms(programsRes.data);
      if (isResponseSuccess(historyRes) && historyRes.data) setHistory(historyRes.data);
    } catch {
      showToast({ type: 'error', text1: 'Could not load programs' });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleUpgrade = async (auth: TransactionAuthPayload) => {
    if (!selectedProgram) return;
    setProcessing(true);
    try {
      const res = await api.purchaseUserTypeUpgrade({
        pathId: selectedProgram.pathId,
        ...auth,
      });
      if (isResponseSuccess(res)) {
        showToast({
          type: 'success',
          text1: 'Upgrade successful',
          text2: res.message || `You are now on ${selectedProgram.toUserType.name}`,
        });
        setSelectedProgram(null);
        const balRes = await api.getWalletBalance();
        if (isResponseSuccess(balRes)) {
          useWalletStore.getState().setBalance(parseWalletBalanceKobo(balRes.data));
        }
        await load();
      } else {
        showToast({ type: 'error', text1: 'Upgrade failed', text2: res.message });
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      const isInsufficient = /insufficient balance/i.test(message);
      if (isInsufficient) {
        Alert.alert(
          'Insufficient balance',
          message,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Fund wallet', onPress: () => router.push('/wallet/fund') },
          ],
        );
      } else {
        showToast({ type: 'error', text1: 'Upgrade failed', text2: message });
      }
    } finally {
      setProcessing(false);
      setShowAuth(false);
    }
  };

  const startUpgrade = (program: UpgradeProgram) => {
    const priceKobo = BigInt(program.upgradePrice || '0');
    if (priceKobo > 0n && BigInt(balanceKobo || '0') < priceKobo) {
      Alert.alert(
        'Insufficient balance',
        `You need ${formatNaira(program.upgradePriceNaira)} to upgrade. Fund your wallet to continue.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Fund wallet', onPress: () => router.push('/wallet/fund') },
        ],
      );
      return;
    }
    setSelectedProgram(program);
    setShowAuth(true);
  };

  const currentLabel = currentType?.name || currentType?.code || 'Default';

  return (
    <ProfileSubScreen
      title="Programs"
      subtitle="Upgrade your account tier for better pricing"
      headerIcon="ribbon-outline"
    >
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      ) : (
        <View style={styles.stack}>
          <GlassCard variant="solid" borderRadius={Radius.lg} padding={16}>
            <Text style={styles.sectionLabel}>Current plan</Text>
            <Text style={styles.currentName}>{currentLabel}</Text>
            {currentType?.description ? (
              <Text style={styles.currentDesc}>{currentType.description}</Text>
            ) : null}
          </GlassCard>

          <Text style={styles.sectionTitle}>Available upgrades</Text>
          {programs.length === 0 ? (
            <GlassCard variant="solid" borderRadius={Radius.lg} padding={18} contentStyle={styles.emptyCard}>
              <Ionicons name="information-circle-outline" size={28} color={Colors.muted} />
              <Text style={styles.emptyText}>No upgrade programs are available for your account right now.</Text>
            </GlassCard>
          ) : (
            programs.map((program) => (
              <GlassCard key={program.pathId} variant="solid" borderRadius={Radius.lg} padding={16}>
                <View style={styles.programRow}>
                  <View style={styles.programBody}>
                    <Text style={styles.programName}>{program.toUserType.name}</Text>
                    {program.toUserType.description ? (
                      <Text style={styles.programDesc}>{program.toUserType.description}</Text>
                    ) : null}
                    <Text style={styles.programPrice}>
                      {program.upgradePriceNaira > 0
                        ? formatNaira(program.upgradePriceNaira)
                        : 'Free upgrade'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.upgradeBtn}
                    onPress={() => startUpgrade(program)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.upgradeBtnText}>Upgrade</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))
          )}

          {history.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Upgrade history</Text>
              {history.slice(0, 5).map((row) => (
                <GlassCard key={row.id} variant="solid" borderRadius={Radius.lg} padding={14}>
                  <View style={styles.historyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>
                        {row.fromUserType?.name || 'Previous'} → {row.toUserType?.name || 'New tier'}
                      </Text>
                      <Text style={styles.historyMeta}>
                        {new Date(row.createdAt).toLocaleDateString()} · {formatUpgradeStatus(row.status)}
                      </Text>
                      {row.failureReason ? (
                        <Text style={styles.historyFailure}>{row.failureReason}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.historyAmount}>
                      {Number(row.amountPaid) > 0
                        ? formatNaira(Number(row.amountPaid) / 100)
                        : 'Free'}
                    </Text>
                  </View>
                </GlassCard>
              ))}
            </>
          ) : null}
        </View>
      )}

      <TransactionLockSheet
        visible={showAuth}
        onClose={() => {
          if (processing) return;
          setShowAuth(false);
          setSelectedProgram(null);
        }}
        onAuthorized={handleUpgrade}
        title="Confirm upgrade"
        subtitle={
          selectedProgram
            ? `Upgrade to ${selectedProgram.toUserType.name}`
            : 'Authorize this upgrade'
        }
        amount={
          selectedProgram && selectedProgram.upgradePriceNaira > 0
            ? formatNaira(selectedProgram.upgradePriceNaira)
            : undefined
        }
        processing={processing}
        processingMessage="Processing upgrade"
        processingSubmessage="Updating your account tier"
        processingIcon="ribbon-outline"
      />
    </ProfileSubScreen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 24 },
  stack: { gap: Spacing.md },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  currentName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
  },
  currentDesc: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.mid,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.mid,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.mid,
  },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  programBody: { flex: 1, gap: 4 },
  programName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
  },
  programDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.mid,
  },
  programPrice: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  upgradeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  upgradeBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
  historyMeta: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.muted,
  },
  historyFailure: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.error,
    lineHeight: 17,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
});
