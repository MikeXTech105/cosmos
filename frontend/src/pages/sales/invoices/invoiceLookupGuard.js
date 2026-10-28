export function invoiceLookupTarget({ rows, rowId, itemId, invoiceDate, getValues, latest }) {
  const index = rows.findIndex(row => row.id === rowId);
  return latest && index >= 0 && String(getValues(`items.${index}.itemId`)) === String(itemId) && getValues("invoiceDate") === invoiceDate ? index : -1;
}
