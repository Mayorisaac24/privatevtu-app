import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../lib/api';
import { resetDashboardCache } from '../lib/dashboard-data';
import { resetTransferConfigCache } from '../lib/transfer-config-cache';
import { resetWalletFundingCache } from '../lib/wallet-funding-cache';
import { useServiceAvailabilityStore } from './service-availability-store';
import { useWalletStore } from './wallet-store';

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
        set({ accessToken, error: null });
      },
      clearTokens: async () => {
        await secureStorage.removeItem('accessToken');
        await secureStorage.removeItem('refreshToken');
        useWalletStore.getState().resetWalletData();
        useServiceAvailabilityStore.getState().reset();
        resetDashboardCache();
        resetTransferConfigCache();
        resetWalletFundingCache();
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
