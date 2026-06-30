import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { EducationPlan, EducationProvider } from '../lib/api';
import {
  getCachedEducationProviders,
  getEducationCatalogVersion,
  getEducationPlansCached,
  hasEducationPlansCache,
  hasEducationProvidersCache,
  peekEducationPlans,
  peekEducationProviders,
  refreshEducationPlansSilently,
  refreshEducationProvidersSilently,
  subscribeEducationCatalog,
} from '../lib/education-catalog-cache';
import { syncCatalogRevision } from '../lib/catalog-revision-sync';

const EMPTY_PROVIDERS: EducationProvider[] = [];
const EMPTY_PLANS: EducationPlan[] = [];

function useEducationCatalogSnapshot<T>(getValue: () => T, deps: unknown[]): T {
  const subscribe = useCallback((onStoreChange: () => void) => subscribeEducationCatalog(onStoreChange), []);
  const getSnapshot = useCallback(() => {
    void getEducationCatalogVersion();
    return getValue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useCachedEducationProviders() {
  const providers = useEducationCatalogSnapshot(() => peekEducationProviders(), []);
  const loading = providers.length === 0 && !hasEducationProvidersCache();

  useEffect(() => {
    void getCachedEducationProviders();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void syncCatalogRevision();
      void getCachedEducationProviders();
      refreshEducationProvidersSilently();
    }, []),
  );

  return { providers, loading };
}

export function useCachedEducationPlans(provider: string) {
  const plans = useEducationCatalogSnapshot(() => peekEducationPlans(provider), [provider]);
  const loadingPlans = !!provider && !hasEducationPlansCache(provider);

  useEffect(() => {
    if (!provider) return;
    void getEducationPlansCached(provider);
  }, [provider]);

  useFocusEffect(
    useCallback(() => {
      void syncCatalogRevision();
      if (!provider) return;
      void getEducationPlansCached(provider);
      refreshEducationPlansSilently(provider);
    }, [provider]),
  );

  return { plans, loadingPlans };
}
