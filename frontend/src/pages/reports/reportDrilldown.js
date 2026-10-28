import { isRouteAuthorized } from "../../utils/authorizedRoute";

export function reportDrilldown({ report, column, row, auth }) {
  const key = String(column.key);
  let route;
  const encoded = (value) => encodeURIComponent(String(value));
  if (key === "invoiceNumber") {
    const id = row.salesInvoiceId ?? row.invoiceId ?? (report.id === "sales-invoices" ? row.id : null);
    if (id) route = `/sales/invoices/${encoded(id)}`;
  } else if (["purchaseBillNo", "billNumber"].includes(key)) {
    const id = row.purchaseBillId ?? (report.id === "purchase-bills" ? row.id : null);
    if (id) route = `/purchase/bills/${encoded(id)}`;
  } else if (["partyName", "customerName", "supplierName"].includes(key)) {
    const id = row.partyId ?? row.customerPartyId ?? row.supplierPartyId;
    if (id) route = `/party/${encoded(id)}/edit`;
  } else if (key === "itemName" && row.itemId) route = `/items/${encoded(row.itemId)}/edit`;
  return route && isRouteAuthorized({ ...auth, route }) ? route : null;
}
