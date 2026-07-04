import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import type { CableProvider } from '../lib/api';
import {
  getCableProviderCode,
  getCableProviderLogo,
  getCableProviderShortName,
  getCableProviderStyle,
} from '../lib/cable-providers';
import {Colors, Typography, Radius, useColors, useThemedStyles } from '../theme';
import { isAndroid } from '../lib/platform-ui';

type CableProviderGridProps = {
  providers: CableProvider[];
  selectedCode: string;
  onSelect: (code: string) => void;
  loading?: boolean;
};

function CableChip({
  provider,
  selected,
  onPress,
  ringSize,
}: {
  provider: CableProvider;
  selected: boolean;
  onPress: () => void;
  ringSize: number;
}) {
  const styles = useStyles();
  const colors = useColors();
  const code = getCableProviderCode(provider);
  const style = getCableProviderStyle(code, {
    bg: Colors.surface,
    border: Colors.borderMid,
    text: Colors.mid,
  });
  const label = getCableProviderShortName(provider);
  const innerSize = ringSize - 6;

  return (
    <TouchableOpacity style={[styles.chip, styles.chipRow]} onPress={onPress} activeOpacity={0.7}>
      <View
        style={[
          styles.logoRing,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderColor: selected ? colors.primary : colors.borderMid,
            backgroundColor: selected ? colors.inputFilled : colors.surfaceAlt,
          },
          selected && styles.logoRingSelected,
        ]}
      >
        <View
          style={[
            styles.logoInner,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: style.bg,
            },
          ]}
        >
          <Image
            source={getCableProviderLogo(provider)}
            style={[
              styles.logo,
              {
                width: ringSize * 0.68,
                height: ringSize * 0.68,
              },
            ]}
            resizeMode="contain"
          />
        </View>
        {selected ? <View style={styles.selectedDot} /> : null}
      </View>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]} numberOfLines={1}>
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

export function CableProviderGrid({
  providers,
  selectedCode,
  onSelect,
  loading = false,
}: CableProviderGridProps) {
  const styles = useStyles();

  const { width: screenWidth } = useWindowDimensions();

  if (loading && providers.length === 0) {
    return (
      <View style={styles.loadRow}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadText}>Loading providers...</Text>
      </View>
    );
  }

  if (providers.length === 0) {
    return <Text style={styles.emptyText}>No cable providers available right now.</Text>;
  }

  const ringSize = resolveRingSize(screenWidth, providers.length);

  return (
    <View style={styles.track}>
      <View style={styles.row}>
        {providers.map((provider) => {
          const code = getCableProviderCode(provider);
          return (
            <CableChip
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

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  track: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  chip: {
    alignItems: 'center',
    gap: 6,
  },
  chipRow: {
    flex: 1,
    minWidth: 0,
    maxWidth: '25%',
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
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 4,
        }),
  },
  logoInner: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {},
  selectedDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
  },
  chipLabel: {
    ...Typography.caption,
    color: colors.muted,
    fontWeight: '500',
    textAlign: 'center',
  },
  chipLabelSelected: {
    color: colors.primary,
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
    color: colors.muted,
  },
  emptyText: {
    ...Typography.small,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 12,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
