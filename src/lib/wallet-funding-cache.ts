import {
  api,
  hasBvnVerified,
  isResponseSuccess,
  type FundingBank,
  type VirtualAccount,
  type WalletFundingMethods,
} from './api';
import {
  filterDynamicBanks,
  filterStaticBanks,
  normalizeFundingBank,
} from './funding-banks';

const STALE_MS = 30_000;

export const EMPTY_FUNDING_METHODS: WalletFundingMethods = {
  paystackCheckout: false,
  payvesselCheckout: false,
  permanentVirtualAccount: false,
  dynamicVirtualAccount: false,
};

export type WalletFundingSnapshot = {
  methods: WalletFundingMethods;
  virtualAccounts: VirtualAccount[];
  staticBanks: FundingBank[];
  dynamicBanks: FundingBank[];
  hasBvn: boolean;
  fetchedAt: number;
};

let memoryCache: WalletFundingSnapshot | null = null;
let inflight: Promise<WalletFundingSnapshot> | null = null;
let preloadStarted = false;

function isFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < STALE_MS;
}

async function fetchSnapshotFromApi(): Promise<WalletFundingSnapshot> {
  const [methodsRes, accountsRes, staticBanksRes, dynamicBanksRes, kycRes] = await Promise.allSettled([
    api.getFundingMethods(),
    api.getVirtualAccounts(),
    api.getVirtualAccountBanks('STATIC'),
    api.getVirtualAccountBanks('DYNAMIC'),
    api.getKycStatus(),
  ]);

  const snapshot: WalletFundingSnapshot = {
    methods: EMPTY_FUNDING_METHODS,
    virtualAccounts: [],
    staticBanks: [],
    dynamicBanks: [],
    hasBvn: false,
    fetchedAt: Date.now(),
  };

  if (methodsRes.status === 'fulfilled' && isResponseSuccess(methodsRes.value)) {
    snapshot.methods = methodsRes.value.data ?? EMPTY_FUNDING_METHODS;
  }
  if (accountsRes.status === 'fulfilled' && isResponseSuccess(accountsRes.value)) {
    snapshot.virtualAccounts = accountsRes.value.data ?? [];
  }
  if (staticBanksRes.status === 'fulfilled' && isResponseSuccess(staticBanksRes.value) && staticBanksRes.value.data) {
    snapshot.staticBanks = filterStaticBanks(staticBanksRes.value.data.map(normalizeFundingBank));
  }
  if (dynamicBanksRes.status === 'fulfilled' && isResponseSuccess(dynamicBanksRes.value) && dynamicBanksRes.value.data) {
    snapshot.dynamicBanks = filterDynamicBanks(dynamicBanksRes.value.data.map(normalizeFundingBank));
  }
  if (kycRes.status === 'fulfilled' && isResponseSuccess(kycRes.value)) {
    snapshot.hasBvn = hasBvnVerified(kycRes.value.data);
  }

  memoryCache = snapshot;
  return snapshot;
}

export function peekWalletFundingCache(): WalletFundingSnapshot | null {
  return memoryCache;
}

export function hasWalletFundingCache(): boolean {
  return memoryCache !== null;
}

export async function getWalletFundingData(options?: { force?: boolean }): Promise<WalletFundingSnapshot> {
  if (!options?.force && memoryCache) {
    if (isFresh(memoryCache.fetchedAt)) {
      return memoryCache;
    }
    void refreshWalletFundingSilently();
    return memoryCache;
  }

  if (inflight) return inflight;

  inflight = fetchSnapshotFromApi()
    .catch(() => memoryCache ?? {
      methods: EMPTY_FUNDING_METHODS,
      virtualAccounts: [],
      staticBanks: [],
      dynamicBanks: [],
      hasBvn: false,
      fetchedAt: Date.now(),
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function refreshWalletFundingSilently(): void {
  if (inflight) return;
  if (memoryCache && isFresh(memoryCache.fetchedAt)) return;
  inflight = fetchSnapshotFromApi()
    .catch(() => memoryCache)
    .finally(() => {
      inflight = null;
    }) as Promise<WalletFundingSnapshot>;
}

export function preloadWalletFundingData(): void {
  if (preloadStarted) return;
  preloadStarted = true;
  void getWalletFundingData().catch(() => {});
}

export function resetWalletFundingCache(): void {
  memoryCache = null;
  inflight = null;
  preloadStarted = false;
}
