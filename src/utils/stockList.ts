import type { AdminProduct } from "../pages/admin/AdminDashboardPage";

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function stockListHtml(products: AdminProduct[]) {
  const sorted = [...products].sort((a, b) => (a.category?.name || "Unassigned").localeCompare(b.category?.name || "Unassigned") || a.name.localeCompare(b.name));
  const rows = sorted.map((product) => {
    const status = [!product.isActive ? "Archived" : "Active", product.isForProcessing ? "For processing" : "", product.isHiddenFromShop || product.isForProcessing ? "Hidden from shop" : "", (product as AdminProduct & { isFifthQuarter?: boolean }).isFifthQuarter ? "5th quarter" : ""].filter(Boolean).join(" · ");
    return `<tr><td>${escapeHtml(product.name)}</td><td>${escapeHtml(product.category?.name || "Unassigned")}</td><td>${escapeHtml(product.unit)}</td><td class="number">${escapeHtml(product.stockQty)}</td><td class="number">${product.isForProcessing ? Number(product.processingStockWeightKg || 0).toFixed(2) : "—"}</td><td class="number">${product.isForProcessing ? Number(product.processingAvailableWeightKg || 0).toFixed(2) : "—"}</td><td>${escapeHtml(status)}</td><td></td></tr>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>A Cut Above — Stock List</title><style>
    body{font:12px Arial,sans-serif;color:#111;margin:24px}h1{font-size:22px;margin-bottom:8px}p{line-height:1.5}table{width:100%;border-collapse:collapse}th,td{border:1px solid #aaa;padding:7px;text-align:left}th{background:#eee}.number{text-align:right}thead{display:table-header-group}tr{break-inside:avoid}button{font-size:16px;padding:10px 20px;margin-bottom:15px}@page{size:A4 landscape;margin:12mm}@media print{body{margin:0}button{display:none}}
    </style></head><body><button id="print">Print stock list</button><h1>A Cut Above — Complete Stock List</h1><p>${escapeHtml(new Date().toLocaleString())} · ${products.length} products<br>Includes active, archived, hidden, processing and fifth-quarter products. Stock weight and carcass processing weight are separate balances.</p><table><thead><tr><th>Product</th><th>Category</th><th>Unit</th><th>Stock count</th><th>Processing stock (kg)</th><th>Carcass processing available (kg)</th><th>Status</th><th>Counted</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
}
