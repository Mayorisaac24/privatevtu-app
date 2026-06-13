import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

const APP_LOGO = require('../../../assets/images/app-logo.png');

type AppLogoProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function AppLogo({ size = 120, style }: AppLogoProps) {
  return (
    <Image
      source={APP_LOGO}
      style={[styles.logo, { width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="PrivateVTU logo"
    />
  );
}

const styles = StyleSheet.create({
  logo: {},
});
