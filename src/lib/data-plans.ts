import type { DataCategory, DataPlan } from './api';

function planPriceKobo(raw: Record<string, unknown>): number {
  const platformPrice = Number(raw.platformPrice);
  if (Number.isFinite(platformPrice) && platformPrice > 0) return platformPrice;

  const price = Number(raw.price);
  if (Number.isFinite(price) && price > 0) return price;

  const amount = Number(raw.amount);
  if (Number.isFinite(amount) && amount > 0) return amount;

  return 0;
}

export function mapDataPlanFromApi(raw: Record<string, unknown>): DataPlan {
  const category = raw.category as { id?: string; name?: string } | undefined;
  const priceKobo = planPriceKobo(raw);

  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    size: (raw.size as string) || undefined,
    validity: (raw.validity as string) || undefined,
    price: priceKobo,
    platformPrice: priceKobo,
    validityDays: raw.validityDays != null ? Number(raw.validityDays) : undefined,
    categoryId: String(raw.categoryId || category?.id || '') || undefined,
    categoryName: (raw.categoryName as string) || category?.name || undefined,
    includeCategoryInName: Boolean(raw.includeCategoryInName ?? raw.includeDataTypeInName ?? false),
    sizeBytes: raw.sizeBytes != null ? Number(raw.sizeBytes) : undefined,
  };
}

export function filterPlansByActiveCategories(
  rawPlans: Record<string, unknown>[],
  categories: DataCategory[],
): Record<string, unknown>[] {
  const activeCategoryIds = new Set(categories.map((category) => String(category.id)));
  return rawPlans.filter((plan) => {
    const category = plan.category as { id?: string } | undefined;
    const categoryId = String(plan.categoryId || category?.id || '').trim();
    if (!categoryId) return true;
    return activeCategoryIds.has(categoryId);
  });
}

export function shouldShowDataTypeFilters(plans: DataPlan[]): boolean {
  return plans.length > 0 && plans.every((plan) => plan.includeCategoryInName === true);
}

export function filterDataPlansByType(
  plans: DataPlan[],
  selectedDataType: string,
  showDataTypeFilters: boolean,
): DataPlan[] {
  if (!showDataTypeFilters || selectedDataType === 'all') return plans;
  return plans.filter((plan) => plan.categoryName === selectedDataType);
}
