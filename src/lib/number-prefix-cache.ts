import * as SecureStore from 'expo-secure-store';
import { api, isResponseSuccess } from './api';
import { normalizeNigerianPhone } from './phone';

const STORAGE_KEY = 'pvtu_number_prefixes_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type NumberPrefixEntry = {
  prefix: string;
  networkCode: string;
  networkName: string;
};

type PrefixCache = {
  entries: NumberPrefixEntry[];
  byPrefix: Map<string, NumberPrefixEntry>;
  fetchedAt: number;
};

let memoryCache: PrefixCache | null = null;
let fetchInFlight: Promise<NumberPrefixEntry[]> | null = null;
let diskHydrated = false;

function buildCache(entries: NumberPrefixEntry[], fetchedAt: number): PrefixCache {
  const byPrefix = new Map<string, NumberPrefixEntry>();
  for (const entry of entries) {
    if (entry.prefix) byPrefix.set(entry.prefix, entry);
  }
  return { entries, byPrefix, fetchedAt };
}

async function readDiskCache(): Promise<NumberPrefixEntry[] | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { entries: NumberPrefixEntry[] };
    return Array.isArray(parsed.entries) ? parsed.entries : null;
  } catch {
    return null;
  }
}

async function writeDiskCache(entries: NumberPrefixEntry[]) {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({ entries }));
  } catch {
    // ignore persistence failures
  }
}

async function fetchFromApi(): Promise<NumberPrefixEntry[]> {
  const res = await api.getNumberPrefixes();
  if (!isResponseSuccess(res) || !Array.isArray(res.data)) {
    throw new Error(res.message || 'Failed to load number prefixes');
  }

  const entries = res.data
    .map((item) => ({
      prefix: String(item.prefix || '').trim(),
      networkCode: String(item.networkCode || '').toLowerCase(),
      networkName: String(item.networkName || '').trim(),
    }))
    .filter((item) => item.prefix.length >= 4 && item.networkCode);

  memoryCache = buildCache(entries, Date.now());
  await writeDiskCache(entries);
  return entries;
}

export function peekNumberPrefixes(): NumberPrefixEntry[] {
  return memoryCache?.entries ?? [];
}

export function detectNetworkFromPhone(phone: string): NumberPrefixEntry | null {
  const normalized = normalizeNigerianPhone(phone);
  if (normalized.length < 4 || !memoryCache) return null;
  return memoryCache.byPrefix.get(normalized.substring(0, 4)) ?? null;
}

export async function hydrateNumberPrefixCache(): Promise<NumberPrefixEntry[]> {
  if (memoryCache?.entries.length) return memoryCache.entries;
  if (diskHydrated) return memoryCache?.entries ?? [];

  diskHydrated = true;
  const disk = await readDiskCache();
  if (disk?.length) {
    memoryCache = buildCache(disk, 0);
    return disk;
  }
  return [];
}

export async function getNumberPrefixesCached(options?: {
  forceRefresh?: boolean;
}): Promise<NumberPrefixEntry[]> {
  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh && memoryCache?.entries.length) {
    const age = Date.now() - memoryCache.fetchedAt;
    if (memoryCache.fetchedAt === 0 || age < CACHE_TTL_MS) {
      return memoryCache.entries;
    }
  }

  if (!forceRefresh && !memoryCache?.entries.length) {
    const disk = await hydrateNumberPrefixCache();
    if (disk.length) return disk;
  }

  if (fetchInFlight) return fetchInFlight;

  fetchInFlight = fetchFromApi()
    .catch(() => memoryCache?.entries ?? [])
    .finally(() => {
      fetchInFlight = null;
    });

  return fetchInFlight;
}

export function preloadNumberPrefixes(): void {
  void getNumberPrefixesCached();
}

export function resetNumberPrefixCache(): void {
  memoryCache = null;
  diskHydrated = false;
  void SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => undefined);
}
