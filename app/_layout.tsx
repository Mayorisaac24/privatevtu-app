import 'react-native-gesture-handler';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { stackScreenOptions } from '../src/lib/stack-options';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ToastProvider from '../src/components/ui/Toast';
import { AppStatusBar } from '../src/components/AppStatusBar';
import { SessionBootstrap } from '../src/components/SessionBootstrap';
import { AppLockHost } from '../src/components/security/AppLockHost';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { BroadcastModalHost } from '../src/components/broadcast/BroadcastBanner';
import { FontBootstrap } from '../src/components/FontBootstrap';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { KeyboardAccessoryProvider } from '../src/components/ui/KeyboardAccessoryProvider';

function PushNotificationsBootstrap() {
  usePushNotifications();
  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
        <FontBootstrap>
          <KeyboardAccessoryProvider>
          <AppStatusBar />
          <PushNotificationsBootstrap />
          <BroadcastModalHost />
          <View style={{ flex: 1 }}>
            <Stack screenOptions={stackScreenOptions}>
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="auth" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="wallet" />
              <Stack.Screen name="kyc" />
              <Stack.Screen name="services" />
              <Stack.Screen name="dashboard" />
              <Stack.Screen name="transactions/[id]" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="profile" />
            </Stack>
            <AppLockHost />
            <SessionBootstrap />
          </View>
          <ToastProvider visibilityTime={3500} />
          </KeyboardAccessoryProvider>
        </FontBootstrap>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
