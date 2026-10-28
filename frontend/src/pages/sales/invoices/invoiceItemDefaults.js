const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const firstDefined = (item, keys) => keys
  .map((key) => item?.[key])
  .find((value) => value !== undefined);

// The item list endpoint is deliberately lightweight. Only the item-details
// contract is authoritative for GST/HSN defaults used by an invoice line.
export const getInvoiceItemDefaults = (item) => {
  // The deployed API is camel case. The Pascal-case fallbacks make the
  // invoice path tolerant of a proxy or legacy host returning CLR names.
  const salesPriceValue = firstDefined(item, ["salesPrice", "SalesPrice"]);
  const gstRateValue = firstDefined(item, ["gstRate", "GSTRate"]);
  const hsnSacCodeValue = firstDefined(item, ["hsnCode", "HSNCode"]);
  const salesPrice = toFiniteNumber(salesPriceValue);
  const gstRate = toFiniteNumber(gstRateValue);

  return {
    itemName: String(item?.name ?? ""),
    hasSalesPrice: salesPriceValue !== undefined && salesPrice !== null,
    salesPrice,
    hasGstRate: gstRateValue !== undefined && gstRate !== null,
    gstRate,
    // Do not coerce this value: HSN/SAC is an identifier and leading zeroes
    // are significant.
    hsnSacCode: typeof hsnSacCodeValue === "string" ? hsnSacCodeValue : "",
  };
};

export const canApplyItemDetails = ({ currentItemId, requestItemId, currentVersion, requestVersion }) =>
  String(currentItemId) === String(requestItemId) && currentVersion === requestVersion;
