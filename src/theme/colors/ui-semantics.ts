import type { ThemeColors, ThemeGradients } from '../types';

/**
 * Theme-aware UI color helpers.
 *
 * Color hierarchy (change brand colors in one place):
 * 1. palette.ts — raw hex tokens
 * 2. semantic.ts — per-theme Colors + Gradients factories
 * 3. ui-semantics.ts (this file) — reusable component palettes
 * 4. useColors() / useGradients() — runtime hooks in components
 */

export type NotificationVisualType = 'success' | 'error' | 'warning' | 'info';
export type ToastVariant = NotificationVisualType;

/** Convert #RRGGBB to rgba() — used for glass tints and icon backgrounds. */
export function colorWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Brand hero gradient for purchase confirmation cards (airtime, data, etc.). */
export function getPurchaseConfirmGradient(gradients: ThemeGradients) {
  return gradients.card;
}

/** Notification list/detail icon badge colors — theme-aware. */
export function getNotificationTypePalette(
  type: NotificationVisualType | string | undefined,
  colors: ThemeColors,
): { bg: string; color: string } {
  switch (type) {
    case 'success':
      return { bg: colors.successLight, color: colors.successDark };
    case 'error':
      return { bg: colors.errorLight, color: colors.errorDark };
    case 'warning':
      return { bg: colors.warningLight, color: colors.warningDark };
    case 'info':
    default:
      return { bg: colors.primaryMuted, color: colors.primary };
  }
}

/** Toast glass tint, accent, and text colors — theme-aware. */
export function getToastVariantPalette(variant: ToastVariant, colors: ThemeColors) {
  switch (variant) {
    case 'success':
      return {
        tintBg: colorWithAlpha(colors.successLight, 0.72),
        accent: colors.success,
        title: colors.successDark,
        body: colors.successDark,
      };
    case 'error':
      return {
        tintBg: colorWithAlpha(colors.errorLight, 0.78),
        accent: colors.error,
        title: colors.errorDark,
        body: colors.errorDark,
      };
    case 'warning':
      return {
        tintBg: colorWithAlpha(colors.warningLight, 0.78),
        accent: colors.warning,
        title: colors.warningDark,
        body: colors.warningDark,
      };
    case 'info':
    default:
      return {
        tintBg: colorWithAlpha(colors.primaryMuted, 0.78),
        accent: colors.primary,
        title: colors.primaryDeep,
        body: colors.primaryDark,
      };
  }
}
