import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { BootSplashView } from '../src/components/BootSplashView';
import { resolveBootDestination } from '../src/lib/boot-navigation';
import { markBootStarted, setBootComplete } from '../src/lib/boot-state';
import { safeReplace } from '../src/lib/navigation';
import { useSecurityStore } from '../src/stores';

type BootDestinationHref =
  | '/auth/login'
  | '/onboarding'
  | '/(tabs)'
  | '/dashboard/setup-pin';

function destinationHref(
  destination: Awaited<ReturnType<typeof resolveBootDestination>>,
): BootDestinationHref {
  if (destination.type === 'home') {
    return destination.hasPin === false ? '/dashboard/setup-pin' : '/(tabs)';
  }
  if (destination.type === 'onboarding') {
    return '/onboarding';
  }
  return '/auth/login';
}

/**
 * Boot route: keep native splash visible, resolve session once, then replace.
 * No duplicate React splash — native boot-splash.png already matches branding.
 */
export default function BootScreen() {
  useEffect(() => {
    if (!markBootStarted()) return;

    void (async () => {
      try {
        const destination = await resolveBootDestination();
        const href = destinationHref(destination);

        if (destination.type === 'home' && destination.hasPin !== false) {
          useSecurityStore.getState().lock('/(tabs)');
        }

        safeReplace(href);
        setBootComplete();
      } catch {
        safeReplace('/auth/login');
        setBootComplete();
      } finally {
        await SplashScreen.hideAsync().catch(() => {});
      }
    })();
  }, []);

  // Native splash covers this route until hideAsync runs after navigation.
  return <BootSplashView showSpinner={false} />;
}
