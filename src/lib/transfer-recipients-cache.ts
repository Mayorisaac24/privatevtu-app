import { api, isResponseSuccess } from './api';

export type TransferRecentRecipient = {
  accountNumber: string;
  accountName: string;
  bankCode: string;
  lastTransferAt: string;
};

const DEFAULT_LIMIT = 20;
const RECIPIENTS_CACHE_VERSION = 2;

let memoryCache: {
  recipients: TransferRecentRecipient[];
  hydrated: boolean;
  version: number;
} | null = null;

let fetchInFlight: Promise<TransferRecentRecipient[]> | null = null;

function recipientKey(recipient: Pick<TransferRecentRecipient, 'accountNumber' | 'bankCode'>): string {
  return `${recipient.bankCode}:${recipient.accountNumber}`;
}

export function transferRecipientKey(
  recipient: Pick<TransferRecentRecipient, 'accountNumber' | 'bankCode'>,
): string {
  return recipientKey(recipient);
}

function normalizeCache(): void {
  if (memoryCache && memoryCache.version !== RECIPIENTS_CACHE_VERSION) {
    memoryCache = null;
  }
}

async function fetchRecipientsFromApi(limit = DEFAULT_LIMIT): Promise<TransferRecentRecipient[]> {
  const res = await api.getRecentTransferRecipients(limit);
  if (!isResponseSuccess(res) || !Array.isArray(res.data)) {
    throw new Error(res.message || 'Failed to load recent recipients');
  }

  const recipients = res.data;
  memoryCache = { recipients, hydrated: true, version: RECIPIENTS_CACHE_VERSION };
  return recipients;
}

export function hasRecentTransferRecipientsCache(): boolean {
  normalizeCache();
  return memoryCache?.hydrated === true;
}

export function peekCachedRecentTransferRecipients(): TransferRecentRecipient[] | null {
  normalizeCache();
  if (!memoryCache?.hydrated) return null;
  return memoryCache.recipients;
}

export function findRecentTransferRecipient(
  accountNumber: string,
  bankCode: string,
): TransferRecentRecipient | null {
  normalizeCache();
  const recipients = memoryCache?.recipients ?? [];
  return recipients.find(
    (item) => item.accountNumber === accountNumber && item.bankCode === bankCode,
  ) ?? null;
}

const RECENT_ACCOUNT_PREFIX_MIN = 3;

export function searchRecentTransferRecipients(
  accountPrefix: string,
  options?: { minLength?: number; limit?: number },
): TransferRecentRecipient[] {
  const minLength = options?.minLength ?? RECENT_ACCOUNT_PREFIX_MIN;
  const limit = options?.limit ?? 5;
  const prefix = String(accountPrefix ?? '').trim();

  if (prefix.length < minLength) return [];

  normalizeCache();
  const recipients = memoryCache?.recipients ?? [];
  return recipients
    .filter((item) => item.accountNumber.startsWith(prefix))
    .slice(0, limit);
}

export async function getCachedRecentTransferRecipients(
  options?: { forceRefresh?: boolean; limit?: number },
): Promise<TransferRecentRecipient[]> {
  normalizeCache();
  const forceRefresh = options?.forceRefresh === true;
  const limit = options?.limit ?? DEFAULT_LIMIT;

  if (!forceRefresh && memoryCache?.hydrated) {
    return memoryCache.recipients;
  }

  if (fetchInFlight) {
    return fetchInFlight;
  }

  fetchInFlight = fetchRecipientsFromApi(limit)
    .catch((error) => {
      if (memoryCache?.hydrated) {
        return memoryCache.recipients;
      }
      throw error;
    })
    .finally(() => {
      fetchInFlight = null;
    });

  return fetchInFlight;
}

export function upsertRecentTransferRecipient(
  recipient: TransferRecentRecipient,
  limit = DEFAULT_LIMIT,
): TransferRecentRecipient[] {
  const key = recipientKey(recipient);
  const existing = memoryCache?.recipients ?? [];
  const next = [
    {
      ...recipient,
      lastTransferAt: recipient.lastTransferAt || new Date().toISOString(),
    },
    ...existing.filter((item) => recipientKey(item) !== key),
  ].slice(0, limit);

  memoryCache = { recipients: next, hydrated: true, version: RECIPIENTS_CACHE_VERSION };
  return next;
}

export function removeRecentTransferRecipients(
  recipients: Array<Pick<TransferRecentRecipient, 'accountNumber' | 'bankCode'>>,
): TransferRecentRecipient[] {
  if (recipients.length === 0) {
    return memoryCache?.recipients ?? [];
  }

  normalizeCache();
  const removeKeys = new Set(recipients.map(recipientKey));
  const next = (memoryCache?.recipients ?? []).filter(
    (item) => !removeKeys.has(recipientKey(item)),
  );

  memoryCache = { recipients: next, hydrated: true, version: RECIPIENTS_CACHE_VERSION };
  return next;
}

let preloadStarted = false;

export function preloadRecentTransferRecipients(): void {
  if (preloadStarted) return;
  preloadStarted = true;
  void getCachedRecentTransferRecipients().catch(() => {});
}

export function resetTransferRecipientsCache(): void {
  memoryCache = null;
  fetchInFlight = null;
  preloadStarted = false;
}

const VERIFIED_TTL_MS = 15_000;

export type VerifiedAccountEntry = {
  accountNumber: string;
  bankCode: string;
  accountName: string;
  verifiedAt: number;
};

const verifiedCache = new Map<string, VerifiedAccountEntry>();

function verifiedCacheKey(accountNumber: string, bankCode: string): string {
  return `${bankCode}:${accountNumber}`;
}

export function rememberVerifiedAccount(entry: {
  accountNumber: string;
  bankCode: string;
  accountName: string;
}): void {
  verifiedCache.set(verifiedCacheKey(entry.accountNumber, entry.bankCode), {
    ...entry,
    verifiedAt: Date.now(),
  });
}

export function peekRecentlyVerifiedAccount(
  accountNumber: string,
  bankCode: string,
): VerifiedAccountEntry | null {
  const item = verifiedCache.get(verifiedCacheKey(accountNumber, bankCode));
  if (!item) return null;
  if (Date.now() - item.verifiedAt > VERIFIED_TTL_MS) {
    verifiedCache.delete(verifiedCacheKey(accountNumber, bankCode));
    return null;
  }
  return item;
}

export function resetVerifiedAccountsCache(): void {
  verifiedCache.clear();
}
