import { Stack } from 'expo-router';
import { FocusStatusBar } from '../../src/hooks/useStatusBarStyle';
import { stackScreenOptions } from '../../src/lib/stack-options';

export default function AuthLayout() {
  return (
    <>
      <FocusStatusBar style="light" />
      <Stack screenOptions={{ ...stackScreenOptions, gestureEnabled: false, fullScreenGestureEnabled: false }}>
      <Stack.Screen name="login" options={{ animation: 'fade' }} />
      <Stack.Screen name="index" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="verify-2fa" />
      </Stack>
    </>
  );
}
