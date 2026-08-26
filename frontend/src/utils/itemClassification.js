import {
  ProcurementItemClassification,
  PROCUREMENT_ITEM_CLASSIFICATION_LABELS,
  PROCUREMENT_ITEM_CLASSIFICATION_OPTIONS,
} from "../constants/procurementEnums";

export const ITEM_CLASSIFICATION = ProcurementItemClassification;
export const ITEM_CLASSIFICATION_OPTIONS =
  PROCUREMENT_ITEM_CLASSIFICATION_OPTIONS;

const ITEM_CLASSIFICATION_VALUES = new Set(
  Object.values(ITEM_CLASSIFICATION),
);

export const normalizeItemClassification = (value) => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const normalizedValue = Number(value);

  return ITEM_CLASSIFICATION_VALUES.has(normalizedValue)
    ? normalizedValue
    : null;
};

export const getItemClassificationLabel = (value) => {
  const normalizedValue = normalizeItemClassification(value);

  return normalizedValue === null
    ? "Not classified"
    : PROCUREMENT_ITEM_CLASSIFICATION_LABELS[normalizedValue];
};
