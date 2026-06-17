import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'pvtu_nigeria_locations_v1';

export type NigeriaLocationsSnapshot = {
  states: string[];
  lgasByState: Record<string, string[]>;
  fetchedAt: number;
};

let memoryCache: NigeriaLocationsSnapshot | null = null;
let hydrateInFlight: Promise<NigeriaLocationsSnapshot> | null = null;
let preloadStarted = false;

function loadBundledLocations(): NigeriaLocationsSnapshot {
  const lgasByState = require('../data/nigeria-locations.json') as Record<string, string[]>;
  const states = Object.keys(lgasByState).sort((a, b) => a.localeCompare(b));
  return { states, lgasByState, fetchedAt: Date.now() };
}

async function readDiskCache(): Promise<NigeriaLocationsSnapshot | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NigeriaLocationsSnapshot;
    if (!Array.isArray(parsed.states) || !parsed.lgasByState) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeDiskCache(snapshot: NigeriaLocationsSnapshot) {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore persistence failures
  }
}

async function hydrateLocations(): Promise<NigeriaLocationsSnapshot> {
  if (memoryCache) return memoryCache;

  const disk = await readDiskCache();
  if (disk?.states.length) {
    memoryCache = disk;
    return disk;
  }

  const bundled = loadBundledLocations();
  memoryCache = bundled;
  void writeDiskCache(bundled);
  return bundled;
}

export function peekNigeriaLocations(): NigeriaLocationsSnapshot | null {
  return memoryCache;
}

export function hasNigeriaLocationsCache(): boolean {
  return !!memoryCache?.states.length;
}

export async function getNigeriaLocationsCached(): Promise<NigeriaLocationsSnapshot> {
  if (memoryCache?.states.length) return memoryCache;

  if (hydrateInFlight) return hydrateInFlight;

  hydrateInFlight = hydrateLocations().finally(() => {
    hydrateInFlight = null;
  });

  return hydrateInFlight;
}

export function getCitiesForState(state: string, snapshot?: NigeriaLocationsSnapshot | null): string[] {
  const source = snapshot ?? memoryCache;
  if (!source || !state) return [];
  return source.lgasByState[state] ?? [];
}

export function formatStateLabel(state: string): string {
  if (state === 'Federal Capital Territory') return 'FCT (Abuja)';
  return state;
}

export const POPULAR_NIGERIA_STATES = [
  'Lagos',
  'Federal Capital Territory',
  'Rivers',
  'Kano',
  'Oyo',
] as const;

export function preloadNigeriaLocations(): void {
  if (preloadStarted) return;
  preloadStarted = true;
  void getNigeriaLocationsCached();
}

export function invalidateNigeriaLocationsCache(): void {
  memoryCache = null;
  preloadStarted = false;
  void SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => undefined);
}
