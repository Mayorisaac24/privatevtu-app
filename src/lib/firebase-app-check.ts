let appCheckTokenCache: { token: string; expiresAt: number } | null = null;

async function loadAppCheckModule(): Promise<{
  getToken: (forceRefresh?: boolean) => Promise<{ token: string }>;
} | null> {
  try {
    // Native module — available after EAS build with @react-native-firebase/app-check.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appCheck = require('@react-native-firebase/app-check').default as {
      getToken: (forceRefresh?: boolean) => Promise<{ token: string }>;
    };
    if (typeof appCheck?.getToken === 'function') {
      return appCheck;
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[AppCheck] Native module unavailable — rebuild with expo run:ios/android or EAS.', error);
    }
  }
  return null;
}

export async function getFirebaseAppCheckToken(forceRefresh = false): Promise<string | null> {
  if (process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_ENABLED !== 'true') {
    return null;
  }

  if (!forceRefresh && appCheckTokenCache && appCheckTokenCache.expiresAt > Date.now()) {
    return appCheckTokenCache.token;
  }

  const module = await loadAppCheckModule();
  if (!module) return null;

  try {
    const result = await module.getToken(forceRefresh);
    const token = result?.token?.trim();
    if (!token) return null;

    appCheckTokenCache = {
      token,
      expiresAt: Date.now() + 50 * 60 * 1000,
    };
    return token;
  } catch (error) {
    if (__DEV__) {
      console.warn('[AppCheck] getToken failed:', error);
    }
    return null;
  }
}

export async function initializeFirebaseAppCheck(): Promise<void> {
  if (process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_ENABLED !== 'true') return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ReactNativeFirebaseAppCheckProvider } = require('@react-native-firebase/app-check');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appCheck = require('@react-native-firebase/app-check').default;

    const provider = new ReactNativeFirebaseAppCheckProvider();
    provider.configure({
      android: {
        provider: __DEV__ ? 'debug' : 'playIntegrity',
        debugToken: process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN,
      },
      apple: {
        provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
        debugToken: process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN,
      },
    });

    await appCheck.initializeAppCheck({
      provider,
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn(
        '[AppCheck] Initialize failed. Register the debug token from device logs in Firebase Console → App Check → Manage debug tokens.',
        error,
      );
    }
  }
}
