import 'react-native-gesture-handler';
import { ReactNode, useEffect } from 'react';
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
    void (async () => {
      if (!Font.isLoaded('ionicons')) {
        await Font.loadAsync({ ionicons: IONICONS_FONT });
      }
      if (!Font.isLoaded('ionicons')) {
        await Ionicons.loadFont();
      }
    })();
  }, []);

  const fontsReady = interLoaded || interError;

  // Keep native splash visible while fonts load — no duplicate boot UI.
  if (!fontsReady) {
    return null;
  }

  return <>{children}</>;
}
