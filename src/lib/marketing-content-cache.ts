import { api, isResponseSuccess } from './api';

const CACHE_TTL_MS = 90 * 1000;

type AdRecord = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  ctaLabel?: string | null;
  placement: 'BANNER' | 'CARD' | 'MODAL' | 'TOP_BANNER';
  actionType?: 'NONE' | 'URL' | 'SCREEN';
  actionRoute?: string | null;
  frequency?: 'UNLIMITED' | 'ONCE' | 'ONCE_PER_DAY' | 'ONCE_PER_SESSION';
  maxImpressions?: number | null;
};

type BroadcastRecord = {
  id: string;
  title: string;
  body?: string | null;
  imageUrl?: string | null;
  displayType: string;
  actionRoute?: string | null;
  actionLabel?: string | null;
};

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

const adsCache = new Map<string, CacheEntry<AdRecord[]>>();
const broadcastsCache = new Map<string, CacheEntry<BroadcastRecord[]>>();
const adsInflight = new Map<string, Promise<AdRecord[]>>();
const broadcastsInflight = new Map<string, Promise<BroadcastRecord[]>>();

function isFresh(fetchedAt: number) {
  return Date.now() - fetchedAt < CACHE_TTL_MS;
}

function adsKey(screen: string, channel: 'mobile' | 'web') {
  return `${screen}:${channel}`;
}

function broadcastsKey(screen?: string) {
  return screen ?? 'all';
}

export function invalidateMarketingContentCache() {
  adsCache.clear();
  broadcastsCache.clear();
}

export async function getCachedActiveAds(params: {
  screen: string;
  channel: 'mobile' | 'web';
  forceRefresh?: boolean;
}): Promise<AdRecord[]> {
  const key = adsKey(params.screen, params.channel);
  const cached = adsCache.get(key);

  if (!params.forceRefresh && cached && isFresh(cached.fetchedAt)) {
    return cached.data;
  }

  const inflight = adsInflight.get(key);
  if (inflight) {
    return inflight;
  }

  const request = api
    .getActiveAds({ screen: params.screen, channel: params.channel })
    .then((res) => {
      if (!isResponseSuccess(res) || !res.data?.ads) {
        return cached?.data ?? [];
      }

      const data = res.data.ads as AdRecord[];
      adsCache.set(key, { data, fetchedAt: Date.now() });
      return data;
    })
    .catch(() => cached?.data ?? [])
    .finally(() => {
      adsInflight.delete(key);
    });

  adsInflight.set(key, request);
  return request;
}

export async function getCachedActiveBroadcasts(params?: {
  screen?: string;
  forceRefresh?: boolean;
}): Promise<BroadcastRecord[]> {
  const key = broadcastsKey(params?.screen);
  const cached = broadcastsCache.get(key);

  if (!params?.forceRefresh && cached && isFresh(cached.fetchedAt)) {
    return cached.data;
  }

  const inflight = broadcastsInflight.get(key);
  if (inflight) {
    return inflight;
  }

  const request = api
    .getActiveBroadcasts(params?.screen ? { screen: params.screen } : undefined)
    .then((res) => {
      if (!isResponseSuccess(res) || !res.data?.broadcasts) {
        return cached?.data ?? [];
      }

      const data = res.data.broadcasts as BroadcastRecord[];
      broadcastsCache.set(key, { data, fetchedAt: Date.now() });
      return data;
    })
    .catch(() => cached?.data ?? [])
    .finally(() => {
      broadcastsInflight.delete(key);
    });

  broadcastsInflight.set(key, request);
  return request;
}

export type { AdRecord, BroadcastRecord };
