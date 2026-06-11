import type { Transaction } from './api';
import { useWalletStore } from '../stores/wallet-store';

export function findCachedTransaction(id: string): Transaction | null {
  const { homeTransactions, transactions } = useWalletStore.getState();
  const seen = new Set<string>();

  for (const tx of [...homeTransactions, ...transactions]) {
    if (seen.has(tx.id)) continue;
    seen.add(tx.id);
    if (tx.id === id) return tx;
  }

  return null;
}
