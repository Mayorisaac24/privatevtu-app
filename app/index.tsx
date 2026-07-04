import { useEffect } from 'react';
import { View, Image, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { resolveBootDestination } from '../src/lib/boot-navigation';
import { ScreenStatusBar } from '../src/hooks/useStatusBarStyle';
import { Colors, FontFamily, useThemedStyles } from '../src/theme';

const APP_ICON = require('../assets/icon.png');

export default function BootScreen() {
  const styles = useStyles();

  useEffect(() => {
    void (async () => {
      const destination = await resolveBootDestination();

      if (destination.type === 'home') {
        router.replace(
          destination.hasPin === false ? '/dashboard/setup-pin' : '/(tabs)',
        );
        return;
      }

      if (destination.type === 'onboarding') {
        router.replace('/onboarding');
        return;
      }

      router.replace('/auth/login');
    })();
  }, []);

  return (
    <View style={styles.root}>
      <ScreenStatusBar style="dark" />
      <Image source={APP_ICON} style={styles.icon} resizeMode="contain" accessibilityLabel="Datamart" />
      <Text style={styles.name}>Datamart</Text>
      <ActivityIndicator color={Colors.primary} size="small" style={styles.spinner} />
    </View>
  );
}

const createStyles = (colors: import('../src/theme/types').ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 22,
    marginBottom: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.dark,
    fontFamily: FontFamily.bold,
    letterSpacing: -0.3,
  },
  spinner: {
    marginTop: 28,
  },
});

function useStyles() {
  return useThemedStyles(createStyles);
}
