import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { AirtimeProvider, CablePlan, CableProvider, DataPlan, ElectricityProvider } from '../lib/api';
import {
  getCablePlansCached,
  getDataCategoriesCached,
  getDataPlansCached,
  getServiceCatalogVersion,
  getServiceProvidersCached,
  hasCablePlansCache,
  hasDataCategoriesCache,
  hasDataPlansCache,
  hasServiceProvidersCache,
  peekCablePlans,
  peekDataCategories,
  peekDataPlans,
  peekServiceProviders,
  refreshCablePlansSilently,
  refreshDataCategoriesSilently,
  refreshDataPlansSilently,
  refreshServiceProvidersSilently,
  subscribeServiceCatalog,
  type ServiceProviderKind,
} from '../lib/service-catalog-cache';
import { syncCatalogRevision } from '../lib/catalog-revision-sync';

function useCatalogSnapshot<T>(getSnapshot: () => T, deps: readonly unknown[]): T {
  const subscribe = useCallback((onStoreChange: () => void) => subscribeServiceCatalog(onStoreChange), []);
  const readSnapshot = useCallback(() => {
    void getServiceCatalogVersion();
    return getSnapshot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return useSyncExternalStore(subscribe, readSnapshot, readSnapshot);
}

export function useCachedServiceProviders<K extends ServiceProviderKind>(kind: K) {
  const providers = useCatalogSnapshot(() => peekServiceProviders(kind), [kind]);
  const loading = providers.length === 0 && !hasServiceProvidersCache(kind);

  useEffect(() => {
    void getServiceProvidersCached(kind);
  }, [kind]);

  useFocusEffect(
    useCallback(() => {
      void syncCatalogRevision();
      void getServiceProvidersCached(kind);
      refreshServiceProvidersSilently(kind);
    }, [kind]),
  );

  return {
    providers: providers as K extends 'cable'
      ? CableProvider[]
      : K extends 'electricity'
        ? ElectricityProvider[]
        : AirtimeProvider[],
    loading,
  };
}

export function useCachedDataCatalog(network: string) {
  const categories = useCatalogSnapshot(() => peekDataCategories(network), [network]);
  const plans = useCatalogSnapshot(() => peekDataPlans(network), [network]);
  const loadingCategories = !!network && !hasDataCategoriesCache(network);
  const loadingPlans = !!network && !hasDataPlansCache(network);

  useEffect(() => {
    if (!network) return;
    void Promise.all([
      getDataCategoriesCached(network),
      getDataPlansCached(network),
    ]);
  }, [network]);

  useFocusEffect(
    useCallback(() => {
      void syncCatalogRevision();
      if (!network) return;
      void getDataCategoriesCached(network);
      void getDataPlansCached(network);
      refreshDataCategoriesSilently(network);
      refreshDataPlansSilently(network);
    }, [network]),
  );

  return { categories, plans, loadingCategories, loadingPlans };
}

export function useCachedCablePlans(provider: string) {
  const plans = useCatalogSnapshot(() => peekCablePlans(provider), [provider]);
  const loadingPlans = !!provider && !hasCablePlansCache(provider);

  useEffect(() => {
    if (!provider) return;
    void getCablePlansCached(provider);
  }, [provider]);

  useFocusEffect(
    useCallback(() => {
      void syncCatalogRevision();
      if (!provider) return;
      void getCablePlansCached(provider);
      refreshCablePlansSilently(provider);
    }, [provider]),
  );

  return { plans, loadingPlans };
}
