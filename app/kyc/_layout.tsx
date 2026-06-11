import { Stack } from 'expo-router';
import { stackScreenOptions } from '../../src/lib/stack-options';

export default function KycLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
