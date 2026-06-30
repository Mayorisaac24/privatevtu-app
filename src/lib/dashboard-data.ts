import { api, isResponseSuccess, parseWalletBalanceKobo } from './api';
import {
  computeHomeDashboardStats,
  type HomeDashboardStats,
  type MonthlyInsights,
} from './transaction-display';
import { preloadTransferConfig } from './transfer-config-cache';
import { preloadWalletFundingData, preloadWalletFundingAccounts } from './wallet-funding-cache';
import { preloadTransferBanks } from './transfer-banks-cache';
import { preloadRecentTransferRecipients } from './transfer-recipients-cache';
import { preloadNumberPrefixes } from './number-prefix-cache';
import { preloadServiceCatalog } from './service-catalog-cache';
import { preloadEducationCatalog } from './education-catalog-cache';
import { preloadSupportContent } from './support-cache';
import { preloadVtuProviders } from './vtu-providers-cache';
import { getKycStatusData } from './kyc-status-cache';
import { preloadTwoFactorMethods, getTwoFactorMethods } from './two-factor-methods-cache';
import { refreshServiceCatalogState } from './catalog-revision-sync';
import { useServiceAvailabilityStore } from '../stores/service-availability-store';
import { useWalletStore } from '../stores/wallet-store';
import { refreshUserProfile } from './profile-sync';

const HOME_RECENT_LIMIT = 5;
const HISTORY_PAGE_SIZE = 50;
const WALLET_FUNDING_PAGE_SIZE = 20;
const STATS_SAMPLE_SIZE = 30;

const EMPTY_INSIGHTS: MonthlyInsights = { moneyIn: 0n, moneyOut: 0n, inCount: 0, outCount: 0 };
const EMPTY_DASHBOARD_STATS: HomeDashboardStats = {
  monthTransactionCount: 0,
  monthSuccessfulCount: 0,
  monthServiceSpendKobo: 0n,
  topServiceType: null,
};

const STALE_MS = 30_000;
const DEFERRED_PRELOAD_DELAY_MS = 2500;
const HISTORY_PRELOAD_DELAY_MS = 400;

function scheduleDeferredPreloads() {
  setTimeout(() => {
    preloadTransferBanks();
    preloadTransferConfig();
    preloadRecentTransferRecipients();
    preloadTwoFactorMethods();
    preloadWalletFundingData();
    preloadNumberPrefixes();
    preloadServiceCatalog();
    preloadEducationCatalog();
    preloadSupportContent();
  }, DEFERRED_PRELOAD_DELAY_MS);
}

let historyPreloadStarted = false;

let homeInsights = EMPTY_INSIGHTS;
let homeDashboardStats = EMPTY_DASHBOARD_STATS;
let homeLastUpdated: Date | null = null;
let dashboardInflight: Promise<void> | null = null;
let historyInflight: Promise<void> | null = null;
let insightsInflight: Promise<void> | null = null;
let statsInflight: Promise<void> | null = null;
let walletFundingInflight: Promise<void> | null = null;
let walletFundingFetchedAt: number | null = null;
let prefetchInflight: Promise<void> | null = null;
let dashboardFetchedAt: number | null = null;
let historyFetchedAt: number | null = null;
let insightsFetchedAt: number | null = null;
let statsFetchedAt: number | null = null;

export function getHomeInsights(): MonthlyInsights {
  return homeInsights;
}

export function getHomeDashboardStats(): HomeDashboardStats {
  return homeDashboardStats;
}

export function getHomeLastUpdated(): Date | null {
  return homeLastUpdated;
}

export function hasDashboardCache(): boolean {
  return useWalletStore.getState().dataHydrated;
}

export function hasHistoryCache(): boolean {
  return useWalletStore.getState().historyHydrated;
}

export function hasHistoryStatsReady(): boolean {
  return statsFetchedAt !== null;
}

export function preloadHistoryData(): void {
  if (historyPreloadStarted) return;
  if (!useWalletStore.getState().dataHydrated) return;

  historyPreloadStarted = true;
  setTimeout(() => {
    void Promise.allSettled([
      refreshHistoryData(),
      refreshHomeDashboardStats(),
    ]);
  }, HISTORY_PRELOAD_DELAY_MS);
}

