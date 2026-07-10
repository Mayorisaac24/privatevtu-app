import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useColors, useThemedStyles } from '../theme';

const SPLASH_LOGO = require('../../assets/images/app-logo.png');

const LOGO_WIDTH = 280;
const LOGO_HEIGHT = Math.round((425 / 587) * LOGO_WIDTH);

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
        source={SPLASH_LOGO}
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
        width: LOGO_WIDTH,
        height: LOGO_HEIGHT,
      },
      spinner: {
        marginTop: 28,
      },
    }),
  );
