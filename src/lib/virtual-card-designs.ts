export const VIRTUAL_CARD_DESIGN_IDS = [
  'obsidian',
  'midnight',
  'aurora',
  'gold',
  'rose',
  'platinum',
  'emerald',
  'solar',
] as const;

export type VirtualCardDesignId = (typeof VIRTUAL_CARD_DESIGN_IDS)[number];

export const DEFAULT_VIRTUAL_CARD_DESIGN: VirtualCardDesignId = 'obsidian';

export type VirtualCardDesignPreset = {
  id: VirtualCardDesignId;
  label: string;
  tagline: string;
  gradient: readonly [string, string, string];
  accent: string;
  glow: string;
  textPrimary: string;
  textSecondary: string;
  chip: string;
  pattern: 'mesh' | 'waves' | 'grid';
};

export const VIRTUAL_CARD_DESIGNS: VirtualCardDesignPreset[] = [
  {
    id: 'obsidian',
    label: 'Obsidian',
    tagline: 'Stealth black metal',
    gradient: ['#050508', '#15151C', '#34343F'],
    accent: '#D7DCE8',
    glow: 'rgba(215,220,232,0.42)',
    textPrimary: '#F8FAFC',
    textSecondary: 'rgba(248,250,252,0.68)',
    chip: '#D4AF7A',
    pattern: 'mesh',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    tagline: 'Deep navy aurora',
    gradient: ['#050A1F', '#14204A', '#3B2E8C'],
    accent: '#8AB4FF',
    glow: 'rgba(138,180,255,0.4)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.75)',
    chip: '#E8ECFF',
    pattern: 'waves',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    tagline: 'Neon fintech pulse',
    gradient: ['#031A24', '#0B5F73', '#7C3AED'],
    accent: '#5EEAD4',
    glow: 'rgba(94,234,212,0.35)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.78)',
    chip: '#F0FDFA',
    pattern: 'mesh',
  },
  {
    id: 'gold',
    label: 'Gold Reserve',
    tagline: 'Private banking luxe',
    gradient: ['#0A0702', '#2A1C06', '#6B4E14'],
    accent: '#F3D891',
    glow: 'rgba(243,216,145,0.48)',
    textPrimary: '#FFF8E7',
    textSecondary: 'rgba(255,248,231,0.72)',
    chip: '#E8C96A',
    pattern: 'grid',
  },
  {
    id: 'rose',
    label: 'Rose Noir',
    tagline: 'Velvet evening tone',
    gradient: ['#180812', '#5C1A3A', '#933B5C'],
    accent: '#FFB4C8',
    glow: 'rgba(255,180,200,0.35)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.76)',
    chip: '#FFD6E0',
    pattern: 'waves',
  },
  {
    id: 'platinum',
    label: 'Platinum',
    tagline: 'Cool metallic frost',
    gradient: ['#101318', '#2A3038', '#5C6672'],
    accent: '#E8EDF5',
    glow: 'rgba(232,237,245,0.35)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.74)',
    chip: '#E8EDF5',
    pattern: 'grid',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    tagline: 'Wealth green signature',
    gradient: ['#021510', '#0F3D2E', '#166534'],
    accent: '#86EFAC',
    glow: 'rgba(134,239,172,0.35)',
    textPrimary: '#ECFDF5',
    textSecondary: 'rgba(236,253,245,0.75)',
    chip: '#D1FAE5',
    pattern: 'mesh',
  },
  {
    id: 'solar',
    label: 'Solar Flare',
    tagline: 'Sunset energy gradient',
    gradient: ['#1A0500', '#9A3412', '#F97316'],
    accent: '#FED7AA',
    glow: 'rgba(254,215,170,0.4)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.78)',
    chip: '#FFEDD5',
    pattern: 'waves',
  },
];

export function resolveVirtualCardDesign(designId?: string | null): VirtualCardDesignPreset {
  const normalized = String(designId || '').trim().toLowerCase();
  return VIRTUAL_CARD_DESIGNS.find((entry) => entry.id === normalized)
    ?? VIRTUAL_CARD_DESIGNS[0];
}

export function formatCardholderName(
  cardName?: string | null,
  fallbackName?: string | null,
): string {
  const primary = String(cardName || '').trim();
  if (primary) return primary.toUpperCase();
  const fallback = String(fallbackName || '').trim();
  if (fallback) return fallback.toUpperCase();
  return 'YOUR NAME';
}

export function formatPreviewPan(maskedPan?: string | null, preview = false): string {
  if (maskedPan?.trim()) {
    return maskedPan.trim().replace(/\s+/g, ' ');
  }
  return preview ? '••••  ••••  ••••  4242' : '••••  ••••  ••••  ••••';
}
