import { serializeId } from "../inventoryHelpers";
import {
  getItemTypeName,
  ITEM_TYPE,
  ITEM_TYPE_VALUES,
  normalizeItemType,
} from "../../../utils/itemTypes";

export { ITEM_TYPE, ITEM_TYPE_VALUES };

export const ITEM_TYPE_OPTIONS = ITEM_TYPE_VALUES.map((value) => ({
  value,
  label: getItemTypeName(value),
}));

export const GST_RATE_OPTIONS = [0, 3, 5, 12, 18, 28].map((value) => ({
  value: String(value),
  label: `${value}%`,
}));

const getNumberDefaultValue = (value) => {
  return value === null || value === undefined ? "" : String(value);
};

export const getItemDefaultValues = (item) => ({
  name: item?.name ?? "",
  itemCode: item?.itemCode ?? "",
  barcode: item?.barcode ?? "",
  categoryId:
    item?.categoryId === null || item?.categoryId === undefined
      ? ""
      : Number(item.categoryId),
  unitId:
    item?.unitId === null || item?.unitId === undefined
      ? ""
      : Number(item.unitId),
  itemType: normalizeItemType(item?.itemType),
  salesPrice: getNumberDefaultValue(item?.salesPrice),
  purchasePrice: getNumberDefaultValue(item?.purchasePrice),
  hsnCode: item?.hsnCode ?? "",
  gstRate: item?.gstRate ?? 0,
  trackInventory: item?.trackInventory ?? true,
  openingStock: getNumberDefaultValue(item?.openingStock),
  openingStockValue: getNumberDefaultValue(item?.openingStockValue),
  currentStock: getNumberDefaultValue(item?.currentStock),
  reservedStock: getNumberDefaultValue(item?.reservedStock),
  minimumStock: getNumberDefaultValue(item?.minimumStock),
  description: item?.description ?? "",
  imageFile: null,
  imageUrl: item?.imageUrl ?? "",
  isActive: item?.isActive ?? true,
});

const toNumber = (value) => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
};

export const buildItemPayload = (values) => {
  const itemType = normalizeItemType(values.itemType);
  const tracksStock =
    itemType === ITEM_TYPE.PRODUCT && Boolean(values.trackInventory);
  const cleanString = (value, { noneAsNull = false } = {}) => {
    const stringValue = String(value ?? "").trim();

    if (noneAsNull && stringValue.toLowerCase() === "none") {
      return null;
    }

    return stringValue || null;
  };

  return {
    name: values.name.trim(),
    itemCode: cleanString(values.itemCode),
    barcode: cleanString(values.barcode, { noneAsNull: true }),
    categoryId: serializeId(values.categoryId) ?? 0,
    unitId:
      itemType === ITEM_TYPE.PRODUCT
        ? (serializeId(values.unitId) ?? 0)
        : 0,
    itemType,
    salesPrice: toNumber(values.salesPrice),
    purchasePrice: toNumber(values.purchasePrice),
    hsnCode: cleanString(values.hsnCode),
    gstRate: toNumber(values.gstRate),
    trackInventory: tracksStock,
    openingStock: tracksStock ? toNumber(values.openingStock) : 0,
    openingStockValue: tracksStock
      ? toNumber(values.openingStockValue)
      : 0,
    currentStock: tracksStock ? toNumber(values.currentStock) : 0,
    reservedStock: tracksStock ? toNumber(values.reservedStock) : 0,
    minimumStock: tracksStock ? toNumber(values.minimumStock) : 0,
    description: cleanString(values.description),
    imageFile: values.imageFile ?? null,
    imageUrl: cleanString(values.imageUrl),
    isActive: Boolean(values.isActive),
  };
};

export const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(toNumber(value));
};

const formatQuantity = (value) => {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(toNumber(value));
};

const cleanCompactUnitLabel = (unitShortName) => {
  return String(unitShortName ?? "")
    .trim()
    .replace(/^\d+(?:\.\d+)?\s+/, "")
    .trim();
};

export const formatStockWithUnit = (quantity, unitShortName) => {
  const formattedQuantity = formatQuantity(quantity);
  const unit = cleanCompactUnitLabel(unitShortName);

  return unit ? `${formattedQuantity} ${unit}` : formattedQuantity;
};

export const formatStock = (value, shortName) => {
  return formatStockWithUnit(value, shortName);
};

export const formatUnitDisplay = (unitName, unitShortName) => {
  const name = String(unitName ?? "").trim();
  const shortName = cleanCompactUnitLabel(unitShortName);
  const compactName = cleanCompactUnitLabel(name);

  if (name && shortName && name !== shortName && compactName !== shortName) {
    return `${name} (${shortName})`;
  }

  return name || shortName;
};

export const isLowStock = (item) => {
  return (
    normalizeItemType(item?.itemType) === ITEM_TYPE.PRODUCT &&
    item?.trackInventory !== false &&
    toNumber(item?.currentStock) <= toNumber(item?.minimumStock)
  );
};

export const getItemTypeLabel = (value) => {
  return getItemTypeName(value);
};

export const generateItemCode = (name) => {
  const prefix =
    name
      ?.trim()
      .replace(/[^a-z0-9]+/gi, "")
      .slice(0, 4)
      .toUpperCase() || "ITEM";
  const suffix = String(Date.now()).slice(-6);

  return `${prefix}-${suffix}`;
};
