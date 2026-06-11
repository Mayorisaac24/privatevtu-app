import { Stack } from 'expo-router';

/**
 * This layout uses a Stack with a single screen (index).
 * The actual tab bar lives inside app/(tabs)/index.tsx as a
 * custom component — we do NOT use expo-router's <Tabs> at all
 * because of a bug in expo-router 4.x where BottomTabBar crashes
 * with "Cannot read property 'config' of undefined".
 */
export default function TabsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
