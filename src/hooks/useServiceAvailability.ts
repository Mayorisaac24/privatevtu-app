import { useCallback, useEffect } from 'react';
import { useServiceAvailabilityStore } from '../stores/service-availability-store';
import { type ServiceCode } from '../lib/service-availability';

export function useServiceAvailability() {
  const availability = useServiceAvailabilityStore((s) => s.availability);
  const loadedAt = useServiceAvailabilityStore((s) => s.loadedAt);
  const isRefreshing = useServiceAvailabilityStore((s) => s.isRefreshing);
  const refresh = useServiceAvailabilityStore((s) => s.refresh);
  const isUsable = useServiceAvailabilityStore((s) => s.isUsable);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const refreshNow = useCallback(() => refresh({ force: true }), [refresh]);

  return {
    availability,
    loading: !loadedAt && isRefreshing,
    isRefreshing,
    refresh: refreshNow,
    isUsable: useCallback((code: ServiceCode) => isUsable(code), [isUsable, availability]),
  };
}
