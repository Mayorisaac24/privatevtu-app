import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import type { EducationProvider } from '../lib/api';
import {
  getEducationProviderCode,
  getEducationProviderShortName,
} from '../lib/education-providers';
import { EducationProviderLogo } from './EducationProviderLogo';
import { Colors, Typography, Radius } from '../theme';
import { isAndroid } from '../lib/platform-ui';

type EducationProviderGridProps = {
  providers: EducationProvider[];
  selectedCode: string;
  onSelect: (code: string) => void;
  loading?: boolean;
};

function EducationChip({
  provider,
  selected,
  onPress,
  ringSize,
}: {
  provider: EducationProvider;
  selected: boolean;
  onPress: () => void;
  ringSize: number;
}) {
  const code = getEducationProviderCode(provider);
  const label = getEducationProviderShortName(provider);
  const innerSize = ringSize - 6;
  const logoSize = innerSize - 4;

  return (
    <TouchableOpacity style={[styles.chip, styles.chipRow]} onPress={onPress} activeOpacity={0.7}>
      <View
        style={[
          styles.logoRing,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderColor: selected ? Colors.primary : Colors.borderMid,
            backgroundColor: selected ? Colors.primaryMuted : Colors.white,
          },
          selected && styles.logoRingSelected,
        ]}
      >
        <EducationProviderLogo provider={provider} size={logoSize} />
        {selected ? <View style={styles.selectedDot} /> : null}
      </View>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function resolveRingSize(screenWidth: number, count: number): number {
  const horizontalInset = 32 + 36 + 20;
  const gaps = 6 * Math.max(count - 1, 0);
  const slotWidth = (screenWidth - horizontalInset - gaps) / Math.max(count, 1);
  const computed = Math.floor(slotWidth - 2);
  const maxSize = isAndroid ? 56 : 60;
  const minSize = isAndroid ? 46 : 50;
  return Math.min(maxSize, Math.max(minSize, computed));
}

export function EducationProviderGrid({
  providers,
  selectedCode,
  onSelect,
  loading = false,
}: EducationProviderGridProps) {
  const { width: screenWidth } = useWindowDimensions();

  if (loading && providers.length === 0) {
    return (
      <View style={styles.loadRow}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadText}>Loading exam bodies...</Text>
      </View>
    );
  }

  if (providers.length === 0) {
    return <Text style={styles.emptyText}>No exam bodies available right now.</Text>;
  }

  const ringSize = resolveRingSize(screenWidth, providers.length);

  return (
    <View style={styles.track}>
      <View style={styles.row}>
        {providers.map((provider) => {
          const code = getEducationProviderCode(provider);
          return (
            <EducationChip
              key={provider.id}
              provider={provider}
              selected={selectedCode === code}
              onPress={() => onSelect(code)}
              ringSize={ringSize}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
    flexWrap: 'wrap',
  },
  chip: {
    alignItems: 'center',
    gap: 6,
  },
  chipRow: {
    flex: 1,
    minWidth: '30%',
    maxWidth: '33%',
  },
  logoRing: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoRingSelected: {
    borderWidth: 2,
    ...(isAndroid
      ? { elevation: 2 }
      : {
          shadowColor: Colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 4,
        }),
  },
  selectedDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  chipLabel: {
    ...Typography.caption,
    color: Colors.muted,
    fontWeight: '500',
    textAlign: 'center',
  },
  chipLabelSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  loadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  loadText: {
    ...Typography.small,
    color: Colors.muted,
  },
  emptyText: {
    ...Typography.small,
    color: Colors.muted,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
