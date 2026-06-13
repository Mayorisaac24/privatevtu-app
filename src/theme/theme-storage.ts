import * as SecureStore from 'expo-secure-store';
import type { ThemeId } from './types';
import { DEFAULT_THEME_ID, THEME_MAP } from './palettes';

const THEME_KEY = 'pvtu_theme_id';

export async function loadStoredThemeId(): Promise<ThemeId> {
  try {
    const raw = await SecureStore.getItemAsync(THEME_KEY);
    if (raw && raw in THEME_MAP) return raw as ThemeId;
  } catch {
    // ignore
  }
  return DEFAULT_THEME_ID;
}

export async function saveThemeId(id: ThemeId): Promise<void> {
  await SecureStore.setItemAsync(THEME_KEY, id);
}
