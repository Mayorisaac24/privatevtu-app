import { StatusBar } from 'expo-status-bar';
import { useStatusBarStore } from '../stores/status-bar-store';

const DARK_HEADER_BG = '#1A0A3C';
const LIGHT_SCREEN_BG = '#FFFFFF';

export function AppStatusBar() {
  const style = useStatusBarStore((s) => s.style);
  const useLightIcons = style === 'light';

  return (
    <StatusBar
      style={useLightIcons ? 'light' : 'dark'}
      translucent={false}
      backgroundColor={useLightIcons ? DARK_HEADER_BG : LIGHT_SCREEN_BG}
    />
  );
}
