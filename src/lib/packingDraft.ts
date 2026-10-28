type Item = { id: string; productId?: string | null; unit: string; qty: number | string };
type Draft = { itemId: string; packed: boolean; weights: { value?: number; unit: "kg" | "g" }[] };

// Editing recreates item IDs. Match products to retain unsaved packing work.
export function reconcilePackingDraft<T extends Draft>(previousItems: Item[], nextItems: Item[], draft: Record<string, T>, defaults: Record<string, T>): Record<string, T> {
  const previousByProduct = new Map(previousItems.map(item => [item.productId, item]));
  return Object.fromEntries(nextItems.map(item => {
    const previous = previousByProduct.get(item.productId);
    const saved = previous && previous.unit === item.unit ? draft[previous.id] : undefined;
    if (!saved) return [item.id, defaults[item.id]];
    const qty = Math.max(0, Math.ceil(Number(item.qty)));
    const weights = defaults[item.id].weights.map((weight, index) => saved.weights[index] ?? weight);
    return [item.id, { ...saved, itemId: item.id, weights: weights.slice(0, qty), packed: saved.packed && qty <= Number(previous!.qty) }];
  }));
}
