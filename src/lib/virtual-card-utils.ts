import { Colors } from '../theme';
import type { VirtualCardTransaction } from './api';

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
      return { label: 'Frozen', color: Colors.warning };
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

function isValidExpiryMonth(mm: string): boolean {
  const n = Number(mm);
  return Number.isFinite(n) && n >= 1 && n <= 12;
}

/** Display-safe MM/YY; hides invalid issuer values (e.g. malformed dates). */
export function formatCardExpiry(raw?: string | null): string | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;

  const iso = text.match(/^(\d{4})-(\d{2})(?:-\d{2})?/);
  if (iso && isValidExpiryMonth(iso[2])) {
    return `${iso[2]}/${iso[1].slice(-2)}`;
  }

  const mmYyyy = text.match(/^(\d{2})\/(\d{4})$/);
  if (mmYyyy && isValidExpiryMonth(mmYyyy[1])) {
    return `${mmYyyy[1]}/${mmYyyy[2].slice(-2)}`;
  }

  const mmYy = text.match(/^(\d{2})\/(\d{2})$/);
  if (mmYy) {
    if (isValidExpiryMonth(mmYy[1])) return `${mmYy[1]}/${mmYy[2]}`;
    const day = Number(mmYy[1]);
    const month = Number(mmYy[2]);
    if (day > 12 && month >= 1 && month <= 12) {
      return `${mmYy[2]}/${mmYy[1]}`;
    }
    return null;
  }

  const compact = text.match(/^(\d{2})(\d{2})$/);
  if (compact && isValidExpiryMonth(compact[1])) {
    return `${compact[1]}/${compact[2]}`;
  }

  const mmDash = text.match(/^(\d{2})[-.](\d{2,4})$/);
  if (mmDash && isValidExpiryMonth(mmDash[1])) {
    const yy = mmDash[2].length === 4 ? mmDash[2].slice(-2) : mmDash[2];
    return `${mmDash[1]}/${yy}`;
  }

  return null;
}

export function formatCardTransactionWhen(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function virtualCardIssuerFootnote(): string {
  return 'USD balance and merchant activity are maintained by our card issuer. Refresh pulls the latest data—no wallet charge.';
}

/** Neutral issuance copy (no processor or bank names). */
export function virtualCardIssuanceNotice(): string {
  return 'USD virtual cards are intended for online and international merchant payments. Your card may show as pending until identity checks and activation complete.';
}

/** @deprecated Disclosure removed from card detail UI. */
export function virtualCardDisclosureText(): string {
  return '';
}

export const VIRTUAL_CARD_REVEAL_SECONDS = 25;

export function formatSyncAge(seconds: number, withPullHint = false): string {
  const s = Math.max(0, Math.floor(seconds));
  let label: string;
  if (s < 60) label = `Synced ${s}s ago`;
  else if (s < 3600) label = `Synced ${Math.floor(s / 60)}m ago`;
  else label = `Synced ${Math.floor(s / 3600)}h ago`;
  return withPullHint ? `${label} · pull to refresh` : label;
}

export function virtualCardDeclineLabel(entry: {
  status?: string | null;
  declineReason?: string | null;
  description?: string;
}): string {
  if (!isVirtualCardTxnDeclined(entry.status)) return '';
  return entry.declineReason?.trim() || entry.description?.trim() || 'Transaction declined';
}

export function formatSignedUsd(amount: string | number | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '$0.00';
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export function parseMaskedPan(maskedPan?: string | null): {
  bin: string;
  last4: string;
  display: string;
} {
  const text = String(maskedPan || '').trim();
  if (!text) {
    return { bin: '', last4: '', display: '•••• •••• •••• ••••' };
  }
  const starMatch = text.match(/^(\d{4,8})\*+(\d{4})$/);
  if (starMatch) {
    return {
      bin: starMatch[1],
      last4: starMatch[2],
      display: `${starMatch[1]} •••• ${starMatch[2]}`,
    };
  }
  const digits = text.replace(/\D/g, '');
  const last4 = digits.length >= 4 ? digits.slice(-4) : '';
  const bin = digits.length >= 10 ? digits.slice(0, 6) : digits.slice(0, Math.min(6, digits.length));
  if (bin && last4) {
    return { bin, last4, display: `${bin} •••• ${last4}` };
  }
  return { bin: '', last4: '', display: text.replace(/\*/g, '•') };
}

export function formatPanGroups(pan: string): string {
  const digits = pan.replace(/\D/g, '');
  if (!digits) return pan;
  return digits.match(/.{1,4}/g)?.join(' ') ?? digits;
}

export function isVirtualCardTxnDeclined(status?: string | null): boolean {
  return String(status || '').toLowerCase().includes('declin')
    || String(status || '').toLowerCase().includes('fail');
}

export function virtualCardTxnMerchant(entry: VirtualCardTransaction): string {
  return entry.merchant?.trim() || entry.description?.trim() || 'Card transaction';
}
