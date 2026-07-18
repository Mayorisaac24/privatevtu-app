import { Colors } from '../theme';

export function parseUsdInput(raw: string): number {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function sanitizeUsdInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return parts[0];
  return `${parts[0]}.${parts[1].slice(0, 2)}`;
}

export function usdToKobo(amountUsd: number, rateKobo: string): bigint {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return 0n;
  return BigInt(Math.ceil(amountUsd * Number(rateKobo)));
}

export function formatUsd(amount: string | number | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '$0.00';
  return `$${n.toFixed(2)}`;
}

export function virtualCardStatusMeta(status: string): { label: string; color: string } {
  switch (String(status || '').toUpperCase()) {
    case 'ACTIVE':
      return { label: 'Active', color: Colors.success };
    case 'FROZEN':
      return { label: 'Frozen', color: Colors.primary };
    case 'PENDING':
      return { label: 'Pending', color: Colors.warning };
    case 'TERMINATED':
      return { label: 'Terminated', color: Colors.muted };
    case 'FAILED':
      return { label: 'Failed', color: Colors.error };
    default:
      return { label: String(status || 'Unknown'), color: Colors.muted };
  }
}

export function readProviderFeeUsd(quote: Record<string, unknown> | null | undefined): number {
  if (!quote) return 0;
  const value = quote.fee_amount_usd ?? quote.feeAmountUsd;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
