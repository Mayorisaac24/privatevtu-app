import { Stack } from 'expo-router';
import { stackScreenOptions } from '../../src/lib/stack-options';

export default function NotificationsLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
