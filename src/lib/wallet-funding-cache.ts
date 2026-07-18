import {
  api,
  hasBvnVerified,
  hasTier2IdentityVerified,
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

export type WalletTierLimits = {
  daily: string;
  monthly: string;
  single: string;
};

export type WalletFundingSnapshot = {
  methods: WalletFundingMethods;
  virtualAccounts: VirtualAccount[];
  staticBanks: FundingBank[];
  dynamicBanks: FundingBank[];
  hasBvn: boolean;
  kycTier: string | null;
  tierLimits: WalletTierLimits | null;
  fetchedAt: number;
};

let memoryCache: WalletFundingSnapshot | null = null;
let inflight: Promise<WalletFundingSnapshot> | null = null;
let accountsInflight: Promise<VirtualAccount[]> | null = null;
let accountsHydrated = false;
/** True only after a full `/wallet/funding-methods` + banks + KYC snapshot has completed. */
let fullSnapshotHydrated = false;
let preloadStarted = false;
let accountsPreloadStarted = false;

function isFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < STALE_MS;
}

function emptySnapshot(): WalletFundingSnapshot {
  return {
    methods: EMPTY_FUNDING_METHODS,
    virtualAccounts: [],
    staticBanks: [],
    dynamicBanks: [],
    hasBvn: false,
    kycTier: null,
    tierLimits: null,
    fetchedAt: 0,
  };
}

function mergeAccountsIntoCache(accounts: VirtualAccount[]) {
  memoryCache = {
    ...(memoryCache ?? emptySnapshot()),
    virtualAccounts: accounts,
  };
  accountsHydrated = true;
}

async function fetchVirtualAccountsOnly(): Promise<VirtualAccount[]> {
  if (accountsInflight) return accountsInflight;

  accountsInflight = api
    .getVirtualAccounts()
    .then((res) => {
      if (isResponseSuccess(res) && Array.isArray(res.data)) {
        mergeAccountsIntoCache(res.data);
        return res.data;
      }
      mergeAccountsIntoCache(memoryCache?.virtualAccounts ?? []);
      return memoryCache?.virtualAccounts ?? [];
    })
    .catch(() => {
      accountsHydrated = true;
      return memoryCache?.virtualAccounts ?? [];
    })
    .finally(() => {
      accountsInflight = null;
    });

  return accountsInflight;
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
    kycTier: null,
    tierLimits: null,
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
    const kyc = kycRes.value.data;
    snapshot.hasBvn = hasTier2IdentityVerified(kyc);
    snapshot.kycTier = kyc?.currentTier ?? null;
    const tierKey = kyc?.currentTier;
    const limits = tierKey ? kyc?.tierRequirements?.[tierKey]?.limits : undefined;
    const hasLimits = limits && [limits.daily, limits.monthly, limits.single].some((v) => Number(v) > 0);
    snapshot.tierLimits = hasLimits ? limits! : null;
  }

  memoryCache = snapshot;
  accountsHydrated = true;
  fullSnapshotHydrated = true;
  return snapshot;
}

export function peekWalletFundingCache(): WalletFundingSnapshot | null {
  return memoryCache;
}

export function hasWalletFundingCache(): boolean {
  return fullSnapshotHydrated && memoryCache !== null;
}

export function hasFullWalletFundingSnapshot(): boolean {
  return fullSnapshotHydrated;
}

export function hasWalletFundingAccountsReady(): boolean {
  return accountsHydrated;
}

export async function getWalletFundingDataForHome(options?: { force?: boolean }): Promise<WalletFundingSnapshot> {
  const force = options?.force === true;

  if (!force && accountsHydrated && memoryCache) {
    void getWalletFundingData();
    return memoryCache;
  }

  await fetchVirtualAccountsOnly();
  void getWalletFundingData();
  return memoryCache ?? emptySnapshot();
}

export async function preloadWalletFundingAccounts(): Promise<void> {
  if (accountsPreloadStarted && accountsHydrated) return;
  accountsPreloadStarted = true;
  await fetchVirtualAccountsOnly().catch(() => undefined);
  void getWalletFundingData();
}

export async function getWalletFundingData(options?: { force?: boolean }): Promise<WalletFundingSnapshot> {
  const force = options?.force === true;

  if (!force && fullSnapshotHydrated && memoryCache) {
    if (isFresh(memoryCache.fetchedAt)) {
      return memoryCache;
    }
    void refreshWalletFundingSilently();
    return memoryCache;
  }

  if (inflight) return inflight;

  inflight = fetchSnapshotFromApi()
    .catch(() => {
      if (fullSnapshotHydrated && memoryCache) {
        return memoryCache;
      }
      return {
        methods: EMPTY_FUNDING_METHODS,
        virtualAccounts: memoryCache?.virtualAccounts ?? [],
        staticBanks: memoryCache?.staticBanks ?? [],
        dynamicBanks: memoryCache?.dynamicBanks ?? [],
        hasBvn: memoryCache?.hasBvn ?? false,
        kycTier: memoryCache?.kycTier ?? null,
        tierLimits: memoryCache?.tierLimits ?? null,
        fetchedAt: Date.now(),
      };
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export async function pullToRefreshWalletFunding(): Promise<WalletFundingSnapshot> {
  inflight = null;
  return fetchSnapshotFromApi();
}

export function refreshWalletFundingSilently(): void {
  if (inflight) return;
  if (fullSnapshotHydrated && memoryCache && isFresh(memoryCache.fetchedAt)) return;
  inflight = fetchSnapshotFromApi()
    .catch(() => memoryCache)
    .finally(() => {
      inflight = null;
    }) as Promise<WalletFundingSnapshot>;
}

export function getPermanentVirtualAccounts(snapshot: WalletFundingSnapshot): VirtualAccount[] {
  return snapshot.virtualAccounts.filter((a) => a.isPermanent && a.isActive !== false);
}

export function describeFundingMethods(methods: WalletFundingMethods): string[] {
  const labels: string[] = [];
  if (methods.paystackCheckout || methods.payvesselCheckout) labels.push('Card checkout');
  if (methods.permanentVirtualAccount) labels.push('Permanent account');
  if (methods.dynamicVirtualAccount) labels.push('One-time transfer');
  return labels;
}

export function preloadWalletFundingData(): void {
  if (preloadStarted) return;
  preloadStarted = true;
  void getWalletFundingData().catch(() => {});
}

export function resetWalletFundingCache(): void {
  memoryCache = null;
  inflight = null;
  accountsInflight = null;
  accountsHydrated = false;
  fullSnapshotHydrated = false;
  preloadStarted = false;
  accountsPreloadStarted = false;
}
