import * as SecureStore from 'expo-secure-store';
import {
  api,
  isResponseSuccess,
  type BeneficiaryRecord,
  type BeneficiaryServiceType,
} from './api';

const STORAGE_KEY = 'pvtu_beneficiaries_v1';
const CACHE_TTL_MS = 5 * 60 * 1000;

let memoryCache: { items: BeneficiaryRecord[]; fetchedAt: number } | null = null;
let fetchInFlight: Promise<BeneficiaryRecord[]> | null = null;
let diskHydrated = false;

function sortBeneficiaries(items: BeneficiaryRecord[]): BeneficiaryRecord[] {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.lastUsed || a.updatedAt || a.createdAt || '0');
    const bTime = Date.parse(b.lastUsed || b.updatedAt || b.createdAt || '0');
    return bTime - aTime;
  });
}

async function readDiskCache(): Promise<BeneficiaryRecord[] | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { items?: BeneficiaryRecord[] };
    return Array.isArray(parsed.items) ? parsed.items : null;
  } catch {
    return null;
  }
}

async function writeDiskCache(items: BeneficiaryRecord[]) {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({ items }));
  } catch {
    // ignore persistence failures
  }
}

function setCache(items: BeneficiaryRecord[]) {
  const sorted = sortBeneficiaries(items);
  memoryCache = { items: sorted, fetchedAt: Date.now() };
  void writeDiskCache(sorted);
}

async function fetchFromApi(): Promise<BeneficiaryRecord[]> {
  const res = await api.getBeneficiaries();
  if (!isResponseSuccess(res) || !Array.isArray(res.data)) {
    throw new Error(res.message || 'Failed to load beneficiaries');
  }
  setCache(res.data);
  return res.data;
}

export function peekBeneficiaries(): BeneficiaryRecord[] {
  return memoryCache?.items ?? [];
}

export function invalidateBeneficiariesCache() {
  memoryCache = null;
  diskHydrated = false;
  void SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => undefined);
}

export async function hydrateBeneficiariesCache(): Promise<BeneficiaryRecord[]> {
  if (memoryCache?.items) return memoryCache.items;
  if (diskHydrated) return memoryCache?.items ?? [];

  diskHydrated = true;
  const disk = await readDiskCache();
  if (disk) {
    memoryCache = { items: sortBeneficiaries(disk), fetchedAt: 0 };
    return memoryCache.items;
  }
  return [];
}

export async function getBeneficiariesCached(options?: {
  forceRefresh?: boolean;
}): Promise<BeneficiaryRecord[]> {
  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh && memoryCache?.items) {
    const age = Date.now() - memoryCache.fetchedAt;
    if (memoryCache.fetchedAt === 0 || age < CACHE_TTL_MS) {
      return memoryCache.items;
    }
  }

  if (!forceRefresh && !memoryCache?.items) {
    const disk = await hydrateBeneficiariesCache();
    if (disk.length > 0) return disk;
  }

  if (fetchInFlight) {
    return fetchInFlight;
  }

  fetchInFlight = fetchFromApi()
    .catch((error) => {
      if (memoryCache?.items) return memoryCache.items;
      throw error;
    })
    .finally(() => {
      fetchInFlight = null;
    });

  return fetchInFlight;
}

export function refreshBeneficiariesSilently() {
  if (fetchInFlight) return;
  fetchInFlight = fetchFromApi()
    .catch(() => memoryCache?.items ?? [])
    .finally(() => {
      fetchInFlight = null;
    }) as Promise<BeneficiaryRecord[]>;
}

export function preloadBeneficiaries() {
  void getBeneficiariesCached().catch(() => undefined);
}

export function getCachedBeneficiariesByType(serviceType: BeneficiaryServiceType): BeneficiaryRecord[] {
  return peekBeneficiaries().filter((item) => item.serviceType === serviceType);
}

export async function createBeneficiaryRemote(data: {
  name: string;
  serviceType: BeneficiaryServiceType;
  phone?: string;
  meterNumber?: string;
  smartCardNumber?: string;
  provider?: string;
}): Promise<BeneficiaryRecord> {
  const res = await api.createBeneficiary(data);
  if (!isResponseSuccess(res) || !res.data) {
    throw new Error(res.message || 'Could not save beneficiary');
  }

  const current = peekBeneficiaries();
  setCache([res.data, ...current.filter((item) => item.id !== res.data!.id)]);
  return res.data;
}

export async function updateBeneficiaryRemote(
  beneficiaryId: string,
  data: Partial<{
    name: string;
    serviceType: BeneficiaryServiceType;
    phone: string;
    meterNumber: string;
    smartCardNumber: string;
    provider: string;
  }>,
): Promise<BeneficiaryRecord> {
  const res = await api.updateBeneficiary(beneficiaryId, data);
  if (!isResponseSuccess(res) || !res.data) {
    throw new Error(res.message || 'Could not update beneficiary');
  }

  const current = peekBeneficiaries();
  setCache(current.map((item) => (item.id === beneficiaryId ? res.data! : item)));
  return res.data;
}

export async function deleteBeneficiaryRemote(beneficiaryId: string): Promise<void> {
  const res = await api.deleteBeneficiary(beneficiaryId);
  if (!isResponseSuccess(res)) {
    throw new Error(res.message || 'Could not remove beneficiary');
  }

  const current = peekBeneficiaries();
  setCache(current.filter((item) => item.id !== beneficiaryId));
}

export async function touchBeneficiaryRemote(beneficiaryId: string): Promise<BeneficiaryRecord> {
  const res = await api.touchBeneficiary(beneficiaryId);
  if (!isResponseSuccess(res) || !res.data) {
    throw new Error(res.message || 'Could not update beneficiary');
  }

  const current = peekBeneficiaries();
  setCache(current.map((item) => (item.id === beneficiaryId ? res.data! : item)));
  return res.data;
}

export function beneficiaryServiceLabel(serviceType: BeneficiaryServiceType): string {
  switch (serviceType) {
    case 'airtime':
      return 'Airtime';
    case 'data':
      return 'Data';
    case 'electricity':
      return 'Electricity';
    case 'cable':
      return 'Cable TV';
    default:
      return serviceType;
  }
}

export function beneficiaryIdentifierLabel(serviceType: BeneficiaryServiceType): string {
  switch (serviceType) {
    case 'airtime':
    case 'data':
      return 'Phone number';
    case 'electricity':
      return 'Meter number';
    case 'cable':
      return 'Smart card / IUC';
    default:
      return 'Identifier';
  }
}

export function getBeneficiaryIdentifierValue(record: BeneficiaryRecord): string {
  if (record.phone) return record.phone;
  if (record.meterNumber) return record.meterNumber;
  if (record.smartCardNumber) return record.smartCardNumber;
  return '';
}

export function getBeneficiaryIdentifierField(
  serviceType: BeneficiaryServiceType,
): 'phone' | 'meterNumber' | 'smartCardNumber' {
  if (serviceType === 'electricity') return 'meterNumber';
  if (serviceType === 'cable') return 'smartCardNumber';
  return 'phone';
}
