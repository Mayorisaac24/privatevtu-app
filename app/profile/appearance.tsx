import { View, StyleSheet } from 'react-native';
import { ProfileSubScreen } from '../../src/components/profile/ProfileSubScreen';
import { ThemePreviewCard, ThemeFamilyRow } from '../../src/components/theme/ThemePreviewCard';
import { AppText } from '../../src/components/ui/AppText';
import { GlassCard } from '../../src/components/ui/GlassCard';
import {
  THEME_MAP,
  BRAND_THEME_IDS,
  OTHER_THEME_FAMILIES,
  useTheme,
  useColors,
} from '../../src/theme';
import { Radius, Spacing } from '../../src/theme-legacy';
import { showToast } from '../../src/components/ui/Toast';

export default function AppearanceScreen() {
  const { setThemeId } = useTheme();
  const colors = useColors();

  const selectTheme = async (id: Parameters<typeof setThemeId>[0]) => {
    await setThemeId(id);
    showToast({
      type: 'success',
      text1: 'Theme updated',
      text2: THEME_MAP[id].label,
    });
  };

  const brandThemes = BRAND_THEME_IDS.map((id) => THEME_MAP[id]);

  return (
    <ProfileSubScreen
      title="Appearance"
      subtitle="Choose how PrivateVTU looks on your device"
      headerIcon="color-palette-outline"
    >
      <GlassCard variant="solid" borderRadius={Radius.lg} padding={16} contentStyle={styles.intro}>
        <AppText variant="small" style={{ color: colors.muted, lineHeight: 20 }}>
          Pick your default look and dark mode, or explore other premium color themes. Each theme has light and dark variants.
        </AppText>
      </GlassCard>

      <View style={styles.section}>
        <AppText variant="label" style={{ color: colors.primary, marginBottom: 10 }}>
          PrivateVTU
        </AppText>
        {brandThemes.map((theme) => (
          <ThemePreviewCard
            key={theme.id}
            theme={theme}
            onSelect={() => void selectTheme(theme.id)}
          />
        ))}
      </View>

      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />
        <AppText variant="captionMed" style={{ color: colors.muted }}>Other premium themes</AppText>
        <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />
      </View>

      <View style={styles.section}>
        {OTHER_THEME_FAMILIES.map((family) => {
          const light = THEME_MAP[`${family}-light`];
          const dark = THEME_MAP[`${family}-dark`];
          const label = light.label.replace(/ Light$/, '');
          return (
            <ThemeFamilyRow
              key={family}
              label={label}
              light={light}
              dark={dark}
              onSelect={(id) => void selectTheme(id)}
            />
          );
        })}
      </View>
    </ProfileSubScreen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 4 },
  section: { marginBottom: Spacing.sm },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
