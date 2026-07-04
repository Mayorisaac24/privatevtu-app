import { create } from 'zustand';
import type { ThemeColors, ThemeGradients, ThemeId } from './types';
import { DEFAULT_THEME_ID, THEME_MAP } from './palettes';
import { loadStoredThemeId, saveThemeId } from './theme-storage';
import { useStatusBarStore } from '../stores/status-bar-store';

function syncStatusBar(colors: ThemeColors) {
  useStatusBarStore.getState().setStyle(colors.statusBarStyle);
}

type ThemeState = {
  themeId: ThemeId;
  colors: ThemeColors;
  gradients: ThemeGradients;
  hydrated: boolean;
  setThemeId: (id: ThemeId) => Promise<void>;
  hydrate: () => Promise<void>;
};

function resolveTheme(id: ThemeId) {
  const theme = THEME_MAP[id] ?? THEME_MAP[DEFAULT_THEME_ID];
  return { colors: theme.colors, gradients: theme.gradients, themeId: theme.id };
}

const fallback = resolveTheme(DEFAULT_THEME_ID);

/** Mutable colors — updated when theme changes; safe for inline styles. */
export const Colors: ThemeColors = { ...fallback.colors };
export const Gradients: ThemeGradients = { ...fallback.gradients };

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeId: fallback.themeId,
  colors: fallback.colors,
  gradients: fallback.gradients,
  hydrated: false,

  setThemeId: async (id: ThemeId) => {
    const next = resolveTheme(id);
    set({ themeId: next.themeId, colors: next.colors, gradients: next.gradients });
    Object.assign(Colors, next.colors);
    Object.assign(Gradients, next.gradients);
    syncStatusBar(next.colors);
    await saveThemeId(next.themeId);
  },

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const stored = await loadStoredThemeId();
      const next = resolveTheme(stored);
      set({ themeId: next.themeId, colors: next.colors, gradients: next.gradients, hydrated: true });
      Object.assign(Colors, next.colors);
      Object.assign(Gradients, next.gradients);
      syncStatusBar(next.colors);
    } catch {
      set({ hydrated: true });
    }
  },
}));