async function fetchHomeSnapshot() {
  const { setBalance, setHomeTransactions, setDataHydrated, bumpDashboardVersion } = useWalletStore.getState();
  let balanceLoaded = false;

  const loadBalance = async (): Promise<void> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const balRes = await api.getWalletBalance();
        if (isResponseSuccess(balRes)) {
          setBalance(parseWalletBalanceKobo(balRes.data));
          balanceLoaded = true;
          return;
        }
      } catch {
        // Retry once after pool congestion clears.
      }
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    }
  };

  const balanceTask = loadBalance();

  const txTask = api.getTransactions(1, HOME_RECENT_LIMIT).then((txRes) => {
    if (isResponseSuccess(txRes)) {
      const transactions = txRes.data?.transactions ?? [];
      setHomeTransactions(transactions);
    }
  });

  await Promise.allSettled([balanceTask, txTask]);

  if (balanceLoaded) {
    if (!useWalletStore.getState().dataHydrated) {
      setDataHydrated(true);
      bumpDashboardVersion();
    }
    homeLastUpdated = new Date();
    dashboardFetchedAt = Date.now();
    return;
  }

  // Keep the home skeleton visible and retry after other startup calls finish.
  setTimeout(() => {
    void refreshDashboardData({ force: true });
  }, 2000);
}

export async function refreshHomeInsights(options?: { force?: boolean }): Promise<void> {
  const force = Boolean(options?.force);
  const isFresh = insightsFetchedAt && Date.now() - insightsFetchedAt < STALE_MS;
  if (!force && isFresh) return;
  if (!force && insightsInflight) return insightsInflight;

  insightsInflight = (async () => {
    try {
      const res = await api.getWalletMonthSummary();
      if (isResponseSuccess(res) && res.data) {
        homeInsights = {
          moneyIn: BigInt(res.data.moneyIn || '0'),
          moneyOut: BigInt(res.data.moneyOut || '0'),
          inCount: res.data.inCount ?? 0,
          outCount: res.data.outCount ?? 0,
        };
        insightsFetchedAt = Date.now();
        useWalletStore.getState().bumpDashboardVersion();
      }
    } catch {
      // Keep cached insights on failure.
    } finally {
      insightsInflight = null;
    }
  })();

  return insightsInflight;
}

export async function refreshHomeDashboardStats(options?: { force?: boolean }): Promise<void> {
  const force = Boolean(options?.force);
  const isFresh = statsFetchedAt && Date.now() - statsFetchedAt < STALE_MS;
  if (!force && isFresh) return;
  if (!force && statsInflight) return statsInflight;

  statsInflight = (async () => {
    try {
      const txRes = await api.getTransactions(1, STATS_SAMPLE_SIZE);
      if (isResponseSuccess(txRes)) {
        homeDashboardStats = computeHomeDashboardStats(txRes.data?.transactions ?? []);
        statsFetchedAt = Date.now();
        useWalletStore.getState().bumpDashboardVersion();
      }
    } catch {
      // Keep cached stats on failure.
    } finally {
      statsInflight = null;
    }
  })();

  return statsInflight;
}

export async function refreshWalletFundingData(options?: { force?: boolean }): Promise<void> {
  const force = Boolean(options?.force);
  const isFresh = walletFundingFetchedAt && Date.now() - walletFundingFetchedAt < STALE_MS;
  if (!force && isFresh) return;
  if (!force && walletFundingInflight) return walletFundingInflight;

  walletFundingInflight = (async () => {
    const { setWalletFundingTransactions, bumpDashboardVersion } = useWalletStore.getState();

    try {
      const txRes = await api.getTransactions(1, WALLET_FUNDING_PAGE_SIZE, {
        category: 'wallet_funding',
      });
      if (isResponseSuccess(txRes)) {
        setWalletFundingTransactions(txRes.data?.transactions ?? []);
        walletFundingFetchedAt = Date.now();
        bumpDashboardVersion();
      }
    } catch {
      // Keep cached values on failure.
    } finally {
      walletFundingInflight = null;
    }
  })();

  return walletFundingInflight;
}

