/** Strip to digits and cap length while the user types. */
export function formatPhoneInput(raw: string): string {
  const clean = raw.replace(/\D/g, '');
  if (!clean) return '';

  let local = clean;
  if (local.startsWith('234')) {
    local = local.slice(3);
  }
  if (local.startsWith('0')) {
    local = local.slice(1);
  }
  return local.slice(0, 10);
}

/**
 * Normalize any Nigerian phone variant to the 10-digit local value
 * shown in the +234 input field (no leading 0).
 */
export function toPhoneInputValue(raw: string): string {
  const normalized = normalizeNigerianPhone(raw);
  if (!normalized) return '';

  if (normalized.length === 11 && normalized.startsWith('0')) {
    return normalized.slice(1);
  }

  return formatPhoneInput(raw);
}

/** Normalize to local 11-digit format (0XXXXXXXXXX). */
export function normalizeNigerianPhone(raw: string): string {
  const clean = raw.replace(/\D/g, '');
  if (!clean) return '';

  if (clean.startsWith('234')) {
    const local = clean.slice(3);
    if (local.length === 10 && /^[789]/.test(local)) return `0${local}`;
    return local.startsWith('0') ? local.slice(0, 11) : `0${local}`.slice(0, 11);
  }

  if (clean.length === 10 && /^[789]/.test(clean)) return `0${clean}`;
  return clean.slice(0, 11);
}

export function isCompleteNigerianPhone(raw: string): boolean {
  const normalized = normalizeNigerianPhone(raw);
  return normalized.length === 11 && normalized.startsWith('0');
}

export function formatPhoneDisplay(raw: string): string {
  const normalized = normalizeNigerianPhone(raw);
  if (normalized.length === 11 && normalized.startsWith('0')) {
    return normalized.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  const clean = raw.replace(/\D/g, '');
  if (clean.length === 10) {
    return clean.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  return clean;
}
