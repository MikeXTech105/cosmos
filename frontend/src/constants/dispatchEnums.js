export const DISPATCH_IMPORT_TYPES = Object.freeze({
  Sales: 1,
  WarehouseStock: 2,
  Inbound: 3,
});

export const DISPATCH_IMPORT_TYPE_LABELS = Object.freeze({
  [DISPATCH_IMPORT_TYPES.Sales]: "Sales",
  [DISPATCH_IMPORT_TYPES.WarehouseStock]: "Warehouse stock",
  [DISPATCH_IMPORT_TYPES.Inbound]: "Inbound",
});

// Mirrors Cosmos.Domain.SupplyChain.SupplyChainImportStatus and the import procedures.
export const DISPATCH_IMPORT_STATUS = Object.freeze({
  Uploaded: 1,
  Validating: 2,
  Validated: 3,
  ValidationFailed: 4,
  Committed: 5,
  Cancelled: 6,
});

export const DISPATCH_IMPORT_STATUS_LABELS = Object.freeze({
  [DISPATCH_IMPORT_STATUS.Uploaded]: "Uploaded",
  [DISPATCH_IMPORT_STATUS.Validating]: "Validating",
  [DISPATCH_IMPORT_STATUS.Validated]: "Validated",
  [DISPATCH_IMPORT_STATUS.ValidationFailed]: "Validation failed",
  [DISPATCH_IMPORT_STATUS.Committed]: "Committed",
  [DISPATCH_IMPORT_STATUS.Cancelled]: "Cancelled",
});

// CONFIRM: Numeric values are inferred from the documented lifecycle order.
export const DISPATCH_RUN_STATUS = Object.freeze({
  Draft: 1,
  Calculated: 2,
  Allocated: 3,
  Finalized: 4,
  Cancelled: 5,
});

export const DISPATCH_RUN_STATUS_LABELS = Object.freeze({
  [DISPATCH_RUN_STATUS.Draft]: "Draft",
  [DISPATCH_RUN_STATUS.Calculated]: "Calculated",
  [DISPATCH_RUN_STATUS.Allocated]: "Allocated",
  [DISPATCH_RUN_STATUS.Finalized]: "Finalized",
  [DISPATCH_RUN_STATUS.Cancelled]: "Cancelled",
});

// CONFIRM: Tier labels are documented, but Swagger omits the integer mapping.
export const DISPATCH_TIERS = Object.freeze({
  Tier1: 1,
  Tier2: 2,
  Tier3: 3,
});

export const DISPATCH_TIER_LABELS = Object.freeze({
  [DISPATCH_TIERS.Tier1]: "Tier 1",
  [DISPATCH_TIERS.Tier2]: "Tier 2",
  [DISPATCH_TIERS.Tier3]: "Tier 3",
});

// CONFIRM: Numeric values follow the order in the integration documentation.
export const DISPATCH_ROUNDING_MODES = Object.freeze({
  Exact: 1,
  NearestBox: 2,
  RoundUpToBox: 3,
  RoundDownToBox: 4,
  ExactBelowOneBox: 5,
  HalfBoxThreshold: 6,
});

export const DISPATCH_ROUNDING_MODE_LABELS = Object.freeze({
  [DISPATCH_ROUNDING_MODES.Exact]: "Exact",
  [DISPATCH_ROUNDING_MODES.NearestBox]: "Nearest box",
  [DISPATCH_ROUNDING_MODES.RoundUpToBox]: "Round up to box",
  [DISPATCH_ROUNDING_MODES.RoundDownToBox]: "Round down to box",
  [DISPATCH_ROUNDING_MODES.ExactBelowOneBox]: "Exact below one box",
  [DISPATCH_ROUNDING_MODES.HalfBoxThreshold]: "Half-box threshold",
});

export const DISPATCH_ROUNDING_MODE_HELP = Object.freeze({
  [DISPATCH_ROUNDING_MODES.Exact]: "Keeps the exact recommended quantity.",
  [DISPATCH_ROUNDING_MODES.NearestBox]: "Rounds to the nearest complete box.",
  [DISPATCH_ROUNDING_MODES.RoundUpToBox]: "Rounds upward to a complete box.",
  [DISPATCH_ROUNDING_MODES.RoundDownToBox]: "Rounds downward to a complete box.",
  [DISPATCH_ROUNDING_MODES.ExactBelowOneBox]:
    "Keeps loose quantity below one box, then applies box rounding.",
  [DISPATCH_ROUNDING_MODES.HalfBoxThreshold]:
    "Uses half a box as the threshold for box rounding.",
});

// CONFIRM: Numeric values follow the order named in the integration document.
export const DISPATCH_INBOUND_STATUSES = Object.freeze({
  Planned: 1,
  Dispatched: 2,
  InTransit: 3,
  Received: 4,
  Cancelled: 5,
});

export const DISPATCH_INBOUND_STATUS_LABELS = Object.freeze({
  [DISPATCH_INBOUND_STATUSES.Planned]: "Planned",
  [DISPATCH_INBOUND_STATUSES.Dispatched]: "Dispatched",
  [DISPATCH_INBOUND_STATUSES.InTransit]: "In transit",
  [DISPATCH_INBOUND_STATUSES.Received]: "Received",
  [DISPATCH_INBOUND_STATUSES.Cancelled]: "Cancelled",
});

// CONFIRM: Value 1 is documented as system company stock, but no backend enum
// metadata or authenticated response was available to independently verify it.
export const DISPATCH_COMPANY_STOCK_SOURCE_TYPE = Object.freeze({
  SystemCompanyStock: 1,
});

export const DISPATCH_MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export const DISPATCH_IMPORT_HEADERS = Object.freeze({
  [DISPATCH_IMPORT_TYPES.Sales]: Object.freeze([
    "RowNumber",
    "WarehouseCode",
    "ChannelSku",
    "PeriodFrom",
    "PeriodTo",
    "SalesQuantity",
  ]),
  [DISPATCH_IMPORT_TYPES.WarehouseStock]: Object.freeze([
    "RowNumber",
    "WarehouseCode",
    "ChannelSku",
    "SnapshotDate",
    "AvailableQuantity",
    "ReservedQuantity",
    "DamagedQuantity",
  ]),
  [DISPATCH_IMPORT_TYPES.Inbound]: Object.freeze([
    "RowNumber",
    "WarehouseCode",
    "ChannelSku",
    "SnapshotDate",
    "InboundQuantity",
    "InboundStatus",
    "ExpectedArrivalDate",
    "ReferenceNumber",
  ]),
});

export const toDispatchOptions = (labels) =>
  Object.entries(labels).map(([value, label]) => ({
    label,
    value: Number(value),
  }));
