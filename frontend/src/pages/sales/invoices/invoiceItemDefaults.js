const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value ?? {}, key);

const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

// The item list endpoint is deliberately lightweight. Only the item-details
// contract is authoritative for GST/HSN defaults used by an invoice line.
export const getInvoiceItemDefaults = (item) => {
  const salesPrice = toFiniteNumber(item?.salesPrice);
  const gstRate = toFiniteNumber(item?.gstRate);

  return {
    itemName: String(item?.name ?? ""),
    hasSalesPrice: hasOwn(item, "salesPrice") && salesPrice !== null,
    salesPrice,
    hasGstRate: hasOwn(item, "gstRate") && gstRate !== null,
    gstRate,
    // Do not coerce this value: HSN/SAC is an identifier and leading zeroes
    // are significant.
    hsnSacCode: typeof item?.hsnCode === "string" ? item.hsnCode : "",
  };
};

export const canApplyItemDetails = ({ currentItemId, requestItemId, currentVersion, requestVersion }) =>
  String(currentItemId) === String(requestItemId) && currentVersion === requestVersion;