export async function pullToRefreshHome(): Promise<void> {
  dashboardInflight = null;
  dashboardFetchedAt = null;
  insightsFetchedAt = null;
  walletFundingFetchedAt = null;
  await Promise.allSettled([
    fetchHomeSnapshot(),
    refreshHomeInsights({ force: true }),
    refreshWalletFundingData({ force: true }),
    refreshServiceCatalogState(),
  ]);
}

export async function refreshDashboardData(options?: { force?: boolean }): Promise<void> {
  const force = Boolean(options?.force);
  const isFresh = dashboardFetchedAt && Date.now() - dashboardFetchedAt < STALE_MS;
  if (!force && isFresh) return;
  if (!force && dashboardInflight) return dashboardInflight;
  if (force && dashboardInflight) {
    await dashboardInflight;
    dashboardInflight = null;
  }
  if (force) {
    dashboardFetchedAt = null;
  }

  dashboardInflight = (async () => {
    try {
      await fetchHomeSnapshot();
    } catch {
      // Keep cached values on failure.
    } finally {
      dashboardInflight = null;
    }
  })();

  return dashboardInflight;
}

export async function refreshHistoryData(options?: { force?: boolean; priority?: boolean }): Promise<void> {
  const force = Boolean(options?.force);
  const priority = Boolean(options?.priority);
  const isFresh = historyFetchedAt && Date.now() - historyFetchedAt < STALE_MS;
  if (!force && !priority && isFresh) return;
  if (!force && historyInflight) return historyInflight;
  if (force && historyInflight) {
    await historyInflight;
    historyInflight = null;
  }
  if (force) {
    historyFetchedAt = null;
  }

  historyInflight = (async () => {
    const {
      setTransactions,
      setHistoryHydrated,
      bumpDashboardVersion,
      historyHydrated,
      homeTransactions,
    } = useWalletStore.getState();

    if (!historyHydrated && homeTransactions.length > 0) {
      setTransactions(homeTransactions);
    }

    try {
      const txRes = await api.getTransactions(1, HISTORY_PAGE_SIZE);

      if (isResponseSuccess(txRes)) {
        setTransactions(txRes.data?.transactions ?? []);
      }
      historyFetchedAt = Date.now();
      setHistoryHydrated(true);
      bumpDashboardVersion();
      void refreshWalletFundingData({ force });
    } catch {
      // Keep cached values on failure.
    } finally {
      historyInflight = null;
    }
  })();

  return historyInflight;
}

export function resetDashboardCache(): void {
  homeInsights = EMPTY_INSIGHTS;
  homeDashboardStats = EMPTY_DASHBOARD_STATS;
  homeLastUpdated = null;
  dashboardInflight = null;
  historyInflight = null;
  insightsInflight = null;
  statsInflight = null;
  walletFundingInflight = null;
  prefetchInflight = null;
  historyPreloadStarted = false;
  dashboardFetchedAt = null;
  historyFetchedAt = null;
  insightsFetchedAt = null;
  statsFetchedAt = null;
  walletFundingFetchedAt = null;
}

export async function prefetchAppData(): Promise<void> {
  if (prefetchInflight) return prefetchInflight;

  prefetchInflight = (async () => {
    // Phase 1: wallet balance + recent transactions must win DB pool slots first.
    await refreshDashboardData({ force: true });

    // Phase 1b: funding account numbers for home card (single lightweight call).
    void preloadWalletFundingAccounts();

    // Phase 2: lightweight profile data.
    await refreshUserProfile();

    // Phase 3: secondary home + settings data (sequential batches, not one burst).
    void preloadNumberPrefixes();
    void preloadVtuProviders();

    await Promise.allSettled([
      getKycStatusData(),
      getTwoFactorMethods(),
    ]);

    void Promise.allSettled([
      useServiceAvailabilityStore.getState().refresh({ force: true }),
      refreshHomeInsights(),
      refreshWalletFundingData(),
    ]);

    preloadHistoryData();
    scheduleDeferredPreloads();
  })().finally(() => {
    prefetchInflight = null;
  });

  return prefetchInflight;
}
