import { useCallback } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientButton } from '../src/components/ui/GradientButton';
import { markOnboardingComplete } from '../src/lib/onboarding';
import { ScreenStatusBar } from '../src/hooks/useStatusBarStyle';
import { Colors, FontFamily, Radius, Spacing } from '../src/theme';

const APP_ICON = require('../assets/icon.png');

const FEATURES = [
  {
    icon: 'phone-portrait-outline' as const,
    title: 'Instant recharge',
    description: 'Buy airtime and data across all Nigerian networks in seconds.',
  },
  {
    icon: 'flash-outline' as const,
    title: 'Pay bills easily',
    description: 'Electricity, cable TV, education, and more from one wallet.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Secure wallet',
    description: 'Fund, track, and manage transactions with bank-grade security.',
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();

  const finishOnboarding = useCallback(async () => {
    await markOnboardingComplete();
    router.replace('/auth/login');
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <ScreenStatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <Image source={APP_ICON} style={styles.icon} resizeMode="contain" accessibilityLabel="Datamart" />
            <Text style={styles.brandName}>Datamart</Text>
          </View>
          <TouchableOpacity
            onPress={() => void finishOnboarding()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Text style={styles.headline}>Your all-in-one{'\n'}VTU platform</Text>
          <Text style={styles.subhead}>
            Recharge, pay bills, and manage your wallet — fast, simple, and secure.
          </Text>
        </View>

        <View style={styles.featureList}>
          {FEATURES.map((feature) => (
            <View key={feature.title} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={feature.icon} size={22} color={Colors.primary} />
              </View>
              <View style={styles.featureCopy}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <GradientButton title="Get started" onPress={() => void finishOnboarding()} />
        <Text style={styles.footerNote}>Secure · Encrypted · Always on</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    letterSpacing: -0.2,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.muted,
    fontFamily: FontFamily.medium,
  },
  hero: {
    marginBottom: Spacing.xl,
    gap: 10,
  },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.dark,
    lineHeight: 38,
    letterSpacing: -0.6,
    fontFamily: FontFamily.bold,
  },
  subhead: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.muted,
    fontFamily: FontFamily.regular,
  },
  featureList: {
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    fontFamily: FontFamily.semibold,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.muted,
    fontFamily: FontFamily.regular,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    gap: 12,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.mutedLight,
    fontFamily: FontFamily.medium,
  },
});
