import { api, isResponseSuccess } from './api';
import type { DisputeRecord, FaqCategory, SupportConfig } from './support';

export type ContentPageData = {
  slug: string;
  title: string;
  body: string;
  updatedAt?: string | null;
};

export type FaqData = {
  intro: string;
  categories: FaqCategory[];
};

const CONTENT_TTL_MS = 30 * 60 * 1000;
const FAQ_TTL_MS = 30 * 60 * 1000;
const CONFIG_TTL_MS = 30 * 60 * 1000;
const DISPUTES_TTL_MS = 2 * 60 * 1000;
const SILENT_REFRESH_MS = 3 * 60 * 1000;

const EMPTY_CATEGORIES: FaqCategory[] = [];
const EMPTY_DISPUTES: DisputeRecord[] = [];
const EMPTY_FAQ: FaqData = { intro: '', categories: EMPTY_CATEGORIES };
const EMPTY_CONTENT: ContentPageData = { slug: '', title: '', body: '' };

type CacheEntry<T> = { data: T; fetchedAt: number };

const contentCache: Record<string, CacheEntry<ContentPageData>> = {};
let faqCache: CacheEntry<FaqData> | null = null;
let configCache: CacheEntry<SupportConfig> | null = null;
let disputesCache: CacheEntry<DisputeRecord[]> | null = null;

const contentInflight: Record<string, Promise<ContentPageData> | null> = {};
let faqInflight: Promise<FaqData> | null = null;
let configInflight: Promise<SupportConfig> | null = null;
let disputesInflight: Promise<DisputeRecord[]> | null = null;

let preloadStarted = false;

function isFresh(entry: CacheEntry<unknown> | null | undefined, ttlMs: number): boolean {
  if (!entry) return false;
  return Date.now() - entry.fetchedAt < ttlMs;
}

function shouldSilentRefresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt >= SILENT_REFRESH_MS;
}

async function fetchContentPage(slug: string): Promise<ContentPageData> {
  const res = await api.getContentPage(slug);
  if (!isResponseSuccess(res) || !res.data) {
    throw new Error(res.message || 'Failed to load page');
  }

  const page: ContentPageData = {
    slug: res.data.slug || slug,
    title: res.data.title,
    body: res.data.body,
    updatedAt: res.data.updatedAt ?? null,
  };
  contentCache[slug] = { data: page, fetchedAt: Date.now() };
  return page;
}

async function fetchFaqData(): Promise<FaqData> {
  const [introRes, faqRes] = await Promise.all([
    api.getContentPage('help'),
    api.getFaq(),
  ]);

  const data: FaqData = {
    intro: isResponseSuccess(introRes) && introRes.data ? introRes.data.body : '',
    categories: isResponseSuccess(faqRes) && faqRes.data?.categories
      ? faqRes.data.categories
      : EMPTY_CATEGORIES,
  };
  faqCache = { data, fetchedAt: Date.now() };
  return data;
}

async function fetchSupportConfig(): Promise<SupportConfig> {
  const res = await api.getSupportConfig();
  if (!isResponseSuccess(res) || !res.data) {
    throw new Error(res.message || 'Failed to load support config');
  }
  configCache = { data: res.data, fetchedAt: Date.now() };
  return res.data;
}

async function fetchDisputes(): Promise<DisputeRecord[]> {
  const res = await api.getDisputes({ pageSize: 50 });
  if (!isResponseSuccess(res) || !res.data) {
    throw new Error(res.message || 'Failed to load disputes');
  }
  const disputes = Array.isArray(res.data.disputes) ? res.data.disputes : EMPTY_DISPUTES;
  disputesCache = { data: disputes, fetchedAt: Date.now() };
  return disputes;
}

export function peekContentPage(slug: string): ContentPageData {
  return contentCache[slug]?.data ?? { ...EMPTY_CONTENT, slug };
}

export function hasContentPageCache(slug: string): boolean {
  return contentCache[slug] != null;
}

export function peekFaqData(): FaqData {
  return faqCache?.data ?? EMPTY_FAQ;
}

export function hasFaqCache(): boolean {
  return faqCache != null;
}

export function peekSupportConfig(): SupportConfig | null {
  return configCache?.data ?? null;
}

export function hasSupportConfigCache(): boolean {
  return configCache != null;
}

export function peekDisputes(): DisputeRecord[] {
  return disputesCache?.data ?? EMPTY_DISPUTES;
}

export function hasDisputesCache(): boolean {
  return disputesCache != null;
}

