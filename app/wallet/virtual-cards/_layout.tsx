import { Stack } from 'expo-router';
import { stackScreenOptions } from '../../../src/lib/stack-options';

export default function VirtualCardsLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
