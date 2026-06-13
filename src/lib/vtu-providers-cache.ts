import type { AirtimeProvider } from './api';
import {
  getServiceProvidersCached,
  peekServiceProviders,
  preloadServiceCatalog,
  refreshServiceProvidersSilently,
  resetServiceCatalogCache,
  type ServiceProviderKind,
} from './service-catalog-cache';

type ProviderKind = Extract<ServiceProviderKind, 'airtime' | 'data'>;

export function peekVtuProviders(kind: ProviderKind): AirtimeProvider[] {
  return peekServiceProviders(kind);
}

export async function getVtuProvidersCached(
  kind: ProviderKind,
  options?: { forceRefresh?: boolean },
): Promise<AirtimeProvider[]> {
  return getServiceProvidersCached(kind, options);
}

export function preloadVtuProviders(): void {
  preloadServiceCatalog();
}

export function resetVtuProvidersCache(): void {
  resetServiceCatalogCache();
}

export function refreshVtuProvidersSilently(kind: ProviderKind): void {
  refreshServiceProvidersSilently(kind);
}
