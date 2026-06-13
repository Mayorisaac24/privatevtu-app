import { create } from 'zustand';
import {
  DEFAULT_SECURITY_PREFS,
  getSecurityPrefs,
  INACTIVE_LOCK_SECONDS,
  saveSecurityPrefs,
  type SecurityPrefs,
} from '../lib/security-storage';

type SecurityState = {
  isLocked: boolean;
  isPrivacyMode: boolean;
  lastLeftAt: number | null;
  leftViaBackground: boolean;
  prefs: SecurityPrefs;
  prefsLoaded: boolean;
  lock: () => void;
  unlock: () => void;
  setPrivacyMode: (value: boolean) => void;
  markLeftApp: (viaBackground: boolean) => void;
  shouldLockOnResume: () => boolean;
  loadPrefs: (options?: { force?: boolean }) => Promise<void>;
  updatePrefs: (partial: Partial<SecurityPrefs>) => Promise<void>;
};

export const useSecurityStore = create<SecurityState>((set, get) => ({
  isLocked: false,
  isPrivacyMode: false,
  lastLeftAt: null,
  leftViaBackground: false,
  prefs: DEFAULT_SECURITY_PREFS,
  prefsLoaded: false,

  lock: () => set({ isLocked: true, isPrivacyMode: false }),

  unlock: () => set({
    isLocked: false,
    isPrivacyMode: false,
    lastLeftAt: null,
    leftViaBackground: false,
  }),

  setPrivacyMode: (value) => set({ isPrivacyMode: value }),

  markLeftApp: (viaBackground) => set((state) => ({
    lastLeftAt: Date.now(),
    leftViaBackground: viaBackground || state.leftViaBackground,
    isPrivacyMode: true,
  })),

  shouldLockOnResume: () => {
    const { lastLeftAt, isLocked } = get();
    if (isLocked || lastLeftAt == null) return isLocked;

    const elapsedMs = Date.now() - lastLeftAt;
    return elapsedMs >= INACTIVE_LOCK_SECONDS * 1000;
  },

  loadPrefs: async (options?: { force?: boolean }) => {
    if (get().prefsLoaded && !options?.force) return;
    const prefs = await getSecurityPrefs();
    set({ prefs, prefsLoaded: true });
  },

  updatePrefs: async (partial) => {
    const next = { ...get().prefs, ...partial };
    await saveSecurityPrefs(next);
    set({ prefs: next, prefsLoaded: true });
  },
}));
