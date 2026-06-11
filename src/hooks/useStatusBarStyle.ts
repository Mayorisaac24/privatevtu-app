import { useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { useStatusBarStore, type StatusBarIconStyle } from '../stores/status-bar-store';

/** Set status bar icon color while this screen is focused (expo-router screens). */
export function useStatusBarStyle(style: StatusBarIconStyle) {
  const setStyle = useStatusBarStore((s) => s.setStyle);

  useFocusEffect(
    useCallback(() => {
      setStyle(style);
    }, [style, setStyle]),
  );
}

/** Set status bar icon color on mount (splash / one-off screens). */
export function ScreenStatusBar({ style }: { style: StatusBarIconStyle }) {
  const setStyle = useStatusBarStore((s) => s.setStyle);

  useEffect(() => {
    setStyle(style);
  }, [style, setStyle]);

  return null;
}

/** Set status bar while any screen in a layout stack is focused. */
export function FocusStatusBar({ style }: { style: StatusBarIconStyle }) {
  useStatusBarStyle(style);
  return null;
}
