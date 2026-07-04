import React, { ReactNode, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../theme/theme-store';

type ThemeProviderProps = {
  children: ReactNode;
};

function ThemeHydrationGate({ children }: ThemeProviderProps) {
  const colors = useThemeStore((s) => s.colors);

  return (
    <View style={[styles.gate, { backgroundColor: colors.pageBg }]}>
      {children}
    </View>
  );
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const hydrate = useThemeStore((s) => s.hydrate);
  const hydrated = useThemeStore((s) => s.hydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) return null;

  return <ThemeHydrationGate>{children}</ThemeHydrationGate>;
}

const styles = StyleSheet.create({
  gate: { flex: 1 },
});
