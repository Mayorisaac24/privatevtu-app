import {
  api,
  isResponseSuccess,
  type VirtualCardConfig,
  type VirtualCardSummary,
} from './api';

const LIST_STALE_MS = 30_000;
const DETAIL_STALE_MS = 30_000;
const CONFIG_STALE_MS = 60_000;

export type VirtualCardsListSnapshot = {
  cards: VirtualCardSummary[];
  config: VirtualCardConfig | null;
  fetchedAt: number;
};

export type VirtualCardDetailSnapshot = {
  card: VirtualCardSummary;
  transactions: unknown[];
  fetchedAt: number;
};

let listCache: VirtualCardsListSnapshot | null = null;
let listInflight: Promise<VirtualCardsListSnapshot> | null = null;

let configCache: { config: VirtualCardConfig | null; fetchedAt: number } | null = null;
let configInflight: Promise<VirtualCardConfig | null> | null = null;

const detailCache = new Map<string, VirtualCardDetailSnapshot>();
const detailInflight = new Map<string, Promise<VirtualCardDetailSnapshot | null>>();

function isFresh(fetchedAt: number, staleMs: number): boolean {
  return Date.now() - fetchedAt < staleMs;
}

async function fetchVirtualCardConfig(): Promise<VirtualCardConfig | null> {
  const res = await api.getVirtualCardConfig();
  if (isResponseSuccess(res) && res.data) {
    configCache = { config: res.data, fetchedAt: Date.now() };
    if (listCache) {
      listCache = { ...listCache, config: res.data, fetchedAt: listCache.fetchedAt };
    }
    return res.data;
  }
  return configCache?.config ?? null;
}

async function fetchVirtualCardsList(): Promise<VirtualCardsListSnapshot> {
  const [cardsRes, config] = await Promise.all([
    api.listVirtualCards(),
    fetchVirtualCardConfig(),
  ]);

  const cards = isResponseSuccess(cardsRes) && cardsRes.data?.cards
    ? cardsRes.data.cards
    : (listCache?.cards ?? []);

  const snapshot: VirtualCardsListSnapshot = {
    cards,
    config,
    fetchedAt: Date.now(),
  };
  listCache = snapshot;
  return snapshot;
}

async function fetchVirtualCardDetail(
  cardId: string,
  options?: { sync?: boolean },
): Promise<VirtualCardDetailSnapshot | null> {
  const [cardRes, txRes] = await Promise.all([
    options?.sync ? api.syncVirtualCard(cardId) : api.getVirtualCard(cardId),
    api.listVirtualCardTransactions(cardId),
  ]);

  let card: VirtualCardSummary | null = null;
  if (isResponseSuccess(cardRes) && cardRes.data?.card) {
    card = cardRes.data.card;
  } else if (options?.sync) {
    const fallback = await api.getVirtualCard(cardId);
    if (isResponseSuccess(fallback) && fallback.data?.card) {
      card = fallback.data.card;
    }
  }

  if (!card) {
    return detailCache.get(cardId) ?? null;
  }

  const transactions = isResponseSuccess(txRes) && txRes.data?.transactions
    ? txRes.data.transactions
    : (detailCache.get(cardId)?.transactions ?? []);

  const snapshot: VirtualCardDetailSnapshot = {
    card,
    transactions,
    fetchedAt: Date.now(),
  };
  detailCache.set(cardId, snapshot);
  upsertVirtualCardInCaches(card);
  return snapshot;
}

function upsertVirtualCardInCaches(card: VirtualCardSummary): void {
  if (!listCache) return;
  const index = listCache.cards.findIndex((entry) => entry.id === card.id);
  const cards = index >= 0
    ? listCache.cards.map((entry, i) => (i === index ? card : entry))
    : [card, ...listCache.cards];
  listCache = { ...listCache, cards };
}

export function peekVirtualCardsList(): VirtualCardsListSnapshot | null {
  return listCache;
}

export function peekVirtualCardConfig(): VirtualCardConfig | null {
  return configCache?.config ?? listCache?.config ?? null;
}

export function peekVirtualCardDetail(cardId: string): VirtualCardDetailSnapshot | null {
  return detailCache.get(cardId) ?? null;
}

export function hasVirtualCardsListCache(): boolean {
  return listCache !== null;
}

export function hasVirtualCardDetailCache(cardId: string): boolean {
  return detailCache.has(cardId);
}

export async function getVirtualCardConfig(options?: { force?: boolean }): Promise<VirtualCardConfig | null> {
  if (!options?.force && configCache?.config && isFresh(configCache.fetchedAt, CONFIG_STALE_MS)) {
    return configCache.config;
  }

  if (!options?.force && configCache?.config) {
    void refreshVirtualCardConfigSilently();
    return configCache.config;
  }

  if (configInflight) return configInflight;

  configInflight = fetchVirtualCardConfig()
    .catch(() => configCache?.config ?? null)
    .finally(() => {
      configInflight = null;
    });

  return configInflight;
}

