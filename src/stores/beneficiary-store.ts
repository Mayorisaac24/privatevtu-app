import { create } from 'zustand';
import type { BeneficiaryServiceType, BeneficiaryRecord } from '../lib/api';
import {
  createBeneficiaryRemote,
  deleteBeneficiaryRemote,
  getBeneficiariesCached,
  hydrateBeneficiariesCache,
  invalidateBeneficiariesCache,
  peekBeneficiaries,
  touchBeneficiaryRemote,
  updateBeneficiaryRemote,
  getBeneficiaryIdentifierField,
} from '../lib/beneficiaries-cache';

export type Beneficiary = BeneficiaryRecord;
export type { BeneficiaryServiceType };
export type BeneficiaryIdentifierField = ReturnType<typeof getBeneficiaryIdentifierField>;

interface BeneficiaryState {
  beneficiaries: Beneficiary[];
  isHydrated: boolean;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  addBeneficiary: (b: {
    name: string;
    type: BeneficiaryServiceType;
    phone?: string;
    meterNumber?: string;
    smartCardNumber?: string;
    provider?: string;
  }) => Promise<Beneficiary>;
  updateBeneficiary: (
    id: string,
    patch: Partial<{
      name: string;
      serviceType: BeneficiaryServiceType;
      phone: string;
      meterNumber: string;
      smartCardNumber: string;
      provider: string;
    }>,
  ) => Promise<Beneficiary>;
  removeBeneficiary: (id: string) => Promise<void>;
  touchBeneficiary: (id: string) => Promise<void>;
  getBeneficiaries: (type: BeneficiaryServiceType) => Beneficiary[];
  clearAll: () => void;
}

export const useBeneficiaryStore = create<BeneficiaryState>()((set, get) => ({
  beneficiaries: [],
  isHydrated: false,
  isLoading: false,

  hydrate: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const cached = peekBeneficiaries();
      if (cached.length > 0) {
        set({ beneficiaries: cached, isHydrated: true });
      } else {
        const disk = await hydrateBeneficiariesCache();
        if (disk.length > 0) {
          set({ beneficiaries: disk, isHydrated: true });
        }
      }
      const items = await getBeneficiariesCached();
      set({ beneficiaries: items, isHydrated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  refresh: async () => {
    set({ isLoading: true });
    try {
      const items = await getBeneficiariesCached({ forceRefresh: true });
      set({ beneficiaries: items, isHydrated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  addBeneficiary: async (b) => {
    const field = getBeneficiaryIdentifierField(b.type);
    const created = await createBeneficiaryRemote({
      name: b.name,
      serviceType: b.type,
      provider: b.provider,
      phone: field === 'phone' ? b.phone : undefined,
      meterNumber: field === 'meterNumber' ? b.meterNumber : undefined,
      smartCardNumber: field === 'smartCardNumber' ? b.smartCardNumber : undefined,
    });
    set({ beneficiaries: peekBeneficiaries(), isHydrated: true });
    return created;
  },

  updateBeneficiary: async (id, patch) => {
    const updated = await updateBeneficiaryRemote(id, patch);
    set({ beneficiaries: peekBeneficiaries(), isHydrated: true });
    return updated;
  },

  removeBeneficiary: async (id) => {
    await deleteBeneficiaryRemote(id);
    set({ beneficiaries: peekBeneficiaries(), isHydrated: true });
  },

  touchBeneficiary: async (id) => {
    await touchBeneficiaryRemote(id);
    set({ beneficiaries: peekBeneficiaries(), isHydrated: true });
  },

  getBeneficiaries: (type) =>
    get()
      .beneficiaries.filter((b) => b.serviceType === type)
      .sort((a, b) => {
        const aTime = Date.parse(a.lastUsed || a.updatedAt || a.createdAt || '0');
        const bTime = Date.parse(b.lastUsed || b.updatedAt || b.createdAt || '0');
        return bTime - aTime;
      }),

  clearAll: () => {
    invalidateBeneficiariesCache();
    set({ beneficiaries: [], isHydrated: false, isLoading: false });
  },
}));

export function getBeneficiaryIdentifier(
  beneficiary: Beneficiary,
  field: BeneficiaryIdentifierField,
): string {
  return beneficiary[field] || '';
}
