import { assertBusinessDate, compareDecimal } from "../../../utils/productionValues";

// Keep posted decimals as text until the shared API serializer writes JSON numbers.
export const collection = (response) => Array.isArray(response?.data) ? response.data : response?.data?.items ?? [];
export const sourceLines = (record) => record?.items ?? record?.lines ?? [];
export const lineLabel = (line) => [line.itemName ?? line.itemNameSnapshot ?? line.materialItemName ?? line.item?.itemName ?? line.item?.name ?? line.itemCodeSnapshot ?? line.itemCode ?? line.materialItemCode ?? `Item ${line.itemId ?? line.materialItemId}`, line.unitName ?? line.unitNameSnapshot ?? line.item?.unitName].filter(Boolean).join(" · ");

export const decimal = (value, scale = 6, { optional = false, positive = false } = {}) => {
  const text = String(value ?? "").trim();
  if (optional && !text) return null;
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`).test(text)) throw new Error(`Enter a nonnegative number with no more than ${scale} decimal places.`);
  if (positive && !/[1-9]/.test(text)) throw new Error("Quantity must be greater than zero.");
  return text;
};

const scaled = (value, scale = 6) => {
  const [whole, fraction = ""] = decimal(value, scale).split(".");
  return BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, "0"));
};
export const quantityCompare = compareDecimal;
export const quantityDifference = (left, right) => {
  const value = scaled(left) - scaled(right);
  return `${value < 0 ? "-" : ""}${(value < 0 ? -value : value) / 1000000n}.${String((value < 0 ? -value : value) % 1000000n).padStart(6, "0")}`;
};
export const quantitySum = (values) => {
  const value = values.reduce((sum, entry) => sum + scaled(entry), 0n);
  return `${value / 1000000n}.${String(value % 1000000n).padStart(6, "0")}`;
};
export const required = (value, label, max = 1000) => {
  const text = String(value ?? "").trim();
  if (!text || text.length > max) throw new Error(`${label} is required (up to ${max} characters).`);
  return text;
};
export const businessDate = (value) => {
  return assertBusinessDate(value);
};

export const buildReceiptLines = (lines, entries, received = []) => lines.flatMap((line) => {
  const entry = entries[line.id];
  if (!entry?.selected) return [];
  if (!line.itemId || !line.unitId) throw new Error(`${lineLabel(line)} needs its real Item base unit before receipt.`);
  const acceptedQuantity = decimal(entry.accepted);
  const rejectedQuantity = decimal(entry.rejected);
  const quarantinedQuantity = decimal(entry.quarantined);
  if (quantityCompare(quantitySum([acceptedQuantity, rejectedQuantity, quarantinedQuantity]), "0") <= 0) throw new Error("Enter at least one receipt disposition quantity.");
  const accepted = quantitySum(received.filter((row) => String(row.purchaseOrderLineId) === String(line.id)).map((row) => row.acceptedQuantity));
  if (quantityCompare(quantitySum([accepted, acceptedQuantity]), line.quantity) > 0) throw new Error(`${lineLabel(line)} exceeds the accepted outstanding quantity. Over-receipt tolerance is zero.`);
  return [{ purchaseOrderLineId: line.id, itemId: line.itemId, unitId: line.unitId, acceptedQuantity, rejectedQuantity, quarantinedQuantity, sourceUnitCost: decimal(entry.cost, 2, { optional: true }) }];
});

export const buildProcurementDraft = (lines, selected, form) => {
  const chosen = lines.filter((line) => selected[line.id]?.selected);
  if (!chosen.length) throw new Error("Select at least one finalized purchase line.");
  const orderDate = businessDate(form.orderDate);
  if (form.expectedDate && businessDate(form.expectedDate) < orderDate) throw new Error("Expected receipt date cannot precede order date.");
  return {
    supplierId: required(form.supplierId, "Existing supplier", 36), orderDate, expectedDate: form.expectedDate || null,
    notes: form.notes.trim() || null,
    lines: chosen.map((line) => {
      if (quantityCompare(line.finalQuantity ?? line.calculatedSuggestedQuantity ?? "0", "0") <= 0) throw new Error("Only positive finalized purchase quantities can be converted.");
      const input = selected[line.id];
      const taxPercentage = decimal(input.tax, 4);
      if (quantityCompare(taxPercentage, "100") > 0) throw new Error("Tax percentage cannot exceed 100.");
      return { planningRunLineId: line.id, unitPrice: decimal(input.price, 2), taxPercentage, priceSourceReference: required(input.source, "Price source reference", 200) };
    }),
  };
};

export const buildShipmentLinks = (shipmentLines, invoiceLines, existing, entries) => {
  const lines = entries.map((row) => {
    const physical = shipmentLines.find((line) => String(line.id) === String(row.shipmentItemId));
    const financial = invoiceLines.find((line) => String(line.invoiceLineId) === String(row.invoiceLineId));
    if (!physical || !financial || String(physical.itemId) !== String(financial.itemId) || Number(financial.owner) !== 2) throw new Error("Match real Item/base-unit identities and declare Shipment ownership on the invoice draft first.");
    if (!physical.unitId || !financial.unitId) throw new Error("Verify the shipment's real base unit and reload its packing and invoice context before linking quantities.");
    if (String(physical.unitId) !== String(financial.unitId)) throw new Error("Shipment and invoice base units must match.");
    return { shipmentItemId: physical.id, invoiceLineId: financial.invoiceLineId, quantity: decimal(row.quantity, 6, { positive: true }) };
  });
  if (!lines.length) throw new Error("Select at least one actual shipment / invoice allocation.");
  if (new Set(lines.map((row) => `${row.shipmentItemId}:${row.invoiceLineId}`)).size !== lines.length) throw new Error("Select each shipment / invoice line pair only once.");
  for (const line of lines) {
    if (existing.some((old) => String(old.shipmentItemId) === String(line.shipmentItemId) && String(old.invoiceLineId) === String(line.invoiceLineId))) throw new Error("This shipment / invoice line pair is already linked. Inspect its saved quantity before another allocation.");
    const physical = shipmentLines.find((row) => String(row.id) === String(line.shipmentItemId));
    const physicalTotal = quantitySum([...existing.filter((row) => String(row.shipmentItemId) === String(line.shipmentItemId)), ...lines.filter((row) => String(row.shipmentItemId) === String(line.shipmentItemId))].map((row) => row.quantity));
    if (quantityCompare(physicalTotal, physical.plannedQuantity) > 0) throw new Error("Linked quantities exceed the actual shipment line quantity.");
    const financial = invoiceLines.find((row) => String(row.invoiceLineId) === String(line.invoiceLineId));
    const invoiceTotal = quantitySum([...existing.filter((row) => String(row.invoiceLineId) === String(line.invoiceLineId)), ...lines.filter((row) => String(row.invoiceLineId) === String(line.invoiceLineId))].map((row) => row.quantity));
    if (quantityCompare(invoiceTotal, financial.quantity) > 0) throw new Error("Linked quantities exceed the actual invoice line quantity. Other shipments are also revalidated by the server.");
  }
  return lines;
};

export const buildBillReceiptLinks = (billLines, receipts, existing, entries) => {
  const lines = entries.map((row) => {
    const receipt = receipts.find((line) => String(line.id) === String(row.receiptLineId));
    const source = billLines.find((line) => String(line.id) === String(row.billItemId));
    if (!receipt || !source || String(receipt.itemId) !== String(source.itemId) || (source.unitId && String(receipt.unitId) !== String(source.unitId))) throw new Error("Match actual supplier receipt and bill lines for the same Item/base unit.");
    return { receiptLineId: receipt.id, billItemId: source.id, quantity: decimal(row.quantity, 6, { positive: true }) };
  });
  if (!lines.length) throw new Error("Select at least one actual receipt / bill allocation.");
  if (new Set(lines.map((row) => `${row.receiptLineId}:${row.billItemId}`)).size !== lines.length) throw new Error("Select each receipt / bill line pair only once.");
  for (const line of lines) {
    if (existing.some((old) => String(old.receiptLineId) === String(line.receiptLineId) && String(old.billItemId) === String(line.billItemId))) throw new Error("This receipt / bill line is already linked. Inspect its saved quantity before another allocation.");
    const receipt = receipts.find((source) => String(source.id) === String(line.receiptLineId));
    const receiptTotal = quantitySum(lines.filter((row) => String(row.receiptLineId) === String(line.receiptLineId)).map((row) => row.quantity));
    if (quantityCompare(receiptTotal, quantityDifference(receipt.acceptedQuantity, receipt.billedQuantity)) > 0) throw new Error("Selected quantity exceeds the accepted receipt quantity still available for billing.");
    const source = billLines.find((entry) => String(entry.id) === String(line.billItemId));
    const selected = quantitySum([...existing.filter((entry) => String(entry.billItemId) === String(source.id)), ...lines.filter((entry) => String(entry.billItemId) === String(source.id))].map((entry) => entry.quantity));
    if (quantityCompare(selected, source.quantity) !== 0) throw new Error("Fully reconcile each selected bill line quantity to its actual physical receipts before confirmation.");
  }
  return lines;
};

export const receiptCreditSources = (context, returnId) => {
  const original = context?.returns?.find((entry) => String(entry.id) === String(returnId));
  return (context?.billLinks ?? []).filter((link) => String(link.receiptLineId) === String(original?.receiptLineId) && [2, 3, 4].includes(Number(link.billStatus))).map((link) => ({ ...link, creditableQuantity: quantityDifference(link.quantity, quantitySum((context?.returns ?? []).filter((entry) => entry.purchaseReturnId && String(entry.billItemId) === String(link.billItemId) && String(entry.receiptLineId) === String(link.receiptLineId)).map((entry) => entry.acceptedQuantity))) }));
};

export const buildReceiptCredit = (context, form) => {
  const original = context?.returns?.find((entry) => String(entry.id) === String(form.returnId));
  if (!original || original.purchaseReturnId || quantityCompare(original.acceptedQuantity, "0") <= 0) throw new Error("Select an uncredited posted accepted supplier return.");
  const source = receiptCreditSources(context, original.id).find((entry) => String(entry.billItemId) === String(form.billItemId));
  if (!source) throw new Error("Select the original receipt's actual confirmed bill line.");
  if (original.businessDate && businessDate(form.businessDate) < original.businessDate) throw new Error("Financial credit cannot precede its original physical return business date.");
  if (quantityCompare(source.creditableQuantity, original.acceptedQuantity) < 0) throw new Error("This posted return exceeds the selected bill's uncredited receipt quantity. The current financial API credits a complete return against one bill line; an existing return spanning several bills needs financial reconciliation. Its physical history must not be split or reversed automatically.");
  return { billItemId: source.billItemId, businessDate: businessDate(form.businessDate), reason: required(form.reason, "Financial credit reason", 500) };
};
