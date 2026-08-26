export const ProcurementItemClassification = Object.freeze({
  FinishedProduct: 1,
  RawMaterial: 2,
  Component: 3,
  PackingMaterial: 4,
});

export const PlanningRunStatus = Object.freeze({
  Draft: 1,
  Finalized: 2,
  Cancelled: 3,
});

export const PlanningRoundingRule = Object.freeze({
  None: 1,
  UpToOrderMultiple: 2,
});

export const PlanningMessageSeverity = Object.freeze({
  Information: 1,
  Warning: 2,
  BlockingError: 3,
});

export const SalesImportBatchStatus = Object.freeze({
  Completed: 1,
  Cancelled: 2,
});

const toOptions = (labels) =>
  Object.entries(labels).map(([value, label]) => ({
    label,
    value: Number(value),
  }));

export const PROCUREMENT_ITEM_CLASSIFICATION_LABELS = Object.freeze({
  [ProcurementItemClassification.FinishedProduct]: "Finished product",
  [ProcurementItemClassification.RawMaterial]: "Raw material",
  [ProcurementItemClassification.Component]: "Component",
  [ProcurementItemClassification.PackingMaterial]: "Packing material",
});

export const PLANNING_RUN_STATUS_LABELS = Object.freeze({
  [PlanningRunStatus.Draft]: "Draft",
  [PlanningRunStatus.Finalized]: "Finalized",
  [PlanningRunStatus.Cancelled]: "Cancelled",
});

export const PLANNING_ROUNDING_RULE_LABELS = Object.freeze({
  [PlanningRoundingRule.None]: "No rounding",
  [PlanningRoundingRule.UpToOrderMultiple]: "Round up to order multiple",
});

export const PLANNING_MESSAGE_SEVERITY_LABELS = Object.freeze({
  [PlanningMessageSeverity.Information]: "Information",
  [PlanningMessageSeverity.Warning]: "Warning",
  [PlanningMessageSeverity.BlockingError]: "Blocking error",
});

export const SALES_IMPORT_BATCH_STATUS_LABELS = Object.freeze({
  [SalesImportBatchStatus.Completed]: "Completed",
  [SalesImportBatchStatus.Cancelled]: "Cancelled",
});

export const PROCUREMENT_ITEM_CLASSIFICATION_OPTIONS = toOptions(
  PROCUREMENT_ITEM_CLASSIFICATION_LABELS,
);
export const PLANNING_RUN_STATUS_OPTIONS = toOptions(
  PLANNING_RUN_STATUS_LABELS,
);
export const PLANNING_ROUNDING_RULE_OPTIONS = toOptions(
  PLANNING_ROUNDING_RULE_LABELS,
);
export const PLANNING_MESSAGE_SEVERITY_OPTIONS = toOptions(
  PLANNING_MESSAGE_SEVERITY_LABELS,
);
export const SALES_IMPORT_BATCH_STATUS_OPTIONS = toOptions(
  SALES_IMPORT_BATCH_STATUS_LABELS,
);
