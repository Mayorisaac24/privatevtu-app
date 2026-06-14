import { ReactNode, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { AppLogo } from './ui/AppLogo';
import { Colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

type FontBootstrapProps = {
  children: ReactNode;
};

export function FontBootstrap({ children }: FontBootstrapProps) {
  const [iconsReady, setIconsReady] = useState(false);
  const [interLoaded, interError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await Ionicons.loadFont();
      } catch {
        await Font.loadAsync(Ionicons.font);
      }
      if (!cancelled) setIconsReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (iconsReady && (interLoaded || interError)) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [iconsReady, interLoaded, interError]);

  if (!iconsReady) {
    return (
      <View style={styles.boot}>
        <AppLogo size={168} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
});
