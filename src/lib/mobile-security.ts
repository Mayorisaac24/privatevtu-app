import { buildMobileAttestationHeaders } from './app-attestation';
import { getDeviceIntegrityHeaders } from './device-integrity';
import { getFirebaseAppCheckToken } from './firebase-app-check';

export async function buildAppSecurityHeaders(input: {
  baseUrl: string;
  endpoint: string;
  method: string;
  body?: string | null;
  isMultipart?: boolean;
}): Promise<Record<string, string>> {
  const [integrityHeaders, attestationHeaders, appCheckToken] = await Promise.all([
    getDeviceIntegrityHeaders().catch(() => ({})),
    buildMobileAttestationHeaders(input).catch(() => ({})),
    getFirebaseAppCheckToken().catch(() => null),
  ]);

  const headers: Record<string, string> = {
    ...integrityHeaders,
    ...attestationHeaders,
  };

  if (appCheckToken) {
    headers['X-Firebase-AppCheck'] = appCheckToken;
  }

  return headers;
}

export async function initializeMobileSecurity(): Promise<void> {
  const [{ initializeFirebaseAppCheck }, { initializeSslPinning }] = await Promise.all([
    import('./firebase-app-check'),
    import('./ssl-pinning'),
  ]);

  await Promise.all([
    initializeSslPinning(),
    initializeFirebaseAppCheck(),
  ]);
}
