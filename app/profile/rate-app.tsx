import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { api, isResponseSuccess } from '../../src/lib/api';
import { type SupportConfig } from '../../src/lib/support';
import { APP_NAME } from '../../src/lib/brand';
import {Colors, Radius, StarRatingColor, useThemedStyles } from '../../src/theme';
import { showToast } from '../../src/components/ui/Toast';

export default function RateAppScreen() {
  const styles = useStyles();

  const [config, setConfig] = useState<SupportConfig | null>(null);

  useEffect(() => {
    void api.getSupportConfig().then((res) => {
      if (isResponseSuccess(res) && res.data) setConfig(res.data);
    });
  }, []);

  const storeUrl = Platform.OS === 'ios' ? config?.appStoreUrl : config?.playStoreUrl;
  const storeLabel = Platform.OS === 'ios' ? 'App Store' : 'Google Play';

  const openStore = async () => {
    if (storeUrl) {
      const can = await Linking.canOpenURL(storeUrl);
      if (can) {
        await Linking.openURL(storeUrl);
        return;
      }
    }
    showToast({
      type: 'info',
      text1: 'Thank you!',
      text2: `We appreciate your support. ${storeLabel} link will be available soon.`,
    });
  };

  return (
    <ProfileSubScreen title="Rate the App" subtitle="Share your experience" headerIcon="star-outline">
      <GlassCard variant="tinted" borderRadius={Radius.xl} padding={24} contentStyle={styles.hero}>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Ionicons key={n} name="star" size={28} color={StarRatingColor} />
          ))}
        </View>
        <Text style={styles.heroTitle}>Enjoying {APP_NAME}?</Text>
        <Text style={styles.heroSub}>
          Your rating helps us improve and reach more users. It only takes a few seconds.
        </Text>
      </GlassCard>

      <TouchableOpacity style={styles.primaryBtn} onPress={() => void openStore()} activeOpacity={0.85}>
        <Ionicons name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-google-playstore'} size={20} color={Colors.white} />
        <Text style={styles.primaryBtnText}>Rate on {storeLabel}</Text>
      </TouchableOpacity>

      <View style={styles.perks}>
        <Perk icon="flash-outline" text="Faster feature updates driven by user feedback" />
        <Perk icon="shield-checkmark-outline" text="Helps new users trust a verified app" />
        <Perk icon="heart-outline" text={`Supports the team building ${APP_NAME}`} />
      </View>
    </ProfileSubScreen>
  );
}

function Perk({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const styles = useStyles();

  return (
    <View style={styles.perkRow}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <Text style={styles.perkText}>{text}</Text>
    </View>
  );
}

const createStyles = (colors: import('../../src/theme/types').ThemeColors) => StyleSheet.create({
  hero: { alignItems: 'center', gap: 10 },
  stars: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  heroSub: { fontSize: 14, lineHeight: 21, color: colors.muted, textAlign: 'center' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 15,
    marginTop: 8,
  },
  primaryBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  perks: {
    marginTop: 20,
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  perkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  perkText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.mid },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
