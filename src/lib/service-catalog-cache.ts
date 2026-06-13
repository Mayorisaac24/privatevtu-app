import {
  api,
  isResponseSuccess,
  type AirtimeProvider,
  type CablePlan,
  type CableProvider,
  type DataCategory,
  type DataPlan,
  type ElectricityProvider,
} from './api';
import {
  filterPlansByActiveCategories,
  mapDataPlanFromApi,
} from './data-plans';
import {
  getCachedElectricityDiscos,
  hasElectricityDiscosCache,
  peekCachedElectricityDiscos,
  preloadElectricityDiscos,
  refreshElectricityDiscosSilently,
  resetElectricityDiscosCache,
  subscribeElectricityDiscos,
} from './electricity-discos-cache';

const PROVIDER_TTL_MS = 30 * 60 * 1000;
const PLAN_TTL_MS = 15 * 60 * 1000;

export type ServiceProviderKind = 'airtime' | 'data' | 'cable' | 'electricity';

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

type ProviderCacheMap = {
  airtime: CacheEntry<AirtimeProvider[]> | null;
  data: CacheEntry<AirtimeProvider[]> | null;
  cable: CacheEntry<CableProvider[]> | null;
  electricity: CacheEntry<ElectricityProvider[]> | null;
};

const providerCaches: ProviderCacheMap = {
  airtime: null,
  data: null,
  cable: null,
  electricity: null,
};

const dataCategoriesCache: Record<string, CacheEntry<DataCategory[]>> = {};
const dataPlansCache: Record<string, CacheEntry<DataPlan[]>> = {};
const cablePlansCache: Record<string, CacheEntry<CablePlan[]>> = {};

const providerInflight: Record<ServiceProviderKind, Promise<unknown> | null> = {
  airtime: null,
  data: null,
  cable: null,
  electricity: null,
};

const dataCategoriesInflight: Record<string, Promise<DataCategory[]> | null> = {};
const dataPlansInflight: Record<string, Promise<DataPlan[]> | null> = {};
const cablePlansInflight: Record<string, Promise<CablePlan[]> | null> = {};

const EMPTY_AIRTIME_PROVIDERS: AirtimeProvider[] = [];
const EMPTY_CABLE_PROVIDERS: CableProvider[] = [];
const EMPTY_ELECTRICITY_PROVIDERS: ElectricityProvider[] = [];
const EMPTY_DATA_CATEGORIES: DataCategory[] = [];
const EMPTY_DATA_PLANS: DataPlan[] = [];
const EMPTY_CABLE_PLANS: CablePlan[] = [];

let catalogVersion = 0;
const listeners = new Set<() => void>();

function notifyCatalogChange(): void {
  catalogVersion += 1;
  listeners.forEach((listener) => listener());
}

export function getServiceCatalogVersion(): number {
  return catalogVersion;
}

export function subscribeServiceCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isFresh(entry: CacheEntry<unknown> | null | undefined, ttlMs: number): boolean {
  if (!entry) return false;
  return Date.now() - entry.fetchedAt < ttlMs;
}

function mapCablePlanFromApi(raw: Record<string, unknown>): CablePlan {
  const platformPrice = Number(raw.platformPrice ?? raw.price ?? 0);
  const priceKobo = Number.isFinite(platformPrice) ? platformPrice : 0;

  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    validity: String(raw.validity ?? ''),
    price: priceKobo,
    platformPrice: priceKobo,
    validityDays: raw.validityDays != null ? Number(raw.validityDays) : undefined,
  };
}

async function fetchAirtimeProviders(): Promise<AirtimeProvider[]> {
  const res = await api.getAirtimeProviders();
  if (!isResponseSuccess(res) || !Array.isArray(res.data)) {
    throw new Error(res.message || 'Failed to load airtime providers');
  }
  const providers = res.data;
  providerCaches.airtime = { data: providers, fetchedAt: Date.now() };
  notifyCatalogChange();
  return providers;
}

async function fetchDataProviders(): Promise<AirtimeProvider[]> {
  const res = await api.getDataProviders();
  if (!isResponseSuccess(res) || !Array.isArray(res.data)) {
    throw new Error(res.message || 'Failed to load data providers');
  }
  const providers = res.data;
  providerCaches.data = { data: providers, fetchedAt: Date.now() };
  notifyCatalogChange();
  return providers;
}

async function fetchCableProviders(): Promise<CableProvider[]> {
  const res = await api.getCableProviders();
  if (!isResponseSuccess(res) || !Array.isArray(res.data)) {
    throw new Error(res.message || 'Failed to load cable providers');
  }
  const providers = res.data;
  providerCaches.cable = { data: providers, fetchedAt: Date.now() };
  notifyCatalogChange();
  return providers;
}

async function fetchElectricityProviders(): Promise<ElectricityProvider[]> {
  return getCachedElectricityDiscos({ forceRefresh: true });
}

