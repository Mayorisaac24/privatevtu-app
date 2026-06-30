import type { EducationPlan } from './api';

export function mapEducationPlanFromApi(raw: Record<string, unknown>): EducationPlan {
  const platformPrice = Number(raw.platformPrice ?? raw.price ?? 0);
  const priceKobo = Number.isFinite(platformPrice) ? platformPrice : 0;

  return {
    id: String(raw.id || ''),
    name: String(raw.name || 'Plan'),
    price: priceKobo,
    platformPrice: priceKobo,
    description: raw.description ? String(raw.description) : null,
  };
}
