import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ThemeDefinition } from '../../theme/types';
import { AppText } from '../ui/AppText';
import { useColors, useThemeId } from '../../theme/hooks';
import { Radius, Spacing } from '../../theme-legacy';

type ThemePreviewCardProps = {
  theme: ThemeDefinition;
  onSelect: () => void;
  compact?: boolean;
};

export function ThemePreviewCard({ theme, onSelect, compact }: ThemePreviewCardProps) {
  const activeId = useThemeId();
  const colors = useColors();
  const selected = activeId === theme.id;

  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.88}
      style={[
        styles.card,
        compact && styles.cardCompact,
        {
          borderColor: selected ? colors.primary : colors.borderSubtle,
          backgroundColor: colors.card,
        },
        selected && { borderWidth: 2 },
      ]}
    >
      <LinearGradient
        colors={theme.preview}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.swatch}
      >
        {selected ? (
          <View style={[styles.check, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="checkmark" size={14} color={theme.colors.white} />
          </View>
        ) : null}
      </LinearGradient>

      <View style={styles.copy}>
        <AppText variant="smallMed" weight="700" style={{ color: colors.dark }}>
          {theme.label}
        </AppText>
        {!compact ? (
          <AppText variant="caption" style={{ color: colors.muted, marginTop: 2 }}>
            {theme.description}
          </AppText>
        ) : null}
        {theme.isDefault ? (
          <View style={[styles.badge, { backgroundColor: colors.primaryMuted }]}>
            <AppText variant="caption" weight="600" style={{ color: colors.primary }}>Default</AppText>
          </View>
        ) : null}
        {theme.isDarkModeEquivalent ? (
          <View style={[styles.badge, { backgroundColor: colors.primaryMuted }]}>
            <AppText variant="caption" weight="600" style={{ color: colors.primary }}>Dark mode</AppText>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    marginBottom: 10,
  },
  cardCompact: {
    flex: 1,
    minWidth: '46%',
  },
  swatch: {
    height: 56,
    borderRadius: Radius.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 8,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: 4 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
});

type ThemeFamilyRowProps = {
  label: string;
  light: ThemeDefinition;
  dark: ThemeDefinition;
  onSelect: (id: ThemeDefinition['id']) => void;
};

export function ThemeFamilyRow({ label, light, dark, onSelect }: ThemeFamilyRowProps) {
  const colors = useColors();

  return (
    <View style={familyStyles.familyBlock}>
      <AppText variant="smallMed" weight="700" style={{ color: colors.muted, marginBottom: 8 }}>
        {label}
      </AppText>
      <View style={familyStyles.familyRow}>
        <ThemePreviewCard theme={light} onSelect={() => onSelect(light.id)} compact />
        <ThemePreviewCard theme={dark} onSelect={() => onSelect(dark.id)} compact />
      </View>
    </View>
  );
}

const familyStyles = StyleSheet.create({
  familyBlock: { marginBottom: Spacing.md },
  familyRow: { flexDirection: 'row', gap: 10 },
});
