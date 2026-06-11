import { Stack } from 'expo-router';
import { stackScreenOptions } from '../src/lib/stack-options';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ToastProvider from '../src/components/ui/Toast';
import { AppStatusBar } from '../src/components/AppStatusBar';
import { SessionBootstrap } from '../src/components/SessionBootstrap';
import { usePushNotifications } from '../src/hooks/usePushNotifications';

function PushNotificationsBootstrap() {
  usePushNotifications();
  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppStatusBar />
        <SessionBootstrap />
        <PushNotificationsBootstrap />
        <Stack screenOptions={stackScreenOptions}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="wallet" />
          <Stack.Screen name="kyc" />
          <Stack.Screen name="services" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="transactions/[id]" />
        </Stack>
        <ToastProvider visibilityTime={3500} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
