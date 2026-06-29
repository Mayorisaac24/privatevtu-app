import { create } from 'zustand';
import { api, isResponseSuccess } from '../lib/api';
import {
  isServiceUsable,
  type ServiceAvailabilityMap,
  type ServiceCode,
} from '../lib/service-availability';

const STALE_MS = 5 * 60 * 1000;

interface ServiceAvailabilityState {
  availability: ServiceAvailabilityMap | null;
  loadedAt: number | null;
  isRefreshing: boolean;
  refresh: (options?: { force?: boolean }) => Promise<void>;
  isUsable: (code: ServiceCode) => boolean;
  reset: () => void;
}

let inflight: Promise<void> | null = null;

export const useServiceAvailabilityStore = create<ServiceAvailabilityState>((set, get) => ({
  availability: null,
  loadedAt: null,
  isRefreshing: false,

  refresh: async (options) => {
    const { loadedAt, isRefreshing } = get();
    const isStale = !loadedAt || Date.now() - loadedAt > STALE_MS;
    if (!options?.force && !isStale && loadedAt) return;
    if (inflight) {
      if (!options?.force) return inflight;
      await inflight;
    }

    if (!loadedAt) {
      set({ isRefreshing: true });
    }

    inflight = (async () => {
      try {
        const res = await api.getServiceAvailability();
        if (isResponseSuccess(res) && res.data) {
          set({ availability: res.data, loadedAt: Date.now() });
        }
      } catch {
        // Keep last known availability on failure.
      } finally {
        set({ isRefreshing: false });
        inflight = null;
      }
    })();

    return inflight;
  },

  isUsable: (code) => isServiceUsable(get().availability, code),

  reset: () => {
    inflight = null;
    set({ availability: null, loadedAt: null, isRefreshing: false });
  },
}));
