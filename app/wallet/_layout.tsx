import { Stack } from 'expo-router';
import { stackScreenOptions } from '../../src/lib/stack-options';

export default function WalletLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="transfer" />
      <Stack.Screen name="fund" />
    </Stack>
  );
}
