// These state values match PurchaseDocumentStatus/PurchaseOrderStatus in the API.
export function purchaseDocumentActions(record, kind) {
  const status = Number(record?.status);
  const lines = record?.items ?? [];
  const receiptOwned = lines.some((line) => Number(line.inventoryOwner) === 2);
  if (kind === "orders") return { edit: [1, 2].includes(status), confirm: false, cancel: [1, 2].includes(status), return: false };
  if (kind === "returns") return { edit: Boolean(record) && !record.physicalReceiptReturnId, confirm: false, cancel: false, return: false };
  return { edit: status === 1 && !receiptOwned, confirm: status === 1, cancel: [1, 2, 3, 4].includes(status), return: [2, 3, 4].includes(status) };
}
