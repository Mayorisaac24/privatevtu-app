export interface ServiceAvailabilityItem {
  enabled: boolean;
  available: boolean;
}

export type ServiceAvailabilityMap = Record<string, ServiceAvailabilityItem>;

export const SERVICE_CODES = {
  airtime: 'airtime',
  data: 'data',
  electricity: 'electricity',
  cable: 'cable',
  betting: 'betting',
  localTransfer: 'local_transfer',
  education: 'education',
  walletFund: 'wallet_fund',
  virtualCard: 'virtual_card',
} as const;

export type ServiceCode = typeof SERVICE_CODES[keyof typeof SERVICE_CODES];

export function isServiceUsable(
  availability: ServiceAvailabilityMap | null | undefined,
  code: ServiceCode,
): boolean {
  // Stale-while-revalidate: avoid flashing everything as unavailable before the first fetch.
  if (!availability) return true;
  const entry = availability[code];
  return Boolean(entry?.enabled && entry?.available);
}

export function isServiceDisabled(
  availability: ServiceAvailabilityMap | null | undefined,
  code: ServiceCode,
): boolean {
  return !isServiceUsable(availability, code);
}
