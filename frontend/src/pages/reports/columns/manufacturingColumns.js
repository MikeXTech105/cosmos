const productionStatusMap = {
  0: { className: "bg-amber-50 text-amber-700 ring-amber-200", label: "Draft" },
  1: { className: "bg-emerald-50 text-emerald-700 ring-emerald-200", label: "Posted" },
  2: { className: "bg-red-50 text-red-700 ring-red-200", label: "Cancelled" },
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
  { align: "right", format: "qty", header: "Produced Qty", key: ["producedQuantity", "quantity"] },
  { header: "Unit", key: "unitShortName" },
  { header: "BOM Version", key: ["bomVersion", "version"] },
  { format: "pill", header: "Status", key: ["statusName", "status"], pillMap: productionStatusMap },
  { header: "Cancellation Reason", key: ["cancellationReason", "cancelReason"], width: "220px" },
];

export const materialConsumptionColumns = [
  { format: "date", header: "Date", key: "productionDate", width: "130px" },
  { header: "Production", key: "productionReference", width: "150px" },
  { header: "Finished Item", key: "producedItemName", width: "220px" },
  { header: "Raw Material", key: "componentItemName", width: "220px" },
  { header: "Code", key: "componentItemCode" },
  { align: "right", format: "qty", header: "Produced Qty", key: "producedQuantity" },
  { align: "right", format: "qty", header: "Consumed Qty", key: "requiredQuantity" },
  { header: "Unit", key: "unitName" },
  { align: "right", format: "percent", header: "Wastage", key: "wastagePercentage" },
  { format: "pill", header: "Status", key: "status", pillMap: productionStatusMap },
];
