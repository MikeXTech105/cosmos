import { decimalWire, idWire } from "../../utils/productionValues";

export const PRODUCTION_STATUS = {
  DRAFT: "Draft",
  POSTED: "Posted",
  CANCELLED: "Cancelled",
};

export const BOM_STATUS = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export const getRecordId = (record) =>
  record?.id ?? record?.bomId ?? record?.productionId ?? record?.productionRecordId;

export const getItemName = (record) =>
  record?.finishedItemName ?? record?.itemName ?? record?.finishedItem?.name ?? "—";

export const getStatus = (record) => {
  const value = record?.statusName ?? record?.status ?? PRODUCTION_STATUS.DRAFT;

  if (typeof value === "number") {
    return {
      1: PRODUCTION_STATUS.DRAFT,
      2: PRODUCTION_STATUS.POSTED,
      3: PRODUCTION_STATUS.CANCELLED,
    }[value] ?? String(value);
  }

  return String(value);
};

export const isDraftProduction = (record) =>
  getStatus(record).toLowerCase() === PRODUCTION_STATUS.DRAFT.toLowerCase();

export const getBomStatus = (bom) => {
  const value = bom?.status ?? bom?.statusName ?? BOM_STATUS.DRAFT;
  if (typeof value === "number") {
    return { 1: BOM_STATUS.DRAFT, 2: BOM_STATUS.ACTIVE, 3: BOM_STATUS.INACTIVE }[value] ?? String(value);
  }
  return String(value);
};

export const isBomActive = (bom) => bom?.status === 2 || bom?.isActive === true;

export const normalizePage = (response) => {
  const data = response?.data ?? response ?? {};
  const items = Array.isArray(data)
    ? data
    : data.items ?? data.records ?? data.results ?? [];

  return {
    items,
    pageNumber: Number(data.pageNumber ?? data.page ?? 1),
    pageSize: Number(data.pageSize ?? items.length ?? 20),
    totalCount: Number(data.totalCount ?? data.totalRecords ?? items.length),
    totalPages: Math.max(1, Number(data.totalPages ?? 1)),
  };
};

export const formatQuantity = (value, unit) => {
  const quantity = Number(value ?? 0);
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 3,
  }).format(Number.isFinite(quantity) ? quantity : 0);

  return unit ? `${formatted} ${unit}` : formatted;
};

export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value).slice(0, 10)
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
};

export const getBomLines = (bom) =>
  bom?.components ?? bom?.materials ?? bom?.lines ?? bom?.bomItems ?? [];

export const getSnapshotLines = (production) =>
  production?.materialSnapshots ?? production?.materials ?? production?.components ?? [];

export const calculateRequiredQuantity = (line, producedQuantity = 1, outputBaseQuantity = 1) => {
  if (line?.consumptionPerUnit != null) return Number(producedQuantity || 0) * Number(line.consumptionPerUnit);
  const base = Number(line?.quantity ?? line?.baseQuantity ?? line?.quantityPerUnit ?? 0);
  const wastage = Number(line?.wastagePercentage ?? line?.wastagePercent ?? 0);
  if (!(Number(outputBaseQuantity) > 0)) return null;
  return base * Number(producedQuantity || 0) / Number(outputBaseQuantity) * (1 + wastage / 100);
};

export const buildBomPayload = (form) => ({
  finishedItemId: idWire(form.finishedItem?.id ?? form.finishedItem?.itemId),
  version: String(form.version ?? "").trim(),
  effectiveFrom: form.effectiveFrom,
  effectiveTo: form.effectiveTo || null,
  notes: String(form.notes ?? "").trim() || null,
  isDefault: Boolean(form.isDefault),
  ...(form.outputBaseQuantity !== undefined ? { outputBaseQuantity: decimalWire(form.outputBaseQuantity, {positive:true}) } : {}),
  components: form.components.map((line, index) => ({
    componentItemId: idWire(line.item?.id ?? line.item?.itemId),
    quantity: decimalWire(line.quantity, {positive:true}),
    unitId: (line.unitId ?? line.item?.unitId ?? line.item?.unit?.id) ? idWire(line.unitId ?? line.item?.unitId ?? line.item?.unit?.id) : null,
    wastagePercentage: decimalWire(line.wastagePercentage || 0),
    notes: String(line.notes ?? "").trim() || null,
    sortOrder: index + 1,
  })),
});

export const buildBomUpdatePayload = (form) => {
  const payload = buildBomPayload(form);
  return {
    components: payload.components,
    effectiveFrom: payload.effectiveFrom,
    effectiveTo: payload.effectiveTo,
    isDefault: payload.isDefault,
    notes: payload.notes,
    ...(payload.outputBaseQuantity !== undefined ? { outputBaseQuantity: payload.outputBaseQuantity } : {}),
  };
};

export const buildProductionPayload = (form) => ({
  finishedItemId: idWire(form.finishedItem?.id ?? form.finishedItem?.itemId),
  bomId: form.bomId ? idWire(form.bomId) : null,
  plannedQuantity: decimalWire(form.plannedQuantity, {positive:true}),
  producedQuantity: decimalWire(form.producedQuantity, {positive:true}),
  productionDate: form.productionDate,
  referenceNumber: String(form.referenceNumber ?? "").trim() || null,
  notes: String(form.notes ?? "").trim() || null,
});

export const buildProductionUpdatePayload = (form) => {
  const payload = buildProductionPayload(form);
  return {
    notes: payload.notes,
    plannedQuantity: payload.plannedQuantity,
    producedQuantity: payload.producedQuantity,
    productionDate: payload.productionDate,
    referenceNumber: payload.referenceNumber,
  };
};
