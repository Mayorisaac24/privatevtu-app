import { StatusBar } from 'expo-status-bar';
import { useStatusBarStore } from '../stores/status-bar-store';
import { useThemeStore } from '../theme/theme-store';

export function AppStatusBar() {
  const style = useStatusBarStore((s) => s.style);
  const pageBg = useThemeStore((s) => s.colors.pageBg);
  const heroDark = useThemeStore((s) => s.colors.heroDark);
  const useLightIcons = style === 'light';

  return (
    <StatusBar
      style={useLightIcons ? 'light' : 'dark'}
      translucent={false}
      backgroundColor={useLightIcons ? heroDark : pageBg}
    />
  );
}
