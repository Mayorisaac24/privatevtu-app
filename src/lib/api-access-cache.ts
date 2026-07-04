import { api, isResponseSuccess, type ApiAccessSnapshot } from './api';

const STALE_MS = 5 * 60 * 1000;

let memoryCache: ApiAccessSnapshot | null = null;
let fetchedAt: number | null = null;
let inflight: Promise<ApiAccessSnapshot | null> | null = null;
let preloadStarted = false;

function isFresh(): boolean {
  return fetchedAt !== null && Date.now() - fetchedAt < STALE_MS;
}

async function fetchFromApi(): Promise<ApiAccessSnapshot | null> {
  const res = await api.getMyApiAccess();
  if (isResponseSuccess(res) && res.data) {
    memoryCache = res.data;
    fetchedAt = Date.now();
    return res.data;
  }
  return memoryCache;
}

export function peekApiAccessCache(): ApiAccessSnapshot | null {
  return memoryCache;
}

export function hasApiAccessCache(): boolean {
  return memoryCache !== null;
}

export function invalidateApiAccessCache(): void {
  memoryCache = null;
  fetchedAt = null;
  inflight = null;
}

export async function getApiAccessData(options?: { force?: boolean }): Promise<ApiAccessSnapshot | null> {
  if (!options?.force && memoryCache) {
    if (isFresh()) return memoryCache;
    void refreshApiAccessSilently();
    return memoryCache;
  }

  if (inflight) return inflight;

  inflight = fetchFromApi()
    .catch(() => memoryCache)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export async function pullToRefreshApiAccess(): Promise<ApiAccessSnapshot | null> {
  inflight = null;
  fetchedAt = null;
  return fetchFromApi();
}

export function refreshApiAccessSilently(): void {
  if (inflight || isFresh()) return;

  inflight = fetchFromApi()
    .catch(() => memoryCache)
    .finally(() => {
      inflight = null;
    }) as Promise<ApiAccessSnapshot | null>;
}

export function preloadApiAccessData(): void {
  if (preloadStarted) return;
  preloadStarted = true;
  void getApiAccessData().catch(() => undefined);
}

export function resetApiAccessCache(): void {
  invalidateApiAccessCache();
  preloadStarted = false;
}

export function getApiAccessProfileMeta(snapshot?: ApiAccessSnapshot | null): {
  subtitle: string;
  badge: boolean;
} {
  const data = snapshot ?? memoryCache;
  if (!data) {
    return { subtitle: 'Request developer API credentials', badge: false };
  }

  if (data.activeClient?.isActive) {
    return {
      subtitle: `Active · ${data.activeClient.responseFormat}`,
      badge: false,
    };
  }

  if (data.pending) {
    return { subtitle: 'Request pending admin review', badge: true };
  }

  if (data.latest?.status === 'REJECTED') {
    return { subtitle: 'Last request rejected — you can resubmit', badge: true };
  }

  return { subtitle: 'Request developer API credentials', badge: false };
}

/** Apply API access snapshot to form fields. */
export function readApiAccessFormState(snapshot: ApiAccessSnapshot) {
  if (snapshot.activeClient) {
    return {
      clientName: snapshot.activeClient.name || '',
      responseFormat: snapshot.activeClient.responseFormat,
      allowedServices: snapshot.activeClient.allowedServices?.length
        ? snapshot.activeClient.allowedServices
        : ['airtime', 'data', 'electricity', 'cable', 'betting'],
      webhookUrl: snapshot.activeClient.webhookUrl || '',
      userNote: '',
    };
  }

  if (snapshot.pending) {
    return {
      clientName: snapshot.pending.clientName,
      responseFormat: snapshot.pending.requestedResponseFormat,
      allowedServices: snapshot.pending.requestedAllowedServices,
      webhookUrl: snapshot.pending.requestedWebhookUrl || '',
      userNote: snapshot.pending.userNote || '',
    };
  }

  return null;
}
