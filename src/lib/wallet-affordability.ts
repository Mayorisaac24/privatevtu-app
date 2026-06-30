export function parseWalletBalanceKoboValue(balance: string): number {
  try {
    return Number(BigInt(balance || '0'));
  } catch {
    return 0;
  }
}

export function nairaToKobo(naira: number): number {
  if (!Number.isFinite(naira) || naira <= 0) return 0;
  return Math.round(naira * 100);
}

export function evaluateWalletAffordability(walletBalanceKobo: number, requiredKobo: number) {
  const safeRequired = Math.max(0, requiredKobo);
  const safeBalance = Math.max(0, walletBalanceKobo);

  return {
    insufficientFunds: safeBalance < safeRequired,
    walletBalanceKobo: safeBalance,
    walletBalanceNaira: safeBalance / 100,
    requiredKobo: safeRequired,
    requiredNaira: safeRequired / 100,
  };
}
