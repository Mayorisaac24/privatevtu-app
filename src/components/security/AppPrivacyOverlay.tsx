import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography, Overlays } from '../../theme';
import { useColors, useGradients } from '../../theme/hooks';
import { gradientStops, withAlpha } from '../../theme/gradient-utils';

const APP_ICON = require('../../../assets/icon.png');

type AppPrivacyOverlayProps = {
  visible: boolean;
};

export function AppPrivacyOverlay({ visible }: AppPrivacyOverlayProps) {
  const colors = useColors();
  const gradients = useGradients();

  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="auto">
      <LinearGradient
        colors={gradientStops(gradients.heroAuth)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          styles.blobPrimary,
          { backgroundColor: withAlpha(gradients.hero[2], 0.22) },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.blobSecondary,
          { backgroundColor: withAlpha(gradients.hero[0], 0.14) },
        ]}
      />
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <Image
            source={APP_ICON}
            style={styles.logoIcon}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="Datamart"
          />
        </View>
        <Text style={[styles.subtitle, { color: colors.textOnHeroMuted }]}>Secured session</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
    overflow: 'hidden',
  },
  blobPrimary: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  blobSecondary: {
    position: 'absolute',
    bottom: -20,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  logoWrap: {
    padding: 14,
    borderRadius: 28,
    backgroundColor: Overlays.white14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Overlays.white18,
  },
  logoIcon: {
    width: 88,
    height: 88,
    borderRadius: 20,
  },
  subtitle: {
    ...Typography.small,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
