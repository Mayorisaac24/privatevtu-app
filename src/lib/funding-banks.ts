import type { FundingBank } from './api';
import { resolveTransferBankLogoUrl } from './transfer-bank-logos';

export function normalizeBankCode(code: string | number): string {
  const raw = String(code ?? '').trim();
  if (/^\d+$/.test(raw) && raw.length > 0 && raw.length < 6) {
    return raw.padStart(6, '0');
  }
  return raw;
}

export function filterStaticBanks(banks: FundingBank[]): FundingBank[] {
  return banks.filter((b) => b.supportsStatic);
}

export function filterDynamicBanks(banks: FundingBank[]): FundingBank[] {
  return banks.filter((b) => b.supportsDynamic);
}

export function enrichBankLogo(bank: FundingBank): FundingBank {
  const code = normalizeBankCode(bank.code);
  const stored = bank.logoUrl?.trim() || null;
  const logoUrl = resolveTransferBankLogoUrl(bank.code, stored) || stored;
  return {
    ...bank,
    code,
    shortName: bank.shortName || bank.name,
    logoUrl,
    logoVersion: bank.logoVersion ?? 0,
  };
}

export function normalizeFundingBank(bank: FundingBank): FundingBank {
  return enrichBankLogo(bank);
}

export function getBankLogoUri(
  bank: Pick<FundingBank, 'code' | 'logoUrl' | 'logoVersion'>
): string | null {
  const raw = bank.logoUrl?.trim();
  if (!raw) return null;
  if (raw.startsWith('data:image/')) return raw;
  if (!/^https?:\/\//i.test(raw)) return null;
  const base = raw.split('?')[0];
  if (base.includes('res.cloudinary.com') && /\/upload\/v\d+\//.test(base)) {
    return base;
  }
  const separator = raw.includes('?') ? '&' : '?';
  return `${raw}${separator}v=${bank.logoVersion ?? 0}`;
}

export function getBankDisplayName(bank: Pick<FundingBank, 'name' | 'shortName'>): string {
  return bank.shortName || bank.name;
}
