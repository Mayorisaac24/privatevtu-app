import { create } from 'zustand';

export interface LedgerEntry {
  id: string;
  walletId?: string;
  type: 'CREDIT' | 'DEBIT';
  amount: string;
  balanceBefore?: string;
  balanceAfter: string;
  reference: string;
  description: string;
  createdAt: string;
}

export interface ServiceTransaction {
  id: string;
  type: string;
  status: string;
  amount: string;
  formattedAmount?: string;
  provider?: string;
  phone?: string;
  reference: string;
  providerRef?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

interface WalletState {
  // Wallet balance
  balance: string;
  
  // Ledger entries (wallet funding, transfers, etc.)
  ledger: LedgerEntry[];
  
  // Service transactions (history tab)
  transactions: ServiceTransaction[];

  // Recent transactions shown on home (kept separate from history)
  homeTransactions: ServiceTransaction[];
  
  // Loading state
  isLoading: boolean;
  isLoadingTransactions: boolean;
  dataHydrated: boolean;
  historyHydrated: boolean;
  dashboardVersion: number;

  // Privacy — shared across Home, Wallet, History
  balanceVisible: boolean;
  
  // Actions
  setBalance: (balance: string) => void;
  setLedger: (ledger: LedgerEntry[]) => void;
  addLedgerEntry: (entry: LedgerEntry) => void;
  
  setTransactions: (transactions: ServiceTransaction[]) => void;
  setHomeTransactions: (transactions: ServiceTransaction[]) => void;
  addTransaction: (transaction: ServiceTransaction) => void;
  updateTransaction: (id: string, updates: Partial<ServiceTransaction>) => void;
  
  setLoading: (loading: boolean) => void;
  setLoadingTransactions: (loading: boolean) => void;
  setDataHydrated: (hydrated: boolean) => void;
  setHistoryHydrated: (hydrated: boolean) => void;
  bumpDashboardVersion: () => void;
  setBalanceVisible: (visible: boolean) => void;
  toggleBalanceVisible: () => void;
  resetWalletData: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  balance: '0',
  ledger: [],
  transactions: [],
  homeTransactions: [],
  isLoading: false,
  isLoadingTransactions: false,
  dataHydrated: false,
  historyHydrated: false,
  dashboardVersion: 0,
  balanceVisible: true,
  
  setBalance: (balance) => set({ balance }),
  
  setLedger: (ledger) => set({ ledger }),
  addLedgerEntry: (entry) =>
    set((state) => ({ ledger: [entry, ...state.ledger] })),
  
  setTransactions: (transactions) => set({ transactions }),
  setHomeTransactions: (homeTransactions) => set({ homeTransactions }),
  addTransaction: (transaction) =>
    set((state) => ({ transactions: [transaction, ...state.transactions] })),
  updateTransaction: (id, updates) =>
    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.id === id ? { ...tx, ...updates } : tx
      ),
    })),
  
  setLoading: (isLoading) => set({ isLoading }),
  setLoadingTransactions: (isLoadingTransactions) => set({ isLoadingTransactions }),
  setDataHydrated: (dataHydrated) => set({ dataHydrated }),
  setHistoryHydrated: (historyHydrated) => set({ historyHydrated }),
  bumpDashboardVersion: () => set((s) => ({ dashboardVersion: s.dashboardVersion + 1 })),
  setBalanceVisible: (balanceVisible) => set({ balanceVisible }),
  toggleBalanceVisible: () => set((s) => ({ balanceVisible: !s.balanceVisible })),
  resetWalletData: () =>
    set({
      balance: '0',
      ledger: [],
      transactions: [],
      homeTransactions: [],
      dataHydrated: false,
      historyHydrated: false,
      dashboardVersion: 0,
    }),
}));