export async function getVirtualCardsList(options?: { force?: boolean }): Promise<VirtualCardsListSnapshot> {
  if (!options?.force && listCache && isFresh(listCache.fetchedAt, LIST_STALE_MS)) {
    return listCache;
  }

  if (!options?.force && listCache) {
    void refreshVirtualCardsListSilently();
    return listCache;
  }

  if (listInflight) return listInflight;

  listInflight = fetchVirtualCardsList()
    .catch(() => listCache ?? { cards: [], config: configCache?.config ?? null, fetchedAt: 0 })
    .finally(() => {
      listInflight = null;
    });

  return listInflight;
}

export async function pullToRefreshVirtualCardsList(): Promise<VirtualCardsListSnapshot> {
  listInflight = null;
  return fetchVirtualCardsList();
}

export async function refreshVirtualCardsListIfStale(): Promise<VirtualCardsListSnapshot | null> {
  if (listCache && isFresh(listCache.fetchedAt, LIST_STALE_MS)) {
    return listCache;
  }
  return getVirtualCardsList();
}

export async function getVirtualCardDetail(
  cardId: string,
  options?: { force?: boolean; sync?: boolean },
): Promise<VirtualCardDetailSnapshot | null> {
  const cached = detailCache.get(cardId);

  if (!options?.force && !options?.sync && cached && isFresh(cached.fetchedAt, DETAIL_STALE_MS)) {
    return cached;
  }

  if (!options?.force && !options?.sync && cached) {
    void refreshVirtualCardDetailSilently(cardId);
    return cached;
  }

  const inflight = detailInflight.get(cardId);
  if (inflight) return inflight;

  const request = fetchVirtualCardDetail(cardId, { sync: options?.sync })
    .catch(() => cached ?? null)
    .finally(() => {
      detailInflight.delete(cardId);
    });

  detailInflight.set(cardId, request);
  return request;
}

export async function syncVirtualCardDetail(cardId: string): Promise<VirtualCardDetailSnapshot | null> {
  detailInflight.delete(cardId);
  return fetchVirtualCardDetail(cardId, { sync: true });
}

export async function pullToRefreshVirtualCardDetail(cardId: string): Promise<VirtualCardDetailSnapshot | null> {
  detailInflight.delete(cardId);
  return fetchVirtualCardDetail(cardId, { sync: true });
}

export function setVirtualCardDetailCache(card: VirtualCardSummary, transactions?: unknown[]): void {
  const existing = detailCache.get(card.id);
  detailCache.set(card.id, {
    card,
    transactions: transactions ?? existing?.transactions ?? [],
    fetchedAt: Date.now(),
  });
  upsertVirtualCardInCaches(card);
}

export function removeVirtualCardFromCaches(cardId: string): void {
  detailCache.delete(cardId);
  if (!listCache) return;
  listCache = {
    ...listCache,
    cards: listCache.cards.filter((entry) => entry.id !== cardId),
  };
}

export function invalidateVirtualCardsCaches(): void {
  listCache = null;
  listInflight = null;
  configCache = null;
  configInflight = null;
  detailCache.clear();
  detailInflight.clear();
}

function refreshVirtualCardConfigSilently(): void {
  if (configInflight) return;
  if (configCache && isFresh(configCache.fetchedAt, CONFIG_STALE_MS)) return;
  configInflight = fetchVirtualCardConfig()
    .catch(() => configCache?.config ?? null)
    .finally(() => {
      configInflight = null;
    }) as Promise<VirtualCardConfig | null>;
}

function refreshVirtualCardsListSilently(): void {
  if (listInflight) return;
  if (listCache && isFresh(listCache.fetchedAt, LIST_STALE_MS)) return;
  listInflight = fetchVirtualCardsList()
    .catch(() => listCache ?? { cards: [], config: configCache?.config ?? null, fetchedAt: 0 })
    .finally(() => {
      listInflight = null;
    });
}

function refreshVirtualCardDetailSilently(cardId: string): void {
  if (detailInflight.has(cardId)) return;
  const cached = detailCache.get(cardId);
  if (cached && isFresh(cached.fetchedAt, DETAIL_STALE_MS)) return;
  const request = fetchVirtualCardDetail(cardId)
    .catch(() => cached ?? null)
    .finally(() => {
      detailInflight.delete(cardId);
    });
  detailInflight.set(cardId, request);
}

export function preloadVirtualCardsList(): void {
  void getVirtualCardsList().catch(() => undefined);
}
