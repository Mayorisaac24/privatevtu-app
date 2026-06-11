import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Radius } from '../theme';

type ServiceScreenHeaderProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  balanceLabel?: string;
  onBack: () => void;
};

export function ServiceScreenHeader({
  title,
  subtitle,
  icon,
  iconColor,
  iconBg,
  balanceLabel,
  onBack,
}: ServiceScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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
        <View style={[styles.headerIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSub}>{subtitle}</Text>
        </View>
      </View>

      {balanceLabel ? (
        <View style={styles.balPill}>
          <Ionicons name="wallet-outline" size={11} color={Colors.primaryLight} />
          <Text style={styles.balText}>{balanceLabel}</Text>
        </View>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.page,
    paddingBottom: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
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
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { ...Typography.h3, color: Colors.dark },
  headerSub: { ...Typography.caption, color: Colors.muted },
  headerSpacer: { width: 72 },
  balPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryDeep,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    maxWidth: 120,
  },
  balText: {
    ...Typography.captionMed,
    color: Colors.white,
    flexShrink: 1,
  },
});
