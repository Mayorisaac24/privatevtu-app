const KNOWN_PROVIDER_ERRORS: Array<[RegExp, string]> = [
  [
    /virtual card issuing is not enabled/i,
    'Virtual card issuing is not active on our platform yet. Please contact support — our team must enable this with the card provider.',
  ],
  [
    /initial minimum card|card balance less/i,
    'The card provider requires a minimum starting balance on new cards. Please try again or contact support if this persists.',
  ],
  [
    /unauthorized|invalid credentials|api key/i,
    'Card provider authentication failed. Please contact support.',
  ],
  [
    /insufficient.*balance|wallet.*balance/i,
    'The card provider wallet has insufficient balance. Please contact support.',
  ],
];

export function virtualCardUserMessage(raw: string | null | undefined, fallback: string): string {
  const text = String(raw || '').trim();
  if (!text) return fallback;

  for (const [pattern, message] of KNOWN_PROVIDER_ERRORS) {
    if (pattern.test(text)) return message;
  }

  const sanitized = text
    .replace(/\bPayVessel\b/gi, 'the card provider')
    .replace(/\bpay vessel\b/gi, 'the card provider')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return sanitized || fallback;
}

export const VIRTUAL_CARD_RATE_UNAVAILABLE =
  'USD exchange rate is temporarily unavailable. Please try again shortly.';

export const VIRTUAL_CARD_RATE_REQUIRED =
  'Exchange rate must be loaded before you can continue.';
