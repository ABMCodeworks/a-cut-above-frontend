export function isWeightUnit(unit?: string) {
  return /^(kg|kgs|kilogram|kilograms|g|gram|grams)$/.test((unit || "").trim().toLowerCase());
}

export function ingredientWeightAvailable(product: {
  unit: string; isForProcessing?: boolean; processingStockWeightKg?: number | string;
}) {
  if (!isWeightUnit(product.unit) || !product.isForProcessing) return undefined;
  const kg = Number(product.processingStockWeightKg || 0);
  return /^(g|gram|grams)$/.test(product.unit.trim().toLowerCase()) ? Number((kg * 1000).toFixed(3)) : kg;
}
