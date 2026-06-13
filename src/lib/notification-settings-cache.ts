import * as SecureStore from 'expo-secure-store';
import { api, isResponseSuccess, type NotificationSettings } from './api';

const STORAGE_KEY = 'pvtu_notification_settings_v1';
const CACHE_TTL_MS = 5 * 60 * 1000;

let memoryCache: { settings: NotificationSettings; fetchedAt: number } | null = null;
let fetchInFlight: Promise<NotificationSettings> | null = null;
let diskHydrated = false;

async function readDiskCache(): Promise<NotificationSettings | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NotificationSettings;
  } catch {
    return null;
  }
}

async function writeDiskCache(settings: NotificationSettings) {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore persistence failures
  }
}

async function fetchFromApi(): Promise<NotificationSettings> {
  const res = await api.getNotificationSettings();
  if (!isResponseSuccess(res) || !res.data) {
    throw new Error(res.message || 'Failed to load notification settings');
  }
  memoryCache = { settings: res.data, fetchedAt: Date.now() };
  await writeDiskCache(res.data);
  return res.data;
}

export function peekNotificationSettings(): NotificationSettings | null {
  return memoryCache?.settings ?? null;
}

export function setNotificationSettingsCache(settings: NotificationSettings) {
  memoryCache = { settings, fetchedAt: Date.now() };
  void writeDiskCache(settings);
}

export function invalidateNotificationSettingsCache() {
  memoryCache = null;
  void SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => undefined);
}

export async function hydrateNotificationSettingsCache(): Promise<NotificationSettings | null> {
  if (memoryCache?.settings) return memoryCache.settings;
  if (diskHydrated) return memoryCache?.settings ?? null;

  diskHydrated = true;
  const disk = await readDiskCache();
  if (disk) {
    memoryCache = { settings: disk, fetchedAt: 0 };
    return disk;
  }
  return null;
}

export async function getNotificationSettingsCached(options?: {
  forceRefresh?: boolean;
}): Promise<NotificationSettings> {
  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh && memoryCache?.settings) {
    const age = Date.now() - memoryCache.fetchedAt;
    if (memoryCache.fetchedAt === 0 || age < CACHE_TTL_MS) {
      return memoryCache.settings;
    }
  }

  if (!forceRefresh && !memoryCache?.settings) {
    const disk = await hydrateNotificationSettingsCache();
    if (disk) return disk;
  }

  if (fetchInFlight) {
    return fetchInFlight;
  }

  fetchInFlight = fetchFromApi()
    .catch((error) => {
      if (memoryCache?.settings) return memoryCache.settings;
      throw error;
    })
    .finally(() => {
      fetchInFlight = null;
    });

  return fetchInFlight;
}

export function refreshNotificationSettingsSilently() {
  if (fetchInFlight) return;
  fetchInFlight = fetchFromApi()
    .catch(() => memoryCache?.settings)
    .finally(() => {
      fetchInFlight = null;
    }) as Promise<NotificationSettings>;
}
