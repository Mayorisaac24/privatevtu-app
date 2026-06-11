import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { AirtimeProvider } from '../lib/api';
import {
  getProviderCode,
  getProviderLogo,
  getProviderLogoScale,
  getProviderShortName,
  getProviderStyle,
} from '../lib/providers';
import { Colors, Typography, Radius } from '../theme';

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
}: {
  provider: AirtimeProvider;
  selected: boolean;
  onPress: () => void;
}) {
  const code = getProviderCode(provider);
  const style = getProviderStyle(code, {
    bg: Colors.surface,
    border: Colors.borderMid,
    text: Colors.mid,
  });
  const logoScale = getProviderLogoScale(code);
  const label = getProviderShortName(provider);

  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.logoRing,
          {
            borderColor: selected ? Colors.primary : Colors.borderMid,
            backgroundColor: selected ? Colors.primaryMuted : Colors.white,
          },
          selected && styles.logoRingSelected,
        ]}
      >
        <View style={[styles.logoInner, { backgroundColor: style.bg }]}>
          <Image
            source={getProviderLogo(provider)}
            style={[styles.logo, { transform: [{ scale: logoScale }] }]}
            resizeMode="contain"
          />
        </View>
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

export function NetworkProviderGrid({
  providers,
  selectedCode,
  onSelect,
  loading = false,
}: NetworkProviderGridProps) {
  if (loading) {
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
  const content = providers.map((provider) => {
    const code = getProviderCode(provider);
    return (
      <ProviderChip
        key={provider.id}
        provider={provider}
        selected={selectedCode === code}
        onPress={() => onSelect(code)}
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

const CHIP_SIZE = 52;

const styles = StyleSheet.create({
  track: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  scrollRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 2,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    minWidth: 64,
  },
  logoRing: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoRingSelected: {
    borderWidth: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  logoInner: {
    width: CHIP_SIZE - 10,
    height: CHIP_SIZE - 10,
    borderRadius: (CHIP_SIZE - 10) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 36,
    height: 22,
  },
  selectedDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
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
