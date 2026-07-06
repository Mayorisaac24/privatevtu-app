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
  lockReturnPath: string | null;
  prefs: SecurityPrefs;
  prefsLoaded: boolean;
  lock: (returnPath?: string) => void;
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
  lockReturnPath: null,
  prefs: DEFAULT_SECURITY_PREFS,
  prefsLoaded: false,

  lock: (returnPath) => set((state) => ({
    isLocked: true,
    isPrivacyMode: false,
    lockReturnPath: returnPath ?? state.lockReturnPath,
  })),

  unlock: () => set({
    isLocked: false,
    isPrivacyMode: false,
    lastLeftAt: null,
    leftViaBackground: false,
    lockReturnPath: null,
  }),

  setPrivacyMode: (value) => set({ isPrivacyMode: value }),

  markLeftApp: (viaBackground) => set((state) => ({
    lastLeftAt: Date.now(),
    leftViaBackground: viaBackground || state.leftViaBackground,
    isPrivacyMode: true,
  })),

  shouldLockOnResume: () => {
    const { lastLeftAt, isLocked, prefs } = get();
    if (isLocked || lastLeftAt == null) return isLocked;

    const thresholdMs = (prefs.inactiveLockSeconds || INACTIVE_LOCK_SECONDS) * 1000;
    const elapsedMs = Date.now() - lastLeftAt;
    return elapsedMs >= thresholdMs;
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
