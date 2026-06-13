import { Stack } from 'expo-router';
import { stackScreenOptions } from '../../src/lib/stack-options';

export default function DashboardLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="setup-pin" />
      <Stack.Screen name="unlock" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
