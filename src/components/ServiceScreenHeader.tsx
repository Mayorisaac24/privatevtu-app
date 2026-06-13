import { ReactNode } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow } from '../theme';
import { useGradients } from '../theme/hooks';
import { gradientStops } from '../theme/gradient-utils';
import { useLayout } from '../lib/platform-ui';
import { AppText } from './ui/AppText';
import { ServiceStepProgress } from './purchase/ServicePurchaseUi';

type ServiceScreenHeaderProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  balanceLabel?: string;
  onBack: () => void;
  stepProgress?: {
    activeIndex: number;
    labels: string[];
  };
  footer?: ReactNode;
};

export function ServiceScreenHeader({
  title,
  subtitle,
  icon,
  balanceLabel,
  onBack,
  stepProgress,
  footer,
}: ServiceScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { pagePadding } = useLayout();
  const gradients = useGradients();

  return (
    <LinearGradient
      colors={gradientStops(gradients.header)}
      style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
    >
      <View style={[styles.header, { paddingHorizontal: pagePadding }]}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.dark} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <LinearGradient colors={gradientStops(gradients.primary)} style={styles.headerIcon}>
            <Ionicons name={icon} size={18} color={Colors.white} />
          </LinearGradient>
          <View style={styles.headerText}>
            <AppText variant="h4" style={{ color: Colors.dark, fontWeight: '700' }}>{title}</AppText>
            <AppText variant="caption" style={{ color: Colors.muted }}>{subtitle}</AppText>
          </View>
        </View>

        {balanceLabel ? (
          <View style={styles.balPill}>
            <Ionicons name="wallet-outline" size={11} color={Colors.primaryLight} />
            <AppText variant="captionMed" style={{ color: Colors.white, flexShrink: 1 }}>{balanceLabel}</AppText>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {stepProgress ? (
        <ServiceStepProgress activeIndex={stepProgress.activeIndex} labels={stepProgress.labels} />
      ) : null}

      {footer}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    ...Shadow.xs,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerSpacer: {
    width: 72,
  },
  balPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryDeep,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: Radius.full,
    maxWidth: 120,
  },
});
