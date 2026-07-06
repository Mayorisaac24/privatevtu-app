import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useColors, useThemedStyles } from '../theme';

const BOOT_SPLASH = require('../../assets/boot-splash.png');

type BootSplashViewProps = {
  onLayout?: () => void;
  showSpinner?: boolean;
};

export function BootSplashView({ onLayout, showSpinner = true }: BootSplashViewProps) {
  const colors = useColors();
  const styles = useStyles();

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Image
        source={BOOT_SPLASH}
        style={styles.art}
        resizeMode="contain"
        accessibilityLabel="Datamart"
      />
      {showSpinner ? (
        <ActivityIndicator color={colors.primary} size="small" style={styles.spinner} />
      ) : null}
    </View>
  );
}

const useStyles = () =>
  useThemedStyles((colors) =>
    StyleSheet.create({
      root: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
      },
      art: {
        width: 280,
        height: 163,
      },
      spinner: {
        marginTop: 28,
      },
    }),
  );
