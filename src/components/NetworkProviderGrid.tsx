import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import type { AirtimeProvider } from '../lib/api';
import {
  getProviderCode,
  getProviderShortName,
} from '../lib/providers';
import { NetworkProviderLogo } from './NetworkProviderLogo';
import {Colors, Typography, Radius, useColors, useThemedStyles } from '../theme';
import { isAndroid } from '../lib/platform-ui';

type NetworkProviderGridProps = {
  providers: AirtimeProvider[];
  selectedCode: string;
  onSelect: (code: string) => void;
  loading?: boolean;
};

function ProviderChip({
  provider,
  selected,
  onPress,
  ringSize,
  layout,
}: {
  provider: AirtimeProvider;
  selected: boolean;
  onPress: () => void;
  ringSize: number;
  layout: 'row' | 'scroll';
}) {
  const styles = useStyles();
  const colors = useColors();
  const code = getProviderCode(provider);
  const label = getProviderShortName(provider);
  const innerSize = ringSize - 6;

  return (
    <TouchableOpacity
      style={[styles.chip, layout === 'scroll' ? styles.chipScroll : styles.chipRow]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.logoRing,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderColor: selected ? colors.primary : colors.borderMid,
          },
          selected && styles.logoRingSelected,
        ]}
      >
        <NetworkProviderLogo provider={provider} size={innerSize} />
        {selected ? <View style={styles.selectedDot} /> : null}
      </View>
      <Text
        style={[styles.chipLabel, selected && styles.chipLabelSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function resolveRingSize(screenWidth: number, count: number, scroll: boolean): number {
  if (scroll) return isAndroid ? 54 : 58;

  const horizontalInset = 32 + 36 + 20;
  const gaps = 6 * Math.max(count - 1, 0);
  const slotWidth = (screenWidth - horizontalInset - gaps) / Math.max(count, 1);
  const computed = Math.floor(slotWidth - 2);
  const maxSize = isAndroid ? 56 : 60;
  const minSize = isAndroid ? 46 : 50;
  return Math.min(maxSize, Math.max(minSize, computed));
}

export function NetworkProviderGrid({
  providers,
  selectedCode,
  onSelect,
  loading = false,
}: NetworkProviderGridProps) {
  const styles = useStyles();

  const { width: screenWidth } = useWindowDimensions();

  if (loading && providers.length === 0) {
    return (
      <View style={styles.loadRow}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadText}>Loading networks...</Text>
      </View>
    );
  }

  if (providers.length === 0) {
    return <Text style={styles.emptyText}>No enabled providers available right now.</Text>;
  }

  const useScroll = providers.length > 4;
  const ringSize = resolveRingSize(screenWidth, providers.length, useScroll);
  const content = providers.map((provider) => {
    const code = getProviderCode(provider);
    return (
      <ProviderChip
        key={provider.id}
        provider={provider}
        selected={selectedCode === code}
        onPress={() => onSelect(code)}
        ringSize={ringSize}
        layout={useScroll ? 'scroll' : 'row'}
      />
    );
  });

  return (
    <View style={styles.track}>
      {useScroll ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollRow}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.row}>{content}</View>
      )}
    </View>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  track: {
    backgroundColor: colors.card,
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
  scrollRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 2,
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
  chipScroll: {
    width: 68,
  },
  logoRing: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
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
