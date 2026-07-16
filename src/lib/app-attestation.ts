import * as Crypto from 'expo-crypto';

const EMPTY_BODY_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const enc = new TextEncoder();
    const key = await subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await subtle.sign('HMAC', key, enc.encode(message));
    return Array.from(new Uint8Array(signature))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  // Fallback for environments without Web Crypto subtle (should be rare in dev builds).
  const { HmacSHA256 } = require('crypto-js') as typeof import('crypto-js');
  return HmacSHA256(message, secret).toString();
}

function resolveSigningPath(baseUrl: string, endpoint: string): string {
  try {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const endpointPath = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return new URL(endpointPath, normalizedBase).pathname;
  } catch {
    return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  }
}

async function hashBody(body: string | undefined | null, isMultipart: boolean): Promise<string> {
  if (isMultipart || body === undefined || body === null || body === '') {
    return EMPTY_BODY_HASH;
  }
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, body);
}

export async function buildMobileAttestationHeaders(input: {
  baseUrl: string;
  endpoint: string;
  method: string;
  body?: string | null;
  isMultipart?: boolean;
}): Promise<Record<string, string>> {
  const secret = process.env.EXPO_PUBLIC_MOBILE_APP_SECRET?.trim();
  if (!secret) return {};

  const timestamp = String(Date.now());
  const nonce = `${timestamp}_${Math.random().toString(36).slice(2, 12)}`;
  const path = resolveSigningPath(input.baseUrl, input.endpoint);
  const bodyHash = await hashBody(input.body ?? null, Boolean(input.isMultipart));
  const payload = [timestamp, nonce, input.method.toUpperCase(), path, bodyHash].join('\n');
  const signature = await hmacSha256Hex(secret, payload);

  return {
    'X-App-Timestamp': timestamp,
    'X-App-Nonce': nonce,
    'X-App-Signature': signature,
  };
}
