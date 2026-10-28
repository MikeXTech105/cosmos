import { compareDecimal, decimalText } from "../../../utils/productionValues";

export function returnSourceLines(bill) {
  if (![2, 3, 4].includes(Number(bill?.status))) throw new Error("Only a confirmed bill can be returned.");
  return (bill.items ?? []).filter((line) => Number(line.inventoryOwner ?? 1) === 1 && compareDecimal(line.remainingReturnableQuantity ?? "0", "0") > 0).map((line) => {
    const quantity = decimalText(line.remainingReturnableQuantity);
    return {
      itemId: String(line.itemId), itemName: line.itemName, unitId: line.unitId == null ? null : String(line.unitId),
      purchaseBillItemId: String(line.id), quantity, maxReturnQuantity: quantity,
      purchasePrice: String(line.purchasePrice ?? 0), taxPercentage: String(line.taxPercentage ?? 0),
      discountPercentage: String(line.discountPercentage ?? 0),
      discountAmount: returnDiscount(line.discountAmount, line.quantity, quantity),
      sourceQuantity: decimalText(line.quantity), sourceDiscountAmount: String(line.discountAmount ?? 0),
    };
  });
}

// Purchase financial values use the existing currency rule: round each discount to paise.
export function returnDiscount(discount, sourceQuantity, quantity) {
  return Number(sourceQuantity) > 0 ? (Math.round(Number(discount ?? 0) * Number(quantity) / Number(sourceQuantity) * 100) / 100).toFixed(2) : "0";
}
