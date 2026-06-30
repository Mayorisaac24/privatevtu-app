import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';

const APP_LOGO = require('../../../assets/images/app-logo.png');

/** Default in-app logo width (wordmark). */
export const BOOT_LOGO_SIZE = 120;

type AppLogoProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
  /** White backing so the wordmark stays visible on dark/colored surfaces (e.g. receipt hero). */
  variant?: 'default' | 'onDark';
};

export function AppLogo({ size = BOOT_LOGO_SIZE, style, variant = 'default' }: AppLogoProps) {
  const image = (
    <Image
      source={APP_LOGO}
      style={[styles.logo, { width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Datamart logo"
    />
  );

  if (variant === 'onDark') {
    const pad = Math.max(4, Math.round(size * 0.12));
    return (
      <View
        style={[
          styles.onDarkWrap,
          {
            padding: pad,
            borderRadius: Math.round(size * 0.22),
          },
        ]}
      >
        {image}
      </View>
    );
  }

  return image;
}

const styles = StyleSheet.create({
  logo: {},
  onDarkWrap: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
});
