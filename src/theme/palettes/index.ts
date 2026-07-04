import type { ThemeDefinition, ThemeId } from '../types';
import { Palette } from '../colors/app-colors';
import {
  createVioletLightColors,
  createVioletLightGradients,
  createVioletDarkColors,
  createVioletDarkGradients,
  createFamilyLightColors,
  createFamilyDarkColors,
  createFamilyGradients,
  createFamilyLightGradients,
  createFamilyDarkGradients,
} from '../colors/semantic';

function def(
  id: ThemeId,
  family: ThemeDefinition['family'],
  mode: ThemeDefinition['mode'],
  label: string,
  description: string,
  preview: readonly [string, string, string],
  colors: ThemeDefinition['colors'],
  gradients: ThemeDefinition['gradients'],
  extra?: Partial<ThemeDefinition>,
): ThemeDefinition {
  return { id, family, mode, label, description, preview, colors, gradients, ...extra };
}

export const THEME_DEFINITIONS: ThemeDefinition[] = [
  def(
    'violet-light',
    'violet',
    'light',
    'DataMartNG Classic',
    'Our signature violet fintech look',
    [Palette.violet600, Palette.violet400, Palette.pageBg],
    createVioletLightColors(),
    createVioletLightGradients(),
    { isDefault: true },
  ),
  def(
    'violet-dark',
    'violet',
    'dark',
    'Dark Mode',
    'The classic design in rich dark tones',
    [Palette.heroBase, Palette.violet500, Palette.darkPageBg],
    createVioletDarkColors(),
    createVioletDarkGradients(),
    { isDarkModeEquivalent: true },
  ),
  def(
    'midnight-light',
    'midnight',
    'light',
    'Midnight Light',
    'Cool navy tones with crisp clarity',
    [Palette.midnightPrimary, Palette.midnightAccent, Palette.slate50],
    createFamilyLightColors('midnight'),
    createFamilyLightGradients('midnight'),
  ),
  def(
    'midnight-dark',
    'midnight',
    'dark',
    'Midnight Dark',
    'Deep oceanic night with blue glow',
    [Palette.midnightHeroDark, Palette.midnightAccent, Palette.midnightPage],
    createFamilyDarkColors('midnight'),
    createFamilyDarkGradients('midnight'),
  ),
  def(
    'ocean-light',
    'ocean',
    'light',
    'Ocean Light',
    'Fresh teal and cyan premium banking',
    [Palette.oceanAccent, Palette.oceanAccentLight, Palette.oceanPage],
    createFamilyLightColors('ocean'),
    createFamilyLightGradients('ocean'),
  ),
  def(
    'ocean-dark',
    'ocean',
    'dark',
    'Ocean Dark',
    'Abyssal teal depths',
    [Palette.oceanDarkHero, Palette.oceanAccentLight, Palette.oceanDarkPage],
    createFamilyDarkColors('ocean'),
    createFamilyDarkGradients('ocean'),
  ),
  def(
    'emerald-light',
    'emerald',
    'light',
    'Royal Emerald',
    'Wealth-inspired green with gold hints',
    [Palette.emeraldAccent, Palette.emerald400, Palette.emeraldPage],
    createFamilyLightColors('emerald'),
    createFamilyLightGradients('emerald'),
  ),
  def(
    'emerald-dark',
    'emerald',
    'dark',
    'Emerald Noir',
    'Deep forest green elegance',
    [Palette.emeraldDarkHero, Palette.emerald400, Palette.emeraldDarkPage],
    createFamilyDarkColors('emerald'),
    createFamilyDarkGradients('emerald'),
  ),
  def(
    'rose-light',
    'rose',
    'light',
    'Rose Gold',
    'Warm rose with luxury accents',
    [Palette.roseAccent, Palette.roseAccentLight, Palette.rosePage],
    createFamilyLightColors('rose'),
    createFamilyLightGradients('rose'),
  ),
  def(
    'rose-dark',
    'rose',
    'dark',
    'Rose Noir',
    'Dark plum with rose gold glow',
    [Palette.roseDarkHero, Palette.roseAccentLight, Palette.roseDarkPage],
    createFamilyDarkColors('rose'),
    createFamilyDarkGradients('rose'),
  ),
];

export const THEME_MAP: Record<ThemeId, ThemeDefinition> = Object.fromEntries(
  THEME_DEFINITIONS.map((t) => [t.id, t]),
) as Record<ThemeId, ThemeDefinition>;

export const DEFAULT_THEME_ID: ThemeId = 'violet-light';

export const BRAND_THEME_IDS: ThemeId[] = ['violet-light', 'violet-dark'];

export const OTHER_THEME_FAMILIES = ['midnight', 'ocean', 'emerald', 'rose'] as const;
