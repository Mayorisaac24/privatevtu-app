import type { Bank } from './api';
import { enrichTransferBank } from './transfer-banks';

const BANK_ALIASES: Record<string, string[]> = {
  '058': ['gtbank', 'gt bank', 'guaranty trust'],
  '033': ['uba', 'united bank for africa'],
  '057': ['zenith'],
  '044': ['access bank', 'accessbank'],
  '011': ['first bank', 'firstbank', 'fbn'],
  '214': ['fcmb', 'first city'],
  '035': ['wema', 'alat'],
  '232': ['sterling'],
  '070': ['fidelity'],
  '221': ['stanbic', 'stanbic ibtc'],
  '032': ['union bank'],
  '101': ['providus'],
  '076': ['polaris'],
  '301': ['jaiz'],
  '999992': ['opay'],
  '999991': ['palmpay', 'palm pay'],
  '090405': ['moniepoint'],
  '090267': ['kuda'],
};

export type TransferOcrResult = {
  accountNumber: string | null;
  bank: Bank | null;
  rawText: string;
};

export function extractAccountNumberFromText(text: string): string | null {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return null;

  const nearAccount = compact.match(/account(?:\s*(?:no|number|#))?[^\d]{0,24}(\d{3})[\s.-]?(\d{3})[\s.-]?(\d{4})/i);
  if (nearAccount) {
    return `${nearAccount[1]}${nearAccount[2]}${nearAccount[3]}`;
  }

  const formattedMatches = [...compact.matchAll(/\b(\d{3})[\s.-](\d{3})[\s.-](\d{4})\b/g)];
  if (formattedMatches.length > 0) {
    const match = formattedMatches[0];
    return `${match[1]}${match[2]}${match[3]}`;
  }

  const plainMatches = [...compact.matchAll(/\b(\d{10})\b/g)];
  if (plainMatches.length === 0) return null;

  const nonPhone = plainMatches
    .map((match) => match[1])
    .filter((digits) => !digits.startsWith('0'));
  if (nonPhone.length > 0) return nonPhone[0];

  return plainMatches[0][1];
}

export function matchBankFromText(text: string, banks: Bank[]): Bank | null {
  const haystack = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!haystack || banks.length === 0) return null;

  let best: { bank: Bank; score: number } | null = null;

  for (const bank of banks) {
    const enriched = enrichTransferBank(bank);
    const candidates = new Set<string>();

    [bank.name, enriched.name, enriched.shortName, ...(BANK_ALIASES[bank.code] || [])]
      .filter(Boolean)
      .forEach((label) => candidates.add(String(label).toLowerCase().trim()));

    for (const candidate of candidates) {
      if (candidate.length < 3) continue;
      if (!haystack.includes(candidate)) continue;
      const score = candidate.length;
      if (!best || score > best.score) {
        best = { bank, score };
      }
    }
  }

  return best?.bank ?? null;
}

export function parseTransferDetailsFromText(text: string, banks: Bank[]): TransferOcrResult {
  return {
    accountNumber: extractAccountNumberFromText(text),
    bank: matchBankFromText(text, banks),
    rawText: text,
  };
}
