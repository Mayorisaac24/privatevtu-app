import { create } from 'zustand';

/** `dark` = black icons (light background). `light` = white icons (dark background). */
export type StatusBarIconStyle = 'light' | 'dark';

interface StatusBarState {
  style: StatusBarIconStyle;
  setStyle: (style: StatusBarIconStyle) => void;
}

export const useStatusBarStore = create<StatusBarState>((set) => ({
  style: 'dark',
  setStyle: (style) => set({ style }),
}));
