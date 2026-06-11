const LOGO_CDN_BASE = 'https://billspaymentlogo.s3.amazonaws.com';

/** Payvessel CDN logos that are blank/white and invisible on light UI. */
const BLANK_CDN_LOGO_CODES = new Set(['090267']);

/** NUBAN transfer codes → Payvessel logo CDN provider codes. */
export const TRANSFER_BANK_LOGO_PROVIDER_CODES: Record<string, string> = {
  '044': '000014',
  '058': '000013',
  '057': '000015',
  '033': '000004',
  '011': '000016',
  '214': '000003',
  '035': '000017',
  '232': '000001',
  '070': '000007',
  '999992': '100004',
  '999991': '100033',
  '090405': '090405',
  '030': '000020',
  '090267': '090267',
  '000018': '000018',
  '000012': '000012',
  '000008': '000008',
  '120001': '120001',
};

function buildLogoUrl(providerCode: string): string {
  return `${LOGO_CDN_BASE}/${providerCode}.png`;
}

function lookupLogoProviderCode(code: string): string | null {
  const raw = String(code || '').trim();
  if (!raw) return null;

  return TRANSFER_BANK_LOGO_PROVIDER_CODES[raw]
    || TRANSFER_BANK_LOGO_PROVIDER_CODES[raw.replace(/^0+/, '')]
    || TRANSFER_BANK_LOGO_PROVIDER_CODES[raw.padStart(6, '0')]
    || null;
}

export function resolveTransferBankLogoUrl(
  code: string,
  logoUrl?: string | null,
): string | null {
  const rawCode = String(code || '').trim();
  if (BLANK_CDN_LOGO_CODES.has(rawCode)) return null;

  const trimmed = String(logoUrl || '').trim();
  if (trimmed) return trimmed;

  const providerCode = lookupLogoProviderCode(code);
  return providerCode ? buildLogoUrl(providerCode) : null;
}
