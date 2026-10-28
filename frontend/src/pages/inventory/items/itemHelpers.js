import { optionalDocumentIdText } from "../../../utils/documentPrecision";
import {
  ITEM_CLASSIFICATION_OPTIONS,
  normalizeItemClassification,
} from "../../../utils/itemClassification";
import {
  getItemTypeName,
  ITEM_TYPE,
  ITEM_TYPE_VALUES,
  normalizeItemType,
} from "../../../utils/itemTypes";

export { ITEM_TYPE, ITEM_TYPE_VALUES };
export { ITEM_CLASSIFICATION_OPTIONS };

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
      : String(item.categoryId),
  unitId:
    item?.unitId === null || item?.unitId === undefined
      ? ""
      : String(item.unitId),
  itemType: normalizeItemType(item?.itemType),
  procurementClassification:
    normalizeItemClassification(item?.procurementClassification) ?? "",
  salesPrice: getNumberDefaultValue(item?.salesPrice),
  purchasePrice: getNumberDefaultValue(item?.purchasePrice),
  hsnCode: item?.hsnCode ?? "",
  gstRate: item?.gstRate ?? 0,
  trackInventory: item?.trackInventory ?? true,
  isManufactured: item?.isManufactured ?? false,
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
    categoryId: optionalDocumentIdText(values.categoryId),
    unitId: optionalDocumentIdText(values.unitId),
    itemType,
    procurementClassification: normalizeItemClassification(
      values.procurementClassification,
    ),
    salesPrice: String(values.salesPrice ?? "0"),
    purchasePrice: String(values.purchasePrice ?? "0"),
    hsnCode: cleanString(values.hsnCode),
    gstRate: toNumber(values.gstRate),
    trackInventory: tracksStock,
    isManufactured:
      tracksStock && Boolean(values.isActive) && Boolean(values.isManufactured),
    openingStock: tracksStock ? String(values.openingStock ?? "0") : "0",
    openingStockValue: tracksStock
      ? String(values.openingStockValue ?? "0")
      : "0",
    currentStock: tracksStock ? String(values.currentStock ?? "0") : "0",
    reservedStock: tracksStock ? String(values.reservedStock ?? "0") : "0",
    minimumStock: tracksStock ? String(values.minimumStock ?? "0") : "0",
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
