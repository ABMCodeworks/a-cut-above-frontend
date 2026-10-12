type SearchableOrder = {
  customerName?: string | null;
  businessName?: string | null;
  orderNo?: string | null;
};

function normalize(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

// Damerau-Levenshtein distance also counts adjacent swapped letters as one typo.
function distance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1));
  for (let i = 0; i <= a.length; i++) rows[i][0] = i;
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

export function matchesOrderSearch(order: SearchableOrder, query: string): boolean {
  const search = normalize(query);
  if (!search) return true;
  const fields = [order.customerName, order.businessName, order.orderNo]
    .filter((value): value is string => Boolean(value)).map(normalize);
  const compact = search.replace(/ /g, "");
  if (fields.some(field => field.replace(/ /g, "").includes(compact))) return true;
  const candidates = fields.flatMap(field => [...field.split(" "), field.replace(/ /g, "")]);
  return search.split(" ").every(term => candidates.some(candidate => {
    if (candidate.includes(term)) return true;
    // Short queries need an exact partial match to avoid overly broad results.
    const tolerance = term.length >= 8 ? 2 : term.length >= 4 ? 1 : 0;
    return tolerance > 0 && Math.abs(candidate.length - term.length) <= tolerance &&
      distance(term, candidate) <= tolerance;
  }));
}
