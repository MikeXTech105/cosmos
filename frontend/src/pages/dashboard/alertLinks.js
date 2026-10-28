export const alertRoutes = {
  gst: "/gst/configuration", inventory: "/reports/inventory/low-stock",
  payables: "/reports/purchase/payables", receivables: "/reports/sales/receivables",
};

export function getAlertLink(key, row, filters = {}) {
  const related = row?.relatedRoute;
  let route = typeof related === "string" && /^\/(?!\/)/.test(related) && !/[\\\r\n]/.test(related) ? related : null;
  if (!route && row?.entityId) {
    const id = encodeURIComponent(String(row.entityId));
    const type = String(row.entityType ?? "").toLowerCase();
    if (type === "salesinvoice") route = `/sales/invoices/${id}`;
    if (type === "purchasebill") route = `/purchase/bills/${id}`;
    if (type === "item") route = `/items/${id}/edit`;
  }
  route ??= alertRoutes[key];
  if (!route) return null;
  const [pathname, query = ""] = route.split("?");
  const params = new URLSearchParams(query);
  if (filters.fromDate) params.set("FromDate", filters.fromDate);
  if (filters.toDate) params.set("ToDate", filters.toDate);
  if (filters.fromDate || filters.toDate) params.set("datePreset", "custom");
  return `${pathname}${params.size ? `?${params}` : ""}`;
}
