export const operationalKinds = { "stock-as-of": "Stock as of business date", ledger: "Signed stock ledger", scorecard: "Production and dispatch scorecard", "plan-actual": "Production plan versus actual", capacity: "Reserved capacity" };

export function sourceDocumentLink(row) {
  const documentRoutes = { ProductionOrder: "/manufacturing/orders", Shipment: "/shipments/work-list", SalesInvoice: "/sales/invoices", PurchaseOrder: "/purchase/orders", PurchaseBill: "/purchase/bills", PurchaseReturn: "/purchase/returns" };
  if (row.sourceDocumentId && documentRoutes[row.sourceDocumentType]) return `${documentRoutes[row.sourceDocumentType]}/${row.sourceDocumentId}`;
  if (["ProductionOrder", "CapacityReservation"].includes(row.sourceType)) return `/manufacturing/orders/${row.sourceId}`;
  if (row.sourceType === "ShipmentDispatch") return `/shipments/work-list/${row.sourceId}`;
  if (row.sourceType === "SalesInvoice") return `/sales/invoices/${row.sourceId}`;
  return null;
}

export const reportFieldsFor = kind => kind === "stock-as-of" ? ["onHandQuantity", "reservedQuantity", "availableQuantity", "reconciliationDifference"] : kind === "ledger" ? ["signedQuantity", "onHandQuantity", "reservedQuantity"] : kind === "capacity" ? ["requiredMinutes"] : ["plannedQuantity", "goodOutput", "rejectedOutput", "dispatchedQuantity", "returnedQuantity"];
