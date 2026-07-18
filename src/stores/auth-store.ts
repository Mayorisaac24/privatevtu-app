import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../lib/api';
import { resetTransferConfigCache } from '../lib/transfer-config-cache';
import { resetWalletFundingCache } from '../lib/wallet-funding-cache';
import { resetKycStatusCache } from '../lib/kyc-status-cache';
import { resetReferralSummaryCache } from '../lib/referral-summary-cache';
import { resetTransferRecipientsCache, resetVerifiedAccountsCache } from '../lib/transfer-recipients-cache';
import { resetServiceCatalogCache } from '../lib/service-catalog-cache';
import { resetProgramsCache } from '../lib/programs-cache';
import { resetApiAccessCache } from '../lib/api-access-cache';
import { resetCatalogRevisionSync } from '../lib/catalog-revision-sync';
import { useServiceAvailabilityStore } from './service-availability-store';
import { useWalletStore } from './wallet-store';
import { useBeneficiaryStore } from './beneficiary-store';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  updateUser: (partial: Partial<User>) => void;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  clearTokens: () => Promise<void>;
  logout: () => Promise<void>;
  setError: (error: string | null) => void;
}

const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      updateUser: (partial) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...partial } });
      },
      setTokens: async (accessToken, refreshToken) => {
        await secureStorage.setItem('accessToken', accessToken);
        await secureStorage.setItem('refreshToken', refreshToken);
        set({ accessToken, isAuthenticated: true, error: null });
      },
      clearTokens: async () => {
        await secureStorage.removeItem('accessToken');
        await secureStorage.removeItem('refreshToken');
        useWalletStore.getState().resetWalletData();
        useServiceAvailabilityStore.getState().reset();
        const { resetDashboardCache } = await import('../lib/dashboard-data');
        resetDashboardCache();
        resetTransferConfigCache();
        resetWalletFundingCache();
        resetKycStatusCache();
        resetReferralSummaryCache();
        resetTransferRecipientsCache();
        resetVerifiedAccountsCache();
        resetServiceCatalogCache();
        resetProgramsCache();
        resetApiAccessCache();
        const { resetEducationCatalogCache } = await import('../lib/education-catalog-cache');
        const { resetSupportCache } = await import('../lib/support-cache');
        resetEducationCatalogCache();
        resetSupportCache();
        const { invalidateVirtualCardsCaches } = await import('../lib/virtual-cards-cache');
        invalidateVirtualCardsCaches();
        resetCatalogRevisionSync();
        useBeneficiaryStore.getState().clearAll();
        set({ accessToken: null, user: null, isAuthenticated: false, error: null });
      },
      logout: async () => {
        await get().clearTokens();
      },
      setError: (error) => set({ error }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name) => secureStorage.getItem(name),
        setItem: async (name, value) => secureStorage.setItem(name, value),
        removeItem: async (name) => secureStorage.removeItem(name),
      })),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export function waitForAuthStoreHydration(timeoutMs = 2000): Promise<void> {
  if (useAuthStore.persist.hasHydrated()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, timeoutMs);
    useAuthStore.persist.onFinishHydration(() => {
      clearTimeout(timeout);
      resolve();
    });
  });
}
