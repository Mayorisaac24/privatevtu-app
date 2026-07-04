import { useMemo } from 'react';
import type { ThemeColors, ThemeGradients, ThemeId } from './types';
import { THEME_MAP } from './palettes';
import { useThemeStore } from './theme-store';

export function useThemeId(): ThemeId {
  return useThemeStore((s) => s.themeId);
}

export function useColors(): ThemeColors {
  return useThemeStore((s) => s.colors);
}

export function useGradients(): ThemeGradients {
  return useThemeStore((s) => s.gradients);
}

export function useTheme() {
  const themeId = useThemeId();
  const colors = useColors();
  const gradients = useGradients();
  const setThemeId = useThemeStore((s) => s.setThemeId);
  const definition = THEME_MAP[themeId];

  return useMemo(
    () => ({
      themeId,
      colors,
      gradients,
      definition,
      setThemeId,
      isDark: definition.mode === 'dark',
    }),
    [themeId, colors, gradients, definition, setThemeId],
  );
}

export function useThemedStyles<T>(factory: (colors: ThemeColors, gradients: ThemeGradients) => T): T {
  const colors = useColors();
  const gradients = useGradients();
  return useMemo(() => factory(colors, gradients), [colors, gradients, factory]);
}

/** Card-style glass: frosted in light mode, solid surface in dark mode. */
export function useCardGlassVariant(): 'light' | 'solid' {
  const { isDark } = useTheme();
  return isDark ? 'solid' : 'light';
}

/** Alias for `useThemedStyles` — use when defining screen/component style factories. */
export const createThemedStyles = useThemedStyles;
