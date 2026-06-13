import React, { ReactNode, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useThemeStore } from '../theme/theme-store';

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const hydrate = useThemeStore((s) => s.hydrate);
  const statusBarStyle = useThemeStore((s) => s.colors.statusBarStyle);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <>
      <StatusBar style={statusBarStyle} />
      {children}
    </>
  );
}
