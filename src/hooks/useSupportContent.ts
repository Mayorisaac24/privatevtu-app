import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { DisputeRecord } from '../lib/support';
import {
  getCachedContentPage,
  getCachedDisputes,
  getCachedFaqData,
  getCachedSupportConfig,
  hasContentPageCache,
  hasDisputesCache,
  hasFaqCache,
  hasSupportConfigCache,
  peekContentPage,
  peekDisputes,
  peekFaqData,
  peekSupportConfig,
  refreshContentPageSilently,
  refreshDisputesSilently,
  refreshFaqSilently,
  refreshSupportConfigSilently,
  type ContentPageData,
  type FaqData,
} from '../lib/support-cache';
import type { SupportConfig } from '../lib/support';

export function useSupportContent(slug: string) {
  const [page, setPage] = useState<ContentPageData>(() => peekContentPage(slug));
  const [loading, setLoading] = useState(() => !hasContentPageCache(slug));

  const load = useCallback(async (forceRefresh = false) => {
    if (!slug) return;
    if (!hasContentPageCache(slug)) setLoading(true);
    try {
      const next = await getCachedContentPage(slug, { forceRefresh });
      setPage(next);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
      refreshContentPageSilently(slug);
    }, [load, slug]),
  );

  return { page, loading };
}

export function useSupportFaq() {
  const [data, setData] = useState<FaqData>(() => peekFaqData());
  const [loading, setLoading] = useState(() => !hasFaqCache());

  const load = useCallback(async (forceRefresh = false) => {
    if (!hasFaqCache()) setLoading(true);
    try {
      const next = await getCachedFaqData({ forceRefresh });
      setData(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
      refreshFaqSilently();
    }, [load]),
  );

  return {
    intro: data.intro,
    categories: data.categories,
    loading,
    refresh: () => load(true),
  };
}

export function useSupportConfig() {
  const [config, setConfig] = useState<SupportConfig | null>(() => peekSupportConfig());
  const [loading, setLoading] = useState(() => !hasSupportConfigCache());

  const load = useCallback(async (forceRefresh = false) => {
    if (!hasSupportConfigCache()) setLoading(true);
    try {
      const next = await getCachedSupportConfig({ forceRefresh });
      setConfig(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
      refreshSupportConfigSilently();
    }, [load]),
  );

  return { config, loading };
}

export function useDisputesList() {
  const [items, setItems] = useState<DisputeRecord[]>(() => peekDisputes());
  const [loading, setLoading] = useState(() => !hasDisputesCache());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else if (!hasDisputesCache()) {
      setLoading(true);
    }
    try {
      const next = await getCachedDisputes({ forceRefresh });
      setItems(next);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
      refreshDisputesSilently();
    }, [load]),
  );

  return { items, loading, refreshing, refresh: () => load(true) };
}
