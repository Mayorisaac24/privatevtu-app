import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

const APP_LOGO = require('../../../assets/images/app-logo.png');

/** Default in-app logo width (wordmark). */
export const BOOT_LOGO_SIZE = 120;

type AppLogoProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function AppLogo({ size = BOOT_LOGO_SIZE, style }: AppLogoProps) {
  return (
    <Image
      source={APP_LOGO}
      style={[styles.logo, { width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Datamart logo"
    />
  );
}

const styles = StyleSheet.create({
  logo: {},
});
