import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { ElectricityProvider } from '../lib/api';
import {
  getCachedElectricityDiscos,
  getElectricityDiscosCacheVersion,
  hasElectricityDiscosCache,
  peekCachedElectricityDiscos,
  subscribeElectricityDiscos,
} from '../lib/electricity-discos-cache';
import { syncCatalogRevision } from '../lib/catalog-revision-sync';

const EMPTY_DISCOS: ElectricityProvider[] = [];

export function useElectricityDiscos() {
  const subscribe = useCallback((onStoreChange: () => void) => subscribeElectricityDiscos(onStoreChange), []);
  const getSnapshot = useCallback(() => {
    void getElectricityDiscosCacheVersion();
    return peekCachedElectricityDiscos() ?? EMPTY_DISCOS;
  }, []);

  const discos = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const loading = discos.length === 0 && !hasElectricityDiscosCache();

  useEffect(() => {
    void getCachedElectricityDiscos();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void syncCatalogRevision();
      void getCachedElectricityDiscos();
    }, []),
  );

  return { discos, loading };
}