async function fetchProvidersByKind(kind: ServiceProviderKind): Promise<unknown> {
  switch (kind) {
    case 'airtime':
      return fetchAirtimeProviders();
    case 'data':
      return fetchDataProviders();
    case 'cable':
      return fetchCableProviders();
    case 'electricity':
      return fetchElectricityProviders();
  }
}

export function peekServiceProviders(kind: 'airtime'): AirtimeProvider[];
export function peekServiceProviders(kind: 'data'): AirtimeProvider[];
export function peekServiceProviders(kind: 'cable'): CableProvider[];
export function peekServiceProviders(kind: 'electricity'): ElectricityProvider[];
export function peekServiceProviders(kind: ServiceProviderKind): unknown[] {
  if (kind === 'electricity') {
    return peekCachedElectricityDiscos() ?? EMPTY_ELECTRICITY_PROVIDERS;
  }
  const data = providerCaches[kind]?.data;
  if (data) return data;
  if (kind === 'cable') return EMPTY_CABLE_PROVIDERS;
  return EMPTY_AIRTIME_PROVIDERS;
}

export function hasServiceProvidersCache(kind: ServiceProviderKind): boolean {
  if (kind === 'electricity') return hasElectricityDiscosCache();
  return providerCaches[kind] !== null;
}

export function hasDataCategoriesCache(network: string): boolean {
  return !!network && dataCategoriesCache[network] != null;
}

export function hasDataPlansCache(network: string): boolean {
  return !!network && dataPlansCache[network] != null;
}

export function hasCablePlansCache(provider: string): boolean {
  return !!provider && cablePlansCache[provider] != null;
}

export async function getServiceProvidersCached<K extends ServiceProviderKind>(
  kind: K,
  options?: { forceRefresh?: boolean },
): Promise<ProviderCacheMap[K] extends CacheEntry<infer T> | null ? T : never> {
  if (kind === 'electricity') {
    return getCachedElectricityDiscos(options) as never;
  }

  const forceRefresh = options?.forceRefresh === true;
  const cache = providerCaches[kind];

  if (!forceRefresh && cache?.data.length && isFresh(cache, PROVIDER_TTL_MS)) {
    return cache.data as never;
  }

  if (!forceRefresh && cache?.data.length) {
    refreshServiceProvidersSilently(kind);
    return cache.data as never;
  }

  if (providerInflight[kind]) {
    return providerInflight[kind]! as never;
  }

  providerInflight[kind] = fetchProvidersByKind(kind)
    .catch(() => cache?.data ?? [])
    .finally(() => {
      providerInflight[kind] = null;
    });

  return providerInflight[kind]! as never;
}

export function refreshServiceProvidersSilently(kind: ServiceProviderKind): void {
  if (kind === 'electricity') {
    refreshElectricityDiscosSilently();
    return;
  }

  if (providerInflight[kind]) return;
  providerInflight[kind] = fetchProvidersByKind(kind)
    .catch(() => providerCaches[kind]?.data ?? [])
    .finally(() => {
      providerInflight[kind] = null;
    });
}

export function peekDataCategories(network: string): DataCategory[] {
  return dataCategoriesCache[network]?.data ?? EMPTY_DATA_CATEGORIES;
}

export function peekDataPlans(network: string): DataPlan[] {
  return dataPlansCache[network]?.data ?? EMPTY_DATA_PLANS;
}

export function peekCablePlans(provider: string): CablePlan[] {
  return cablePlansCache[provider]?.data ?? EMPTY_CABLE_PLANS;
}

async function fetchDataCategories(network: string): Promise<DataCategory[]> {
  const res = await api.getDataCategories(network);
  const categories = res.success && Array.isArray(res.data) ? res.data : [];
  dataCategoriesCache[network] = { data: categories, fetchedAt: Date.now() };
  notifyCatalogChange();
  return categories;
}

async function fetchDataPlans(network: string): Promise<DataPlan[]> {
  const [categories, plansRes] = await Promise.all([
    peekDataCategories(network).length
      ? Promise.resolve(peekDataCategories(network))
      : fetchDataCategories(network).catch(() => [] as DataCategory[]),
    api.getDataPlans(network),
  ]);

  if (!plansRes.success || !Array.isArray(plansRes.data)) {
    throw new Error(plansRes.message || 'Failed to load data plans');
  }

  const rawPlans = plansRes.data as Record<string, unknown>[];
  const visiblePlans = filterPlansByActiveCategories(rawPlans, categories);
  const plans = visiblePlans.map(mapDataPlanFromApi);
  dataPlansCache[network] = { data: plans, fetchedAt: Date.now() };
  notifyCatalogChange();
  return plans;
}