export async function getCachedContentPage(
  slug: string,
  options?: { forceRefresh?: boolean },
): Promise<ContentPageData> {
  const forceRefresh = options?.forceRefresh === true;
  const cache = contentCache[slug];

  if (!forceRefresh && cache && isFresh(cache, CONTENT_TTL_MS)) {
    if (shouldSilentRefresh(cache.fetchedAt)) {
      refreshContentPageSilently(slug);
    }
    return cache.data;
  }

  if (!forceRefresh && cache) {
    refreshContentPageSilently(slug);
    return cache.data;
  }

  if (contentInflight[slug]) return contentInflight[slug]!;

  contentInflight[slug] = fetchContentPage(slug)
    .catch(() => cache?.data ?? { ...EMPTY_CONTENT, slug })
    .finally(() => {
      contentInflight[slug] = null;
    });

  return contentInflight[slug]!;
}

export async function getCachedFaqData(options?: { forceRefresh?: boolean }): Promise<FaqData> {
  const forceRefresh = options?.forceRefresh === true;
  const cache = faqCache;

  if (!forceRefresh && cache && isFresh(cache, FAQ_TTL_MS)) {
    if (shouldSilentRefresh(cache.fetchedAt)) {
      refreshFaqSilently();
    }
    return cache.data;
  }

  if (!forceRefresh && cache) {
    refreshFaqSilently();
    return cache.data;
  }

  if (faqInflight) return faqInflight;

  faqInflight = fetchFaqData()
    .catch(() => cache?.data ?? EMPTY_FAQ)
    .finally(() => {
      faqInflight = null;
    });

  return faqInflight;
}

export async function getCachedSupportConfig(options?: { forceRefresh?: boolean }): Promise<SupportConfig | null> {
  const forceRefresh = options?.forceRefresh === true;
  const cache = configCache;

  if (!forceRefresh && cache && isFresh(cache, CONFIG_TTL_MS)) {
    if (shouldSilentRefresh(cache.fetchedAt)) {
      refreshSupportConfigSilently();
    }
    return cache.data;
  }

  if (!forceRefresh && cache) {
    refreshSupportConfigSilently();
    return cache.data;
  }

  if (configInflight) return configInflight;

  configInflight = fetchSupportConfig()
    .catch(() => cache?.data ?? null)
    .finally(() => {
      configInflight = null;
    });

  return configInflight;
}

export async function getCachedDisputes(options?: { forceRefresh?: boolean }): Promise<DisputeRecord[]> {
  const forceRefresh = options?.forceRefresh === true;
  const cache = disputesCache;

  if (!forceRefresh && cache && isFresh(cache, DISPUTES_TTL_MS)) {
    if (shouldSilentRefresh(cache.fetchedAt)) {
      refreshDisputesSilently();
    }
    return cache.data;
  }

  if (!forceRefresh && cache?.data.length) {
    refreshDisputesSilently();
    return cache.data;
  }

  if (disputesInflight) return disputesInflight;

  disputesInflight = fetchDisputes()
    .catch(() => cache?.data ?? EMPTY_DISPUTES)
    .finally(() => {
      disputesInflight = null;
    });

  return disputesInflight;
}

export function refreshContentPageSilently(slug: string): void {
  if (!slug || contentInflight[slug]) return;
  contentInflight[slug] = fetchContentPage(slug)
    .catch(() => contentCache[slug]?.data ?? { ...EMPTY_CONTENT, slug })
    .finally(() => {
      contentInflight[slug] = null;
    }) as Promise<ContentPageData>;
}

export function refreshFaqSilently(): void {
  if (faqInflight) return;
  faqInflight = fetchFaqData()
    .catch(() => faqCache?.data ?? EMPTY_FAQ)
    .finally(() => {
      faqInflight = null;
    }) as Promise<FaqData>;
}

export function refreshSupportConfigSilently(): void {
  if (configInflight) return;
  configInflight = fetchSupportConfig()
    .catch(() => configCache?.data ?? null)
    .finally(() => {
      configInflight = null;
    }) as Promise<SupportConfig>;
}

export function refreshDisputesSilently(): void {
  if (disputesInflight) return;
  disputesInflight = fetchDisputes()
    .catch(() => disputesCache?.data ?? EMPTY_DISPUTES)
    .finally(() => {
      disputesInflight = null;
    }) as Promise<DisputeRecord[]>;
}

export function invalidateDisputesCache(): void {
  disputesCache = null;
}

export function preloadSupportContent(): void {
  if (preloadStarted) return;
  preloadStarted = true;
  void getCachedFaqData().catch(() => undefined);
  void getCachedContentPage('privacy').catch(() => undefined);
  void getCachedContentPage('terms').catch(() => undefined);
  void getCachedSupportConfig().catch(() => undefined);
}

export function resetSupportCache(): void {
  Object.keys(contentCache).forEach((key) => {
    delete contentCache[key];
  });
  faqCache = null;
  configCache = null;
  disputesCache = null;
  preloadStarted = false;
}
