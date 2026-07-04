import {
  api,
  isResponseSuccess,
  type UpgradeProgram,
  type UserTypeSnapshot,
  type UserTypeUpgradeRecord,
} from './api';

const STALE_MS = 5 * 60 * 1000;

export type ProgramsSnapshot = {
  currentType: UserTypeSnapshot | null;
  programs: UpgradeProgram[];
  history: UserTypeUpgradeRecord[];
};

let memoryCache: ProgramsSnapshot | null = null;
let fetchedAt: number | null = null;
let inflight: Promise<ProgramsSnapshot | null> | null = null;
let preloadStarted = false;

function isFresh(): boolean {
  return fetchedAt !== null && Date.now() - fetchedAt < STALE_MS;
}

async function fetchFromApi(): Promise<ProgramsSnapshot | null> {
  const [typeRes, programsRes, historyRes] = await Promise.all([
    api.getMyUserType(),
    api.getUpgradePrograms(),
    api.getUserTypeUpgrades(),
  ]);

  const snapshot: ProgramsSnapshot = {
    currentType: isResponseSuccess(typeRes) && typeRes.data ? typeRes.data : memoryCache?.currentType ?? null,
    programs: isResponseSuccess(programsRes) && programsRes.data ? programsRes.data : [],
    history: isResponseSuccess(historyRes) && historyRes.data ? historyRes.data : [],
  };

  memoryCache = snapshot;
  fetchedAt = Date.now();
  return snapshot;
}

export function peekProgramsCache(): ProgramsSnapshot | null {
  return memoryCache;
}

export function hasProgramsCache(): boolean {
  return memoryCache !== null;
}

export function invalidateProgramsCache(): void {
  memoryCache = null;
  fetchedAt = null;
  inflight = null;
}

export async function getProgramsData(options?: { force?: boolean }): Promise<ProgramsSnapshot | null> {
  if (!options?.force && memoryCache) {
    if (isFresh()) return memoryCache;
    void refreshProgramsSilently();
    return memoryCache;
  }

  if (inflight) return inflight;

  inflight = fetchFromApi()
    .catch(() => memoryCache)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export async function pullToRefreshPrograms(): Promise<ProgramsSnapshot | null> {
  inflight = null;
  fetchedAt = null;
  return fetchFromApi();
}

export function refreshProgramsSilently(): void {
  if (inflight || isFresh()) return;

  inflight = fetchFromApi()
    .catch(() => memoryCache)
    .finally(() => {
      inflight = null;
    }) as Promise<ProgramsSnapshot | null>;
}

export function preloadProgramsData(): void {
  if (preloadStarted) return;
  preloadStarted = true;
  void getProgramsData().catch(() => undefined);
}

export function resetProgramsCache(): void {
  invalidateProgramsCache();
  preloadStarted = false;
}

export function getProgramsProfileSubtitle(snapshot?: ProgramsSnapshot | null): string {
  const type = snapshot?.currentType ?? memoryCache?.currentType;
  if (!type) return 'Upgrade your pricing tier';
  const label = type.name || type.code || 'Default';
  return `Current plan: ${label}`;
}
