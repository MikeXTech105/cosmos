const movementTypeMap = {
  0: {
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "In",
  },
  1: {
    className: "bg-red-50 text-red-700 ring-red-200",
    label: "Out",
  },
  2: {
    className: "bg-sky-50 text-sky-700 ring-sky-200",
    label: "Adjustment",
  },
};

export const stockSummaryColumns = [
  { header: "Item", key: "itemName", width: "260px" },
  { header: "Code", key: "itemCode" },
  { header: "Category", key: "categoryName" },
  { header: "Unit", key: "unitName" },
  { align: "right", format: "qty", header: "Opening", key: "openingStock" },
  { align: "right", format: "qty", header: "Current", key: "currentStock" },
  { align: "right", format: "qty", header: "Reserved", key: "reservedStock" },
  { align: "right", format: "qty", header: "Minimum", key: "minimumStock" },
  { align: "right", format: "currency", header: "Stock Value", key: "stockValue" },
];

export const stockLedgerColumns = [
  { format: "date", header: "Date", key: "movementDate", width: "130px" },
  { header: "Item", key: "itemName", width: "240px" },
  { header: "Code", key: "itemCode" },
  { header: "Source", key: "sourceType" },
  {
    format: "pill",
    header: "Movement",
    key: "movementType",
    pillMap: movementTypeMap,
  },
  { align: "right", format: "qty", header: "In", key: "inQuantity" },
  { align: "right", format: "qty", header: "Out", key: "outQuantity" },
  { align: "right", format: "qty", header: "Balance", key: "balanceQuantity" },
];

export const itemMovementColumns = [
  { header: "Item", key: "itemName", width: "260px" },
  { header: "Code", key: "itemCode" },
  {
    format: "pill",
    header: "Movement",
    key: "movementType",
    pillMap: movementTypeMap,
  },
  { align: "right", format: "qty", header: "In", key: "inQuantity" },
  { align: "right", format: "qty", header: "Out", key: "outQuantity" },
  { align: "right", format: "qty", header: "Net", key: "netQuantity" },
];

export const lowStockColumns = [
  { header: "Item", key: "itemName", width: "260px" },
  { header: "Code", key: "itemCode" },
  { header: "Category", key: "categoryName" },
  { header: "Unit", key: "unitName" },
  { align: "right", format: "qty", header: "Current", key: "currentStock" },
  { align: "right", format: "qty", header: "Minimum", key: "minimumStock" },
  { align: "right", format: "qty", header: "Shortage", key: "shortageQuantity" },
];

export const stockValuationColumns = [
  { header: "Item", key: "itemName", width: "260px" },
  { header: "Code", key: "itemCode" },
  { header: "Category", key: "categoryName" },
  { align: "right", format: "qty", header: "Current Stock", key: "currentStock" },
  {
    align: "right",
    format: "currency",
    header: "Valuation Rate",
    key: "valuationRate",
  },
  { align: "right", format: "currency", header: "Stock Value", key: "stockValue" },
];
