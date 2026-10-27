const quantityFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 6 });
const measuredPercentFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 6 });
const quantityText = (value) => value == null || value === "-" ? "-" : quantityFormatter.format(Number(value));
const measuredPercentText = (value) => value == null || value === "-" ? "-" : `${measuredPercentFormatter.format(Number(value))}%`;

const productionStatusMap = {
  1: { className: "bg-amber-50 text-amber-700 ring-amber-200", label: "Draft" },
  2: { className: "bg-emerald-50 text-emerald-700 ring-emerald-200", label: "Posted" },
  3: { className: "bg-red-50 text-red-700 ring-red-200", label: "Cancelled" },
  Draft: { className: "bg-amber-50 text-amber-700 ring-amber-200", label: "Draft" },
  Posted: { className: "bg-emerald-50 text-emerald-700 ring-emerald-200", label: "Posted" },
  Cancelled: { className: "bg-red-50 text-red-700 ring-red-200", label: "Cancelled" },
  draft: { className: "bg-amber-50 text-amber-700 ring-amber-200", label: "Draft" },
  posted: { className: "bg-emerald-50 text-emerald-700 ring-emerald-200", label: "Posted" },
  cancelled: { className: "bg-red-50 text-red-700 ring-red-200", label: "Cancelled" },
};

export const manufacturingHistoryColumns = [
  { format: "date", header: "Date", key: "productionDate", width: "130px" },
  { header: "Reference", key: ["referenceNumber", "referenceNo"], width: "150px" },
  { header: "Finished Item", key: ["finishedItemName", "itemName"], width: "240px" },
  { align: "right", format: "qty", renderText: quantityText, header: "Produced Qty", key: ["producedQuantity", "quantity"] },
  { align: "right", format: "qty", renderText: quantityText, header: "Rejected Qty", key: "rejectedOutput" },
  { header: "Unit", key: "unitShortName" },
  { format: "pill", header: "Status", key: ["statusName", "status"], pillMap: productionStatusMap },
  { header: "Data Quality", key: "dataQualityFlag", width: "220px" },
];

export const materialConsumptionColumns = [
  { format: "date", header: "Date", key: "productionDate", width: "130px" },
  { header: "Production", key: "productionReference", width: "150px" },
  { header: "Raw Material", key: "componentItemName", width: "220px" },
  { header: "Code", key: "componentItemCode" },
  { align: "right", format: "qty", renderText: quantityText, header: "Required Qty", key: "requiredQuantity" },
  { align: "right", format: "qty", renderText: quantityText, header: "Expected Qty", key: "expectedConsumption" },
  { align: "right", format: "qty", renderText: quantityText, header: "Actual Consumed Qty", key: "actualConsumedQuantity" },
  { align: "right", format: "qty", renderText: quantityText, header: "Measured Scrap", key: "materialWasteQuantity" },
  { header: "Unit", key: "unitName" },
  { align: "right", format: "percent", renderText: measuredPercentText, header: "Measured Waste", key: "wastePercent" },
  { header: "Data Quality", key: "dataQualityFlag" },
  { format: "pill", header: "Status", key: "status", pillMap: productionStatusMap },
];
