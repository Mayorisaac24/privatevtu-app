const DEFAULT_PINS = [
  'NnfKqDbhvUeabxD97xg7r9JvWoGY7BJjg8XThNJxVbk=',
  'kIdp6NNEd8wsugYyyIYFsi1ylMCED3hZbSR8ZFsa/A4=',
  'mEflZT5enoR1FuXLgYYGqnVEoZvmf9c2bVBpiOjYQ0c=',
];

function parseHostFromApiUrl(apiUrl: string): string | null {
  try {
    return new URL(apiUrl).hostname;
  } catch {
    return null;
  }
}

function parsePinList(raw?: string): string[] {
  return (raw || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function initializeSslPinning(): Promise<void> {
  if (__DEV__ || process.env.EXPO_PUBLIC_SSL_PINNING_ENABLED !== 'true') {
    return;
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
  const hostname = parseHostFromApiUrl(apiUrl);
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return;
  }

  const pins = parsePinList(process.env.EXPO_PUBLIC_SSL_PIN_SHA256);
  const publicKeyHashes = pins.length > 0 ? pins : DEFAULT_PINS;

  try {
    const { initializeSslPinning: initPinning } = require('react-native-ssl-public-key-pinning') as {
      initializeSslPinning: (config: Record<string, { includeSubdomains: boolean; publicKeyHashes: string[] }>) => Promise<void>;
    };

    await initPinning({
      [hostname]: {
        includeSubdomains: true,
        publicKeyHashes,
      },
    });
  } catch {
    // Native SSL pinning module requires a rebuilt dev client / EAS build.
  }
}
