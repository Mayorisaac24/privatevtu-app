import type { ThemeDefinition, ThemeId } from '../types';
import {
  createVioletLightColors,
  createVioletLightGradients,
  createVioletDarkColors,
  createVioletDarkGradients,
  createFamilyLightColors,
  createFamilyDarkColors,
  createFamilyGradients,
} from '../colors/semantic';
import { Palette } from '../colors/palette';

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
    'PrivateVTU Classic',
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
    ['#1E3A5F', '#3B82F6', '#F8FAFC'],
    createFamilyLightColors('midnight'),
    createFamilyGradients('midnight', 'light'),
  ),
  def(
    'midnight-dark',
    'midnight',
    'dark',
    'Midnight Dark',
    'Deep oceanic night with blue glow',
    ['#060B12', '#3B82F6', Palette.midnightPage],
    createFamilyDarkColors('midnight'),
    createFamilyGradients('midnight', 'dark'),
  ),
  def(
    'ocean-light',
    'ocean',
    'light',
    'Ocean Light',
    'Fresh teal and cyan premium banking',
    [Palette.oceanAccent, Palette.oceanAccentLight, Palette.oceanPage],
    createFamilyLightColors('ocean'),
    createFamilyGradients('ocean', 'light'),
  ),
  def(
    'ocean-dark',
    'ocean',
    'dark',
    'Ocean Dark',
    'Abyssal teal depths',
    ['#021018', Palette.oceanAccentLight, Palette.oceanDarkPage],
    createFamilyDarkColors('ocean'),
    createFamilyGradients('ocean', 'dark'),
  ),
  def(
    'emerald-light',
    'emerald',
    'light',
    'Royal Emerald',
    'Wealth-inspired green with gold hints',
    [Palette.emeraldAccent, '#34D399', Palette.emeraldPage],
    createFamilyLightColors('emerald'),
    createFamilyGradients('emerald', 'light'),
  ),
  def(
    'emerald-dark',
    'emerald',
    'dark',
    'Emerald Noir',
    'Deep forest green elegance',
    ['#021208', '#34D399', Palette.emeraldDarkPage],
    createFamilyDarkColors('emerald'),
    createFamilyGradients('emerald', 'dark'),
  ),
  def(
    'rose-light',
    'rose',
    'light',
    'Rose Gold',
    'Warm rose with luxury accents',
    [Palette.roseAccent, Palette.roseAccentLight, Palette.rosePage],
    createFamilyLightColors('rose'),
    createFamilyGradients('rose', 'light'),
  ),
  def(
    'rose-dark',
    'rose',
    'dark',
    'Rose Noir',
    'Dark plum with rose gold glow',
    ['#0A0408', Palette.roseAccentLight, Palette.roseDarkPage],
    createFamilyDarkColors('rose'),
    createFamilyGradients('rose', 'dark'),
  ),
];

export const THEME_MAP: Record<ThemeId, ThemeDefinition> = Object.fromEntries(
  THEME_DEFINITIONS.map((t) => [t.id, t]),
) as Record<ThemeId, ThemeDefinition>;

export const DEFAULT_THEME_ID: ThemeId = 'violet-light';

export const BRAND_THEME_IDS: ThemeId[] = ['violet-light', 'violet-dark'];

export const OTHER_THEME_FAMILIES = ['midnight', 'ocean', 'emerald', 'rose'] as const;
