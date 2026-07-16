const movementTypeMap = {
  0: {
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "In",
  },
  In: {
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "In",
  },
  1: {
    className: "bg-red-50 text-red-700 ring-red-200",
    label: "Out",
  },
  Out: {
    className: "bg-red-50 text-red-700 ring-red-200",
    label: "Out",
  },
  2: {
    className: "bg-sky-50 text-sky-700 ring-sky-200",
    label: "Adjustment",
  },
  Adjustment: {
    className: "bg-sky-50 text-sky-700 ring-sky-200",
    label: "Adjustment",
  },
  3: {
    className: "bg-violet-50 text-violet-700 ring-violet-200",
    label: "Transfer",
  },
  Transfer: {
    className: "bg-violet-50 text-violet-700 ring-violet-200",
    label: "Transfer",
  },
};

const classificationMap = {
  Dead: {
    className: "bg-red-50 text-red-700 ring-red-200",
    label: "Dead",
  },
  Fast: {
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "Fast",
  },
  Slow: {
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    label: "Slow",
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

export const negativeStockColumns = [
  { header: "Item Code", key: "itemCode", width: "130px" },
  { header: "Item Name", key: "itemName", width: "240px" },
  { header: "Category", key: "categoryName" },
  { header: "Unit", key: "unitName" },
  {
    align: "right",
    format: "qty",
    header: "Current Stock",
    key: "currentStock",
    tone: "negative",
  },
  {
    align: "right",
    format: "currency",
    header: "Stock Value",
    key: "estimatedStockValueImpact",
  },
  {
    format: "date",
    header: "Last Movement",
    key: "lastStockMovementDate",
    width: "140px",
  },
];

export const stockMovementsColumns = [
  { format: "date", header: "Date", key: "movementDate", width: "130px" },
  { header: "Item", key: "itemName", width: "220px" },
  {
    format: "pill",
    header: "Movement Type",
    key: "movementTypeName",
    pillMap: movementTypeMap,
  },
  { header: "Source Type", key: "sourceType" },
  { header: "Party", key: "partyName", width: "180px" },
  { align: "right", format: "qty", header: "Qty In", key: ["quantityIn", "inQuantity"] },
  { align: "right", format: "qty", header: "Qty Out", key: ["quantityOut", "outQuantity"] },
  {
    align: "right",
    format: "qty",
    header: "Balance",
    key: ["runningQuantityBalance", "balanceQuantity"],
  },
  { align: "right", format: "currency", header: "Value", key: "value" },
];

export const itemLedgerColumns = [
  { format: "date", header: "Date", key: "movementDate", width: "130px" },
  { header: "Voucher", key: "voucherNumber", width: "150px" },
  { header: "Source", key: "sourceType" },
  { header: "Party", key: "partyName", width: "180px" },
  { align: "right", format: "qty", header: "Qty In", key: ["quantityIn", "inQuantity"] },
  { align: "right", format: "qty", header: "Qty Out", key: ["quantityOut", "outQuantity"] },
  {
    align: "right",
    format: "qty",
    header: "Running Balance",
    key: ["runningQuantityBalance", "balanceQuantity"],
  },
  { align: "right", format: "currency", header: "Rate", key: "rate" },
  { align: "right", format: "currency", header: "Value", key: "value" },
];

export const deadStockColumns = [
  { header: "Item Code", key: "itemCode", width: "130px" },
  { header: "Item Name", key: "itemName", width: "240px" },
  { header: "Category", key: "categoryName" },
  { align: "right", format: "qty", header: "Current Stock", key: "currentQuantity" },
  { align: "right", format: "currency", header: "Stock Value", key: "stockValue" },
  { format: "date", header: "Last Sold", key: "lastSoldDate", width: "130px" },
  {
    align: "right",
    format: "number",
    header: "Days Inactive",
    key: "daysSinceLastSale",
  },
  {
    format: "pill",
    header: "Classification",
    key: "stockAgeClassification",
    pillMap: classificationMap,
  },
];

export const fastMovingItemsColumns = [
  { align: "right", format: "number", header: "Rank", key: "rank", width: "80px" },
  { header: "Item Code", key: "itemCode", width: "130px" },
  { header: "Item Name", key: "itemName", width: "240px" },
  { header: "Category", key: "categoryName" },
  {
    align: "right",
    format: "number",
    header: "Transactions",
    key: "salesTransactionCount",
  },
  {
    align: "right",
    format: "qty",
    header: "Quantity Moved",
    key: "totalSoldQuantity",
  },
  { align: "right", format: "currency", header: "Value", key: "salesValue" },
];

export const slowMovingItemsColumns = [
  { header: "Item Code", key: "itemCode", width: "130px" },
  { header: "Item Name", key: "itemName", width: "240px" },
  { header: "Category", key: "categoryName" },
  {
    align: "right",
    format: "number",
    header: "Transactions",
    key: "salesTransactionCount",
  },
  { align: "right", format: "qty", header: "Quantity Moved", key: "soldQuantity" },
  { align: "right", format: "currency", header: "Value", key: "stockValue" },
  {
    align: "right",
    format: "number",
    header: "Days Since Sale",
    key: "daysSinceLastSale",
  },
  {
    format: "pill",
    header: "Classification",
    key: "movementClassification",
    pillMap: classificationMap,
  },
];
