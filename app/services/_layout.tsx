import { Stack } from 'expo-router';
import { FocusStatusBar } from '../../src/hooks/useStatusBarStyle';
import { stackScreenOptions } from '../../src/lib/stack-options';

export default function ServicesLayout() {
  return (
    <>
      <FocusStatusBar style="dark" />
      <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="airtime" />
      <Stack.Screen name="data" />
      <Stack.Screen name="electricity" />
      <Stack.Screen name="cable" />
      <Stack.Screen name="education" />
      </Stack>
    </>
  );
}
