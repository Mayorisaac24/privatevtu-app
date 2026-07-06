import { ReactNode } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {Colors, Spacing , Overlays, useThemedStyles } from '../theme';
import { useColors, useGradients } from '../theme/hooks';
import { gradientStops } from '../theme/gradient-utils';
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
  balanceLabel,
  onBack,
  stepProgress,
  footer,
}: ServiceScreenHeaderProps) {
  const styles = useStyles();

  const insets = useSafeAreaInsets();
  const gradients = useGradients();
  const colors = useColors();

  return (
    <>
      <LinearGradient
        colors={gradientStops(gradients.hero)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, stepProgress ? styles.headerWithSteps : null, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerBlob1} />
        <View style={styles.headerBlob2} />

        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSub}>{subtitle}</Text>
          </View>

          {balanceLabel ? (
            <View style={styles.balPill}>
              <Text style={styles.balLabel}>Balance</Text>
              <Text style={styles.balText} numberOfLines={1}>
                {balanceLabel}
              </Text>
            </View>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {stepProgress ? (
          <View style={styles.stepProgressWrap}>
            <ServiceStepProgress
              activeIndex={stepProgress.activeIndex}
              labels={stepProgress.labels}
              variant="hero"
            />
          </View>
        ) : null}

        {footer}
      </LinearGradient>

      <View
        style={[
          styles.contentCurve,
          stepProgress ? styles.contentCurveWithSteps : null,
          { backgroundColor: colors.pageBg },
        ]}
      />
    </>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.page,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  headerWithSteps: {
    paddingBottom: 24,
  },
  stepProgressWrap: {
    zIndex: 2,
  },
  headerBlob1: {
    position: 'absolute',
    top: -20,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Overlays.white06,
  },
  headerBlob2: {
    position: 'absolute',
    bottom: 24,
    left: -16,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Overlays.rgba255_255_255_004,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Overlays.white12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Overlays.white08,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 13,
    color: Overlays.white68,
    marginTop: 3,
  },
  headerSpacer: {
    width: 72,
  },
  balPill: {
    alignItems: 'flex-end',
    backgroundColor: Overlays.white12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Overlays.white10,
    maxWidth: 120,
  },
  balLabel: {
    fontSize: 10,
    color: Overlays.white55,
    fontWeight: '600',
  },
  balText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  contentCurve: {
    height: 22,
    marginTop: -22,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  contentCurveWithSteps: {
    marginTop: -20,
  },
});

/** Extra top inset for scroll content below {@link ServiceScreenHeader} step pills. */
export const SERVICE_SCROLL_TOP_INSET = 4;

function useStyles() {
  return useThemedStyles(createStyles);
}
