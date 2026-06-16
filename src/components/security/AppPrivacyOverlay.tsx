import { Platform, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Typography } from '../../theme';
import { AppLogo } from '../ui/AppLogo';

type AppPrivacyOverlayProps = {
  visible: boolean;
};

export function AppPrivacyOverlay({ visible }: AppPrivacyOverlayProps) {
  if (!visible) return null;

  const useBlur = Platform.OS === 'ios';

  return (
    <View style={styles.root} pointerEvents="auto">
      {useBlur ? (
        <BlurView
          intensity={55}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
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
