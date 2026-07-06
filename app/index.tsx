import { useEffect } from 'react';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { resolveBootDestination } from '../src/lib/boot-navigation';
import { setBootComplete } from '../src/lib/boot-state';
import { useSecurityStore } from '../src/stores';

/**
 * Boot route: resolves auth/onboarding/home while the native splash stays visible.
 * No duplicate UI here — native splash already matches the brand screen.
 */
export default function BootScreen() {
  useEffect(() => {
    void (async () => {
      try {
        const destination = await resolveBootDestination();

        if (destination.type === 'home') {
          if (destination.hasPin === false) {
            router.replace('/dashboard/setup-pin');
          } else {
            useSecurityStore.getState().lock('/(tabs)');
            router.replace('/(tabs)');
          }
          setBootComplete();
          return;
        }

        if (destination.type === 'onboarding') {
          router.replace('/onboarding');
          setBootComplete();
          return;
        }

        router.replace('/auth/login');
        setBootComplete();
      } finally {
        await SplashScreen.hideAsync().catch(() => {});
      }
    })();
  }, []);

  return null;
}
