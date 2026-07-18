const PROVIDER_PATTERN = /payvessel|pay vessel/i;

export function virtualCardUserMessage(raw: string | null | undefined, fallback: string): string {
  const text = String(raw || '').trim();
  if (!text || PROVIDER_PATTERN.test(text)) return fallback;
  return text;
}

export const VIRTUAL_CARD_RATE_UNAVAILABLE =
  'USD exchange rate is temporarily unavailable. Please try again shortly.';

export const VIRTUAL_CARD_RATE_REQUIRED =
  'Exchange rate must be loaded before you can continue.';
