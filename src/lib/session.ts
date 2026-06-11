type SessionExpiredHandler = () => void | Promise<void>;

type ApiErrorBody = {
  message?: string;
  error?: { code?: string; type?: string } | string | null;
};

let sessionExpiredHandler: SessionExpiredHandler | null = null;
let handlingSessionExpiry = false;
let suppressSessionExpiryUi = false;

/** Suppress session-expired toast/redirect during auth screens and cold start. */
export function setSuppressSessionExpiryUi(value: boolean): void {
  suppressSessionExpiryUi = value;
}

export function registerSessionExpiredHandler(handler: SessionExpiredHandler): void {
  sessionExpiredHandler = handler;
}

export async function notifySessionExpired(): Promise<void> {
  if (handlingSessionExpiry || suppressSessionExpiryUi) return;
  handlingSessionExpiry = true;
  try {
    await sessionExpiredHandler?.();
  } finally {
    handlingSessionExpiry = false;
  }
}

/** True when a 401 should trigger refresh/logout (not business errors like invalid PIN). */
export function shouldRefreshSession(status: number, data: unknown): boolean {
  if (status !== 401) return false;

  const body = data as ApiErrorBody | null;
  const message = String(body?.message || '');
  const errorCode = typeof body?.error === 'object' && body?.error
    ? String(body.error.code || '')
    : '';

  if (errorCode === 'INVALID_PIN' || /invalid\s*pin/i.test(message)) {
    return false;
  }

  return true;
}

export function decodeJwtExpiry(token: string): number | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(token: string, skewSeconds = 30): boolean {
  const exp = decodeJwtExpiry(token);
  if (!exp) return false;
  return Date.now() >= (exp - skewSeconds) * 1000;
}
