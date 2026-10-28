import { decimalText, decimalWire, idWire } from "./productionValues";

// Document quantities and long identities stay serializable text in form/Redux state.
// Financial fields retain their existing separate calculation and rounding policy.
export function documentQuantityText(value) {
  decimalWire(value, { positive: true, scale: 6 });
  return decimalText(value);
}
export function documentIdText(value) {
  if (typeof value === "number" && !Number.isSafeInteger(value)) throw new Error("Select the exact record identity again.");
  idWire(value);
  return String(value).trim();
}
export const optionalDocumentIdText = value => value === null || value === undefined || value === "" ? null : documentIdText(value);

const identities = new Set(["itemId", "unitId", "purchaseBillItemId", "purchaseBillId", "taxRateId", "companyGstRegistrationId"]);
export function wireDocumentQuantities(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(wireDocumentQuantities);
  if (typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key,
    entry === null || entry === undefined || entry === "" ? entry : key === "quantity" ? decimalWire(entry, { positive: true, scale: 6 }) : identities.has(key) ? idWire(documentIdText(entry)) : wireDocumentQuantities(entry),
  ]));
}

const parts = value => {
  const text = decimalText(value), [whole, fraction = ""] = text.split(".");
  return { integer: BigInt(whole + fraction), scale: fraction.length };
};
// Preserve the existing flat-discount <= gross-line rule without Number(quantity).
export function discountFitsDocumentLine(discount, quantity, rate) {
  try {
    const amount = parts(discount), units = parts(quantity), price = parts(rate);
    const productScale = units.scale + price.scale, scale = Math.max(amount.scale, productScale);
    return amount.integer * 10n ** BigInt(scale - amount.scale) <= units.integer * price.integer * 10n ** BigInt(scale - productScale);
  } catch { return false; }
}
