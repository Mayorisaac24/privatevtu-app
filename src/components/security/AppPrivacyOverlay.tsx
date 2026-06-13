import { Platform, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Typography } from '../../theme';
import { AppLogo } from '../ui/AppLogo';

type AppPrivacyOverlayProps = {
  visible: boolean;
};

export function AppPrivacyOverlay({ visible }: AppPrivacyOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="auto">
      <BlurView
        intensity={Platform.OS === 'android' ? 90 : 55}
        tint="dark"
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      />
      <View style={styles.scrim} />
      <View style={styles.content}>
        <AppLogo size={132} />
        <Text style={styles.subtitle}>Secured session</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(76, 29, 149, 0.42)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  subtitle: {
    ...Typography.small,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
