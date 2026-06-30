import { Image } from 'react-native';
import { api, isResponseSuccess, type EducationPlan, type EducationProvider } from './api';
import { getEducationProviderLogo, hasEducationProviderLogo } from './education-providers';
import { mapEducationPlanFromApi } from './education-plans';

const PROVIDER_TTL_MS = 30 * 60 * 1000;
const PLAN_TTL_MS = 15 * 60 * 1000;
const SILENT_REFRESH_MS = 5 * 60 * 1000;

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

let providersCache: CacheEntry<EducationProvider[]> | null = null;
const plansCache: Record<string, CacheEntry<EducationPlan[]>> = {};
let providersInflight: Promise<EducationProvider[]> | null = null;
const plansInflight: Record<string, Promise<EducationPlan[]> | null> = {};

let catalogVersion = 0;
const listeners = new Set<() => void>();

const EMPTY_PROVIDERS: EducationProvider[] = [];
const EMPTY_PLANS: EducationPlan[] = [];

function notifyChange(): void {
  catalogVersion += 1;
  listeners.forEach((listener) => listener());
}

export function getEducationCatalogVersion(): number {
  return catalogVersion;
}

export function subscribeEducationCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isFresh(entry: CacheEntry<unknown> | null | undefined, ttlMs: number): boolean {
  if (!entry) return false;
  return Date.now() - entry.fetchedAt < ttlMs;
}

function prefetchProviderLogos(providers: EducationProvider[]): void {
  providers.forEach((provider) => {
    const logo = getEducationProviderLogo(provider);
    if (!logo || !hasEducationProviderLogo(provider)) return;
    if (typeof logo === 'object' && 'uri' in logo && logo.uri) {
      void Image.prefetch(logo.uri);
    }
  });
}

async function fetchEducationProvidersFromApi(): Promise<EducationProvider[]> {
  const res = await api.getEducationProviders();
  if (!isResponseSuccess(res) || !Array.isArray(res.data)) {
    throw new Error(res.message || 'Failed to load education providers');
  }

  const providers = res.data;
  providersCache = { data: providers, fetchedAt: Date.now() };
  prefetchProviderLogos(providers);
  notifyChange();
  providers.forEach((provider) => {
    const code = String(provider.code || '').trim();
    if (code) {
      void getEducationPlansCached(code).catch(() => undefined);
    }
  });
  return providers;
}

async function fetchEducationPlansFromApi(provider: string): Promise<EducationPlan[]> {
  const res = await api.getEducationPlans(provider);
  if (!isResponseSuccess(res) || !Array.isArray(res.data)) {
    throw new Error(res.message || 'Failed to load education plans');
  }

  const plans = (res.data as Record<string, unknown>[]).map(mapEducationPlanFromApi);
  plansCache[provider] = { data: plans, fetchedAt: Date.now() };
  notifyChange();
  return plans;
}

export function peekEducationProviders(): EducationProvider[] {
  return providersCache?.data ?? EMPTY_PROVIDERS;
}

export function peekEducationPlans(provider: string): EducationPlan[] {
  if (!provider) return EMPTY_PLANS;
  return plansCache[provider]?.data ?? EMPTY_PLANS;
}

export function hasEducationProvidersCache(): boolean {
  return providersCache !== null;
}

export function hasEducationPlansCache(provider: string): boolean {
  return plansCache[provider] !== undefined;
}

export async function getCachedEducationProviders(options?: { forceRefresh?: boolean }): Promise<EducationProvider[]> {
  const forceRefresh = options?.forceRefresh === true;
  const cache = providersCache;

  if (!forceRefresh && cache?.data.length && isFresh(cache, PROVIDER_TTL_MS)) {
    if (Date.now() - cache.fetchedAt >= SILENT_REFRESH_MS) {
      refreshEducationProvidersSilently();
    }
    return cache.data;
  }

  if (!forceRefresh && cache?.data.length) {
    refreshEducationProvidersSilently();
    return cache.data;
  }

  if (providersInflight) return providersInflight;

  providersInflight = fetchEducationProvidersFromApi()
    .catch(() => cache?.data ?? EMPTY_PROVIDERS)
    .finally(() => {
      providersInflight = null;
    });

  return providersInflight;
}

export async function getEducationPlansCached(
  provider: string,
  options?: { forceRefresh?: boolean },
): Promise<EducationPlan[]> {
  if (!provider) return EMPTY_PLANS;

  const forceRefresh = options?.forceRefresh === true;
  const cache = plansCache[provider];

  if (!forceRefresh && cache?.data.length && isFresh(cache, PLAN_TTL_MS)) {
    return cache.data;
  }

  if (!forceRefresh && cache?.data.length) {
    refreshEducationPlansSilently(provider);
    return cache.data;
  }

  if (plansInflight[provider]) return plansInflight[provider]!;

  plansInflight[provider] = fetchEducationPlansFromApi(provider)
    .catch(() => cache?.data ?? EMPTY_PLANS)
    .finally(() => {
      plansInflight[provider] = null;
    });

  return plansInflight[provider]!;
}

export function refreshEducationProvidersSilently(): void {
  if (providersInflight) return;
  providersInflight = fetchEducationProvidersFromApi()
    .catch(() => providersCache?.data ?? EMPTY_PROVIDERS)
    .finally(() => {
      providersInflight = null;
    }) as Promise<EducationProvider[]>;
}

export function refreshEducationPlansSilently(provider: string): void {
  if (!provider || plansInflight[provider]) return;
  plansInflight[provider] = fetchEducationPlansFromApi(provider)
    .catch(() => plansCache[provider]?.data ?? EMPTY_PLANS)
    .finally(() => {
      plansInflight[provider] = null;
    });
}

let preloadStarted = false;

export function preloadEducationCatalog(): void {
  if (preloadStarted) return;
  preloadStarted = true;
  void getCachedEducationProviders().catch(() => undefined);
}

export function resetEducationCatalogCache(): void {
  providersCache = null;
  preloadStarted = false;
  Object.keys(plansCache).forEach((key) => {
    delete plansCache[key];
  });
  notifyChange();
}
