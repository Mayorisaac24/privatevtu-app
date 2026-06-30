import { useEffect, useMemo } from 'react';
import { api, isResponseSuccess, parseWalletBalanceKobo } from '../lib/api';
import { useWalletStore } from '../stores';
import {
  evaluateWalletAffordability,
  parseWalletBalanceKoboValue,
} from '../lib/wallet-affordability';

export function useWalletAffordability(requiredKobo: number, refresh = false) {
  const balance = useWalletStore((state) => state.balance);
  const setBalance = useWalletStore((state) => state.setBalance);

  useEffect(() => {
    if (!refresh) return;
    void api.getWalletBalance()
      .then((res) => {
        if (isResponseSuccess(res)) {
          setBalance(parseWalletBalanceKobo(res.data));
        }
      })
      .catch(() => {});
  }, [refresh, setBalance]);

  return useMemo(
    () => evaluateWalletAffordability(parseWalletBalanceKoboValue(balance), requiredKobo),
    [balance, requiredKobo],
  );
}
