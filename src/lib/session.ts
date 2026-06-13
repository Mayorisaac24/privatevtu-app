export type TokenRefreshOutcome = 'success' | 'auth_failed' | 'network_failed';

type SessionExpiredHandler = (reason: SessionLogoutReason) => void | Promise<void>;

export type SessionLogoutReason = 'revoked' | 'expired' | 'unknown';

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

export function getApiErrorCode(data: unknown): string {
  const body = data as ApiErrorBody | null;
  if (!body?.error) return '';
  if (typeof body.error === 'string') return body.error;
  return String(body.error.code || '');
}

export function getApiErrorMessage(data: unknown): string {
  const body = data as ApiErrorBody | null;
  return String(body?.message || '');
}

export function isSessionRevoked(status: number, data: unknown): boolean {
  if (status !== 401 && status !== 403) return false;
  const code = getApiErrorCode(data);
  const message = getApiErrorMessage(data);
  if (code === 'SESSION_REVOKED') return true;
  if (/signed in on another device/i.test(message)) return true;
  if (/invalid refresh token/i.test(message)) return true;
  return false;
}

export function isBusinessAuthError(status: number, data: unknown): boolean {
  if (status !== 401) return false;
  const code = getApiErrorCode(data);
  const message = getApiErrorMessage(data);
  if (code === 'INVALID_PIN' || /invalid\s*pin/i.test(message)) return true;
  if (
    code === 'TWO_FA_ERROR'
    || code === 'VALIDATION_ERROR'
    || /invalid.*2fa/i.test(message)
    || /invalid.*code/i.test(message)
  ) {
    return true;
  }
  return false;
}

export async function notifySessionExpired(reason: SessionLogoutReason = 'unknown'): Promise<void> {
  if (handlingSessionExpiry || suppressSessionExpiryUi) return;
  handlingSessionExpiry = true;
  try {
    await sessionExpiredHandler?.(reason);
  } finally {
    handlingSessionExpiry = false;
  }
}

/** True when a 401 should trigger refresh/logout (not business errors like invalid PIN). */
export function shouldRefreshSession(status: number, data: unknown): boolean {
  if (status !== 401) return false;
  return !isBusinessAuthError(status, data);
}

export function shouldLogoutFromAuthFailure(status: number, data: unknown): boolean {
  if (status !== 401 && status !== 403) return false;
  if (isBusinessAuthError(status, data)) return false;
  return true;
}

export function resolveSessionLogoutReason(data: unknown): SessionLogoutReason {
  if (isSessionRevoked(401, data)) return 'revoked';
  const message = getApiErrorMessage(data);
  if (/session expired|please sign in/i.test(message)) return 'expired';
  return 'unknown';
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

export function isAccessTokenExpired(token: string, skewSeconds = 60): boolean {
  const exp = decodeJwtExpiry(token);
  if (!exp) return false;
  return Date.now() >= (exp - skewSeconds) * 1000;
}

export function isNetworkFailureStatus(status: number): boolean {
  return status === 0 || status === 408 || status >= 500;
}
