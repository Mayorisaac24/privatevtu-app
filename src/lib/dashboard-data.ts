import { api, isResponseSuccess, parseWalletBalanceKobo } from './api';
import { computeMonthlyInsights, type MonthlyInsights } from './transaction-display';
import { preloadTransferConfig } from './transfer-config-cache';
import { preloadWalletFundingData } from './wallet-funding-cache';
import { preloadTransferBanks } from './transfer-banks-cache';
import { useServiceAvailabilityStore } from '../stores/service-availability-store';
import { useWalletStore } from '../stores/wallet-store';

const EMPTY_INSIGHTS: MonthlyInsights = { moneyIn: 0n, moneyOut: 0n, inCount: 0, outCount: 0 };
const HOME_RECENT_LIMIT = 10;

const STALE_MS = 30_000;

let homeInsights = EMPTY_INSIGHTS;
let homeLastUpdated: Date | null = null;
let dashboardInflight: Promise<void> | null = null;
let historyInflight: Promise<void> | null = null;
let dashboardFetchedAt: number | null = null;
let historyFetchedAt: number | null = null;

export function getHomeInsights(): MonthlyInsights {
  return homeInsights;
}

export function getHomeLastUpdated(): Date | null {
  return homeLastUpdated;
}

export function hasDashboardCache(): boolean {
  return useWalletStore.getState().dataHydrated;
}

async function fetchHomeSnapshot() {
  const [balRes, txRes, monthLedger] = await Promise.allSettled([
    api.getWalletBalance(),
    api.getTransactions(1, HOME_RECENT_LIMIT),
    api.fetchCurrentMonthLedger(),
  ]);

  const { setBalance, setHomeTransactions, setDataHydrated, bumpDashboardVersion } = useWalletStore.getState();

  if (balRes.status === 'fulfilled' && isResponseSuccess(balRes.value)) {
    setBalance(parseWalletBalanceKobo(balRes.value.data));
  }
  if (txRes.status === 'fulfilled' && isResponseSuccess(txRes.value)) {
    setHomeTransactions(txRes.value.data?.transactions ?? []);
  }
  if (monthLedger.status === 'fulfilled') {
    homeInsights = computeMonthlyInsights(monthLedger.value);
  }
  homeLastUpdated = new Date();
  dashboardFetchedAt = Date.now();
  setDataHydrated(true);
  bumpDashboardVersion();
}

export async function pullToRefreshHome(): Promise<void> {
  dashboardInflight = null;
  dashboardFetchedAt = null;
  await fetchHomeSnapshot();
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

export async function refreshHistoryData(options?: { force?: boolean }): Promise<void> {
  const force = Boolean(options?.force);
  const isFresh = historyFetchedAt && Date.now() - historyFetchedAt < STALE_MS;
  if (!force && isFresh) return;
  if (!force && historyInflight) return historyInflight;
  if (force && historyInflight) {
    await historyInflight;
    historyInflight = null;
  }
  if (force) {
    historyFetchedAt = null;
  }

  historyInflight = (async () => {
    const { setTransactions, setHistoryHydrated, bumpDashboardVersion } = useWalletStore.getState();
    try {
      const txRes = await api.getTransactions(1, 100);

      if (isResponseSuccess(txRes)) {
        setTransactions(txRes.data?.transactions ?? []);
      }
      historyFetchedAt = Date.now();
      setHistoryHydrated(true);
      bumpDashboardVersion();
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
  homeLastUpdated = null;
  dashboardInflight = null;
  historyInflight = null;
  dashboardFetchedAt = null;
  historyFetchedAt = null;
}

export async function prefetchAppData(): Promise<void> {
  const { refresh: refreshAvailability } = useServiceAvailabilityStore.getState();
  preloadTransferBanks();
  preloadTransferConfig();
  preloadWalletFundingData();
  await Promise.allSettled([
    refreshAvailability({ force: true }),
    refreshDashboardData({ force: true }),
    refreshHistoryData({ force: true }),
  ]);
}
