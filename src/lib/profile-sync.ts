import { api, isResponseSuccess, type User } from './api';
import { useAuthStore } from '../stores';

export async function refreshUserProfile(): Promise<User | null> {
  try {
    const res = await api.getProfile();
    if (isResponseSuccess(res) && res.data) {
      useAuthStore.getState().setUser(res.data);
      return res.data;
    }
  } catch {
    // Keep cached profile when offline.
  }
  return useAuthStore.getState().user;
}
