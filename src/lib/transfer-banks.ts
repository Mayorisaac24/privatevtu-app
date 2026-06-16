import type { Bank, FundingBank } from './api';
import { normalizeBankCode } from './funding-banks';
import { resolveTransferBankLogoUrl } from './transfer-bank-logos';
import { peekCachedTransferBanks } from './transfer-banks-cache';

/**
 * Banks shown first in the transfer picker and probed early for account resolve.
 * Fintech leaders first (Opay, PalmPay, Moniepoint, Kuda), then tier-1/2 commercial.
 * Keep in sync with privatevtu-backend/.../transfer-bank-popular.ts
 */
export const POPULAR_TRANSFER_BANK_CODES = [
  '999992', // Opay
  '999991', // PalmPay
  '090405', // Moniepoint
  '090267', // Kuda
  '058', // GTBank
  '033', // UBA
  '057', // Zenith
  '044', // Access
  '011', // First Bank
  '214', // FCMB
  '035', // Wema / ALAT
  '232', // Sterling
  '070', // Fidelity
  '000018', // Union Bank
  '000012', // Stanbic IBTC
  '000008', // Polaris
  '090110', // VFD
  '030', // Heritage
  '120001', // 9PSB
];

/** How many banks to show in the Popular grid before the full list. */
export const POPULAR_TRANSFER_BANK_GRID_SIZE = 12;

const BANK_SHORT_NAMES: Record<string, string> = {
  '044': 'Access Bank',
  '023': 'Citibank',
  '063': 'Diamond Bank',
  '050': 'Ecobank',
  '084': 'Enterprise',
  '070': 'Fidelity',
  '011': 'First Bank',
  '214': 'FCMB',
  '058': 'GTBank',
  '030': 'Heritage',
  '301': 'Jaiz Bank',
  '082': 'Keystone',
  '526': 'Parallex',
  '076': 'Polaris',
  '101': 'Providus',
  '221': 'Stanbic IBTC',
  '068': 'Standard Chartered',
  '232': 'Sterling',
  '100': 'Suntrust',
  '032': 'Union Bank',
  '033': 'UBA',
  '215': 'Unity Bank',
  '035': 'Wema Bank',
  '057': 'Zenith Bank',
  '999991': 'PalmPay',
  '120001': '9PSB',
  '090110': 'VFD MFB',
  '999992': 'Opay',
  '090267': 'Kuda',
  '000011': 'Unity Bank',
  '000033': 'eNaira',
  '090405': 'Moniepoint',
  '000018': 'Union Bank',
  '000012': 'Stanbic IBTC',
  '000008': 'Polaris',
  '000023': 'Providus',
  '000006': 'Jaiz Bank',
  '000026': 'Taj Bank',
  '100039': 'Paystack-Titan',
};

export type TransferBankDisplay = Pick<FundingBank, 'code' | 'name' | 'shortName' | 'logoUrl' | 'logoVersion'>;

/** Preserve exact Payvessel/NUBAN codes — do not pad (033 ≠ 000033). */
export function normalizeTransferBankCode(code: string): string {
  return String(code ?? '').trim();
}

function lookupBankShortName(code: string): string | undefined {
  const raw = String(code ?? '').trim();
  if (!raw) return undefined;
  return BANK_SHORT_NAMES[raw]
    || (/^\d+$/.test(raw) && raw.length > 0 && raw.length < 6
      ? BANK_SHORT_NAMES[raw.padStart(6, '0')]
      : undefined);
}

const PAYSTACK_TITAN_CODE = '100039';

function isPaystackTitanBank(code: string, bankName?: string | null): boolean {
  const normalizedCode = normalizeTransferBankCode(code);
  if (normalizedCode === PAYSTACK_TITAN_CODE) return true;
  return /paystack[-\s]?titan/i.test(String(bankName || '').trim());
}

function findCachedTransferBank(code: string): Bank | undefined {
  const normalized = normalizeTransferBankCode(code);
  const padded = /^\d+$/.test(normalized) && normalized.length < 6
    ? normalized.padStart(6, '0')
    : normalized;

  return peekCachedTransferBanks()?.find((bank) => {
    const bankCode = normalizeTransferBankCode(bank.code);
    return bankCode === normalized
      || bankCode === padded
      || normalizeBankCode(bank.code) === normalizeBankCode(normalized);
  });
}

export function resolveTransferBankForDisplay(
  bankCode: string,
  bankName?: string | null,
): TransferBankDisplay {
  const code = isPaystackTitanBank(bankCode, bankName)
    ? PAYSTACK_TITAN_CODE
    : normalizeTransferBankCode(bankCode);

  const cached = findCachedTransferBank(code);
  if (cached) {
    return enrichTransferBank(cached);
  }

  const label = String(bankName || '').trim();
  const isNumericLabel = /^\d+$/.test(label);
  if (label && label !== code && !isNumericLabel) {
    return enrichTransferBank({ code, name: label, shortName: label });
  }
  return enrichTransferBank({ code, name: '', shortName: '' });
}

export function enrichTransferBank(bank: Bank): TransferBankDisplay {
  const code = normalizeTransferBankCode(bank.code);
  const name = bank.name || lookupBankShortName(bank.code) || lookupBankShortName(code) || 'Bank';
  const shortName = bank.shortName
    || lookupBankShortName(bank.code)
    || lookupBankShortName(code)
    || name;
  const logoUrl = resolveTransferBankLogoUrl(
    bank.code || code,
    typeof bank.logoUrl === 'string' ? bank.logoUrl : null,
  );
  const logoVersion = typeof bank.logoVersion === 'number' ? bank.logoVersion : 0;

  return {
    code: bank.code || code,
    name,
    shortName,
    logoUrl,
    logoVersion,
  };
}

export function sortBanksPopularFirst(banks: Bank[]): Bank[] {
  const rank = new Map(POPULAR_TRANSFER_BANK_CODES.map((code, index) => [code, index]));
  return [...banks].sort((a, b) => {
    const aRank = rank.get(a.code) ?? 999;
    const bRank = rank.get(b.code) ?? 999;
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name);
  });
}

/** Pick popular banks in catalog order using exact code matches only. */
export function selectPopularBankRows<T extends { bank: { code: string } }>(
  rows: T[],
  limit = POPULAR_TRANSFER_BANK_GRID_SIZE,
): T[] {
  const byCode = new Map(rows.map((row) => [row.bank.code, row]));
  const selected: T[] = [];
  for (const code of POPULAR_TRANSFER_BANK_CODES) {
    const row = byCode.get(code);
    if (row) selected.push(row);
    if (selected.length >= limit) break;
  }
  return selected;
}

export function formatAccountNumberDisplay(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function sanitizeAccountNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function computeTransferFeeNaira(
  amountNaira: number,
  feeType: 'FIXED' | 'PERCENTAGE',
  feeValue: number,
): number {
  if (!Number.isFinite(amountNaira) || amountNaira <= 0) return 0;
  if (feeType === 'PERCENTAGE') {
    return Math.round((amountNaira * feeValue) / 10000);
  }
  return feeValue / 100;
}
