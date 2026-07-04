import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ElectricityProvider } from '../lib/api';
import {
  getDiscoCode,
  getDiscoDisplayName,
  getDiscoLogo,
  getDiscoLogoScale,
} from '../lib/disco-providers';
import {Colors, Typography, Radius, Palette, useColors, useThemedStyles } from '../theme';
import { isAndroid } from '../lib/platform-ui';

type DiscoProviderGridProps = {
  providers: ElectricityProvider[];
  selectedCode: string;
  onSelect: (code: string) => void;
  loading?: boolean;
};

function DiscoChip({
  provider,
  selected,
  onPress,
  ringSize,
}: {
  provider: ElectricityProvider;
  selected: boolean;
  onPress: () => void;
  ringSize: number;
}) {
  const styles = useStyles();
  const colors = useColors();
  const code = getDiscoCode(provider);
  const logoScale = getDiscoLogoScale(code);
  const innerSize = ringSize - 6;

  return (
    <TouchableOpacity style={styles.chip} onPress={onPress} activeOpacity={0.7}>
      <View
        style={[
          styles.logoRing,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderColor: selected ? colors.electricity : colors.borderMid,
            backgroundColor: selected ? colors.electricityBg : colors.surfaceAlt,
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
              backgroundColor: colors.electricityBg,
            },
          ]}
        >
          <Image
            source={getDiscoLogo(provider)}
            style={[
              styles.logo,
              {
                width: ringSize * 0.68,
                height: ringSize * 0.68,
                transform: [{ scale: logoScale }],
              },
            ]}
            resizeMode="contain"
          />
        </View>
        {selected ? <View style={styles.selectedDot} /> : null}
      </View>
    </TouchableOpacity>
  );
}

export function DiscoProviderGrid({
  providers,
  selectedCode,
  onSelect,
  loading = false,
}: DiscoProviderGridProps) {
  const styles = useStyles();

  const { width: screenWidth } = useWindowDimensions();
  const ringSize = isAndroid ? 54 : 58;
  const selectedProvider = providers.find((provider) => getDiscoCode(provider) === selectedCode);

  if (loading && providers.length === 0) {
    return (
      <View style={styles.loadRow}>
        <ActivityIndicator size="small" color={Colors.electricity} />
        <Text style={styles.loadText}>Loading DISCOs...</Text>
      </View>
    );
  }

  if (providers.length === 0) {
    return <Text style={styles.emptyText}>No electricity providers available right now.</Text>;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollRow,
            providers.length * (ringSize + 14) <= screenWidth - 72 && styles.scrollRowCentered,
          ]}
        >
          {providers.map((provider) => {
            const code = getDiscoCode(provider);
            return (
              <DiscoChip
                key={provider.id}
                provider={provider}
                selected={selectedCode === code}
                onPress={() => onSelect(code)}
                ringSize={ringSize}
              />
            );
          })}
        </ScrollView>
      </View>

      {selectedProvider ? (
        <View style={styles.selectedBadge}>
          <Ionicons name="flash" size={14} color={Colors.electricity} />
          <Text style={styles.selectedBadgeText} numberOfLines={1}>
            {getDiscoDisplayName(selectedProvider)}
          </Text>
        </View>
      ) : (
        <Text style={styles.hintText}>Select your distribution company</Text>
      )}
    </View>
  );
}

const createStyles = (colors: import('../../theme/types').ThemeColors) => StyleSheet.create({
  wrap: {
    gap: 10,
  },
  track: {
    backgroundColor: colors.electricityBg,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Palette.amber200,
    overflow: 'hidden',
  },
  scrollRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 2,
  },
  scrollRowCentered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  chip: {
    alignItems: 'center',
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
          shadowColor: colors.electricity,
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
    backgroundColor: colors.electricity,
    borderWidth: 2,
    borderColor: colors.white,
  },
  selectedBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: colors.electricityBg,
    borderWidth: 1,
    borderColor: Palette.amber200,
  },
  selectedBadgeText: {
    ...Typography.smallMed,
    color: colors.electricity,
    flexShrink: 1,
  },
  hintText: {
    ...Typography.small,
    color: colors.muted,
    textAlign: 'center',
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
