import 'react-native-gesture-handler';
import { ReactNode, useEffect } from 'react';
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
import { Colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const IONICONS_FONT = require('../../assets/fonts/ionicons.ttf');

type FontBootstrapProps = {
  children: ReactNode;
};

export function FontBootstrap({ children }: FontBootstrapProps) {
  const [interLoaded, interError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    (async () => {
      if (!Font.isLoaded('ionicons')) {
        await Font.loadAsync({ ionicons: IONICONS_FONT });
      }
      if (!Font.isLoaded('ionicons')) {
        await Ionicons.loadFont();
      }
    })();
  }, []);

  const fontsReady = interLoaded || interError;

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return <View style={styles.boot} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: Colors.white,
  },
});
