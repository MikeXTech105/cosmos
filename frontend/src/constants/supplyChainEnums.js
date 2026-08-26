export const SUPPLY_CHAIN_DIMENSION_UNITS = Object.freeze(["CM", "MM"]);

export const SUPPLY_CHAIN_WEIGHT_UNITS = Object.freeze(["KG", "G"]);

export const SUPPLY_CHAIN_IMPORT_TYPES = Object.freeze({
  ProcurementSales: "ProcurementSales",
});

export const SUPPLY_CHAIN_IMPORT_TYPE_OPTIONS = Object.freeze([
  {
    label: "Procurement sales",
    value: SUPPLY_CHAIN_IMPORT_TYPES.ProcurementSales,
  },
  {
    disabled: true,
    label: "Additional import types — Coming soon",
    value: "__coming_soon__",
  },
]);

export const SUPPLY_CHAIN_IMPORT_STATUSES = Object.freeze([
  "Validated",
  "Committed",
  "Cancelled",
  "Failed",
]);

export const SUPPLY_CHAIN_MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export const SUPPLY_CHAIN_IMPORT_EXTENSIONS = Object.freeze([".csv", ".xlsx"]);