async function fetchCablePlans(provider: string): Promise<CablePlan[]> {
  const res = await api.getCablePlans(provider);
  if (!res.success || !Array.isArray(res.data)) {
    throw new Error(res.message || 'Failed to load cable plans');
  }

  const plans = (res.data as Record<string, unknown>[]).map(mapCablePlanFromApi);
  cablePlansCache[provider] = { data: plans, fetchedAt: Date.now() };
  notifyCatalogChange();
  return plans;
}

export async function getDataCategoriesCached(
  network: string,
  options?: { forceRefresh?: boolean },
): Promise<DataCategory[]> {
  if (!network) return [];
  const forceRefresh = options?.forceRefresh === true;
  const cache = dataCategoriesCache[network];

  if (!forceRefresh && cache?.data.length && isFresh(cache, PLAN_TTL_MS)) {
    return cache.data;
  }

  if (!forceRefresh && cache?.data.length) {
    refreshDataCategoriesSilently(network);
    return cache.data;
  }

  if (dataCategoriesInflight[network]) return dataCategoriesInflight[network]!;

  dataCategoriesInflight[network] = fetchDataCategories(network)
    .catch(() => cache?.data ?? [])
    .finally(() => {
      dataCategoriesInflight[network] = null;
    });

  return dataCategoriesInflight[network]!;
}

export async function getDataPlansCached(
  network: string,
  options?: { forceRefresh?: boolean },
): Promise<DataPlan[]> {
  if (!network) return [];
  const forceRefresh = options?.forceRefresh === true;
  const cache = dataPlansCache[network];

  if (!forceRefresh && cache?.data.length && isFresh(cache, PLAN_TTL_MS)) {
    return cache.data;
  }

  if (!forceRefresh && cache?.data.length) {
    refreshDataPlansSilently(network);
    return cache.data;
  }

  if (dataPlansInflight[network]) return dataPlansInflight[network]!;

  dataPlansInflight[network] = fetchDataPlans(network)
    .catch(() => cache?.data ?? [])
    .finally(() => {
      dataPlansInflight[network] = null;
    });

  return dataPlansInflight[network]!;
}

export async function getCablePlansCached(
  provider: string,
  options?: { forceRefresh?: boolean },
): Promise<CablePlan[]> {
  if (!provider) return [];
  const forceRefresh = options?.forceRefresh === true;
  const cache = cablePlansCache[provider];

  if (!forceRefresh && cache?.data.length && isFresh(cache, PLAN_TTL_MS)) {
    return cache.data;
  }

  if (!forceRefresh && cache?.data.length) {
    refreshCablePlansSilently(provider);
    return cache.data;
  }

  if (cablePlansInflight[provider]) return cablePlansInflight[provider]!;

  cablePlansInflight[provider] = fetchCablePlans(provider)
    .catch(() => cache?.data ?? [])
    .finally(() => {
      cablePlansInflight[provider] = null;
    });

  return cablePlansInflight[provider]!;
}

export function refreshDataCategoriesSilently(network: string): void {
  if (!network || dataCategoriesInflight[network]) return;
  dataCategoriesInflight[network] = fetchDataCategories(network)
    .catch(() => dataCategoriesCache[network]?.data ?? [])
    .finally(() => {
      dataCategoriesInflight[network] = null;
    });
}

export function refreshDataPlansSilently(network: string): void {
  if (!network || dataPlansInflight[network]) return;
  dataPlansInflight[network] = fetchDataPlans(network)
    .catch(() => dataPlansCache[network]?.data ?? [])
    .finally(() => {
      dataPlansInflight[network] = null;
    });
}

export function refreshCablePlansSilently(provider: string): void {
  if (!provider || cablePlansInflight[provider]) return;
  cablePlansInflight[provider] = fetchCablePlans(provider)
    .catch(() => cablePlansCache[provider]?.data ?? [])
    .finally(() => {
      cablePlansInflight[provider] = null;
    });
}

export function refreshServiceCatalogSilently(): void {
  (['airtime', 'data', 'cable', 'electricity'] as ServiceProviderKind[]).forEach((kind) => {
    refreshServiceProvidersSilently(kind);
  });
}

export function preloadServiceCatalog(): void {
  void getServiceProvidersCached('airtime');
  void getServiceProvidersCached('data');
  void getServiceProvidersCached('cable');
  preloadElectricityDiscos();
}

export function resetServiceCatalogCache(): void {
  providerCaches.airtime = null;
  providerCaches.data = null;
  providerCaches.cable = null;
  providerCaches.electricity = null;
  resetElectricityDiscosCache();

  Object.keys(dataCategoriesCache).forEach((key) => {
    delete dataCategoriesCache[key];
  });
  Object.keys(dataPlansCache).forEach((key) => {
    delete dataPlansCache[key];
  });
  Object.keys(cablePlansCache).forEach((key) => {
    delete cablePlansCache[key];
  });

  notifyCatalogChange();
}

subscribeElectricityDiscos(() => {
  notifyCatalogChange();
});
