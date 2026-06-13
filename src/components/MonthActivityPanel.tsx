import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { GlassCard } from './ui/GlassCard';
import { formatInsightAmount, getServiceTypeLabel, type HomeDashboardStats } from '../lib/transaction-display';


type MonthActivityPanelProps = {
  monthLabel: string;
  stats: HomeDashboardStats;
  loading: boolean;
  balanceVisible: boolean;
  onPress?: () => void;
  embedded?: boolean;
};

export function MonthActivityPanel({
  monthLabel,
  stats,
  loading,
  balanceVisible,
  onPress,
  embedded = false,
}: MonthActivityPanelProps) {
  const successRate = stats.monthTransactionCount
    ? Math.round((stats.monthSuccessfulCount / stats.monthTransactionCount) * 100)
    : 0;
  const topService = getServiceTypeLabel(stats.topServiceType);
  const insightText = stats.monthTransactionCount === 0
    ? 'Your service purchases will show up here'
    : stats.topServiceType
      ? `Most used: ${topService} · ${stats.monthSuccessfulCount} of ${stats.monthTransactionCount} completed`
      : `${stats.monthSuccessfulCount} of ${stats.monthTransactionCount} completed this month`;

  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.icon}>
            <Ionicons name="pulse-outline" size={15} color={Colors.primary} />
          </View>
          <Text style={styles.title}>{monthLabel} overview</Text>
        </View>
        {!embedded ? (
          <View style={styles.link}>
            <Text style={styles.linkText}>History</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </View>
        ) : null}
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            {loading ? '—' : formatInsightAmount(stats.monthServiceSpendKobo, balanceVisible)}
          </Text>
          <Text style={styles.metricLabel}>On services</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, styles.metricValueAccent]}>
            {loading ? '—' : String(stats.monthTransactionCount)}
          </Text>
          <Text style={styles.metricLabel}>Transactions</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, styles.metricValueSuccess]}>
            {loading ? '—' : `${successRate}%`}
          </Text>
          <Text style={styles.metricLabel}>Success</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: loading ? '0%' : `${successRate}%` },
          ]}
        />
      </View>
      <Text style={styles.foot}>{loading ? 'Loading activity…' : insightText}</Text>
    </>
  );

  if (embedded) {
    return (
      <GlassCard borderRadius={20} padding={16} style={styles.panelEmbedded} contentStyle={styles.panelContent}>
        <View style={styles.embeddedAccent} />
        {content}
      </GlassCard>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88}>
      <GlassCard borderRadius={20} padding={16} contentStyle={styles.panelContent}>
        {content}
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  panelContent: {
    gap: 0,
  },
  panelEmbedded: {
    overflow: 'hidden',
  },
  embeddedAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.primary,
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    letterSpacing: -0.2,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.dark,
    letterSpacing: -0.3,
  },
  metricValueAccent: {
    color: Colors.primary,
  },
  metricValueSuccess: {
    color: '#059669',
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: '400',
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  foot: {
    fontSize: 12,
    color: Colors.muted,
    fontWeight: '400',
    lineHeight: 17,
  },
});
