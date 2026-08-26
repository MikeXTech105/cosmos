const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const BUSINESS_FIELDS = [
  "Name",
  "Value",
  "Description",
  "Category",
  "IsPrivate",
];

const FIELD_DEFINITIONS = {
  category: { field: "Category", label: "Category" },
  description: { field: "Description", label: "Description" },
  isprivate: { field: "IsPrivate", label: "Privacy" },
  name: { field: "Name", label: "Name" },
  owneruserid: { field: "OwnerUserId", label: "Owner" },
  value: { field: "Value", label: "Value" },
};

const getFieldKey = (field) =>
  typeof field === "string"
    ? field.trim().replace(/[\s_-]+/g, "").toLowerCase()
    : "";

const getObjectValue = (value, propertyName) => {
  if (!isObject(value)) return undefined;

  const exactKey = Object.keys(value).find(
    (key) => key.toLowerCase() === propertyName.toLowerCase(),
  );

  return exactKey === undefined ? undefined : value[exactKey];
};

const getCanonicalFieldName = (field) => {
  if (typeof field !== "string") return "";
  const trimmed = field.trim();
  if (!trimmed) return "";
  return FIELD_DEFINITIONS[getFieldKey(trimmed)]?.field ?? trimmed;
};

const hasSnapshotField = (snapshot, field) => {
  if (!isObject(snapshot)) return false;
  const fieldKey = getFieldKey(field);
  return Object.keys(snapshot).some((key) => getFieldKey(key) === fieldKey);
};

const getSnapshotValue = (snapshot, field) => {
  if (!isObject(snapshot)) return undefined;
  const fieldKey = getFieldKey(field);
  const snapshotKey = Object.keys(snapshot).find(
    (key) => getFieldKey(key) === fieldKey,
  );
  return snapshotKey === undefined ? undefined : snapshot[snapshotKey];
};

const isBusinessField = (field) =>
  BUSINESS_FIELDS.some(
    (businessField) => getFieldKey(businessField) === getFieldKey(field),
  );

const normalizeText = (value, fallback = "") => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
};

const normalizeIdentifier = (value) =>
  typeof value === "string" ||
  (typeof value === "number" && Number.isFinite(value))
    ? value
    : undefined;

const safelyStringify = (value) => {
  try {
    const serialized = JSON.stringify(value, null, 2);
    return typeof serialized === "string" && serialized ? serialized : "—";
  } catch {
    return "—";
  }
};

const historyValuesAreEqual = (left, right) => {
  if (Object.is(left, right)) return true;
  if (
    (Array.isArray(left) || isObject(left)) &&
    (Array.isArray(right) || isObject(right))
  ) {
    return safelyStringify(left) === safelyStringify(right);
  }
  return false;
};

/**
 * Safely parses a legacy JSON history property. Malformed JSON is represented
 * as null so render code never receives the unparsed value.
 */
export const parseDataBookHistoryJson = (value) => {
  if (value === null || value === undefined || value === "") {
    return { parsed: true, raw: "", value: null };
  }

  if (typeof value !== "string") {
    return { parsed: true, raw: "", value };
  }

  try {
    return { parsed: true, raw: value, value: JSON.parse(value) };
  } catch {
    return { parsed: false, raw: value, value: null };
  }
};

export const normalizeDataBookChangedFields = (value) => {
  const parsed = parseDataBookHistoryJson(value);
  if (!parsed.parsed) return [];

  const candidates = Array.isArray(parsed.value)
    ? parsed.value
    : typeof parsed.value === "string" || isObject(parsed.value)
      ? [parsed.value]
      : [];

  const fields = candidates
    .map((candidate) => {
      if (typeof candidate === "string") return candidate;
      if (!isObject(candidate)) return "";
      return getObjectValue(candidate, "FieldName");
    })
    .map(getCanonicalFieldName)
    .filter(Boolean);

  const seen = new Set();
  return fields.filter((field) => {
    const key = getFieldKey(field);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const normalizeDataBookHistorySnapshot = (value) => {
  const parsed = parseDataBookHistoryJson(value);
  return parsed.parsed && isObject(parsed.value) ? parsed.value : null;
};

const selectChangedFields = (record) => {
  const canonical = normalizeDataBookChangedFields(record.changedFields);
  if (canonical.length || record.changedFieldsJson === undefined) {
    return canonical;
  }
  return normalizeDataBookChangedFields(record.changedFieldsJson);
};

const selectSnapshot = (record, canonicalProperty, legacyProperty) => {
  const canonical = normalizeDataBookHistorySnapshot(record[canonicalProperty]);
  if (canonical || record[legacyProperty] === undefined) return canonical;
  return normalizeDataBookHistorySnapshot(record[legacyProperty]);
};

/**
 * @typedef {object} DataBookHistoryEntry
 * @property {string|number|undefined} id
 * @property {string|number|undefined} entryId
 * @property {string} actionType
 * @property {string|number|undefined} changedByUserId
 * @property {string} changedByName
 * @property {string} changedAtUtc
 * @property {string[]} changedFields
 * @property {Record<string, unknown>|null} oldData
 * @property {Record<string, unknown>|null} newData
 * @property {string|null} correlationId
 */

/** @returns {DataBookHistoryEntry} */
export const normalizeDataBookHistoryEntry = (raw) => {
  const record = isObject(raw) ? raw : {};

  return {
    actionType: normalizeText(record.actionType, "Unknown") || "Unknown",
    changedAtUtc: normalizeText(record.changedAtUtc),
    changedByName: normalizeText(record.changedByName),
    changedByUserId: normalizeIdentifier(record.changedByUserId),
    changedFields: selectChangedFields(record),
    correlationId: normalizeText(record.correlationId) || null,
    entryId: normalizeIdentifier(record.entryId),
    id: normalizeIdentifier(record.id),
    newData: selectSnapshot(record, "newData", "newDataJson"),
    oldData: selectSnapshot(record, "oldData", "oldDataJson"),
  };
};

export const normalizeDataBookHistoryPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeDataBookHistoryEntry);
  }

  if (isObject(payload) && Array.isArray(payload.items)) {
    return {
      ...payload,
      items: payload.items.map(normalizeDataBookHistoryEntry),
    };
  }

  return payload;
};

export const getDataBookHistoryFieldLabel = (field) =>
  FIELD_DEFINITIONS[getFieldKey(field)]?.label ??
  (typeof field === "string" && field.trim() ? field.trim() : "Field");

export const formatDataBookHistoryValue = (field, value) => {
  if (value === null || value === undefined || value === "") return "—";

  if (getFieldKey(field) === "isprivate") {
    if (value === true || value === 1 || value === "true" || value === "1") {
      return "Private";
    }
    if (value === false || value === 0 || value === "false" || value === "0") {
      return "Public";
    }
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
  if (typeof value === "bigint") return String(value);
  if (Array.isArray(value) || isObject(value)) return safelyStringify(value);
  return "—";
};

const getRelevantFields = (snapshot) =>
  BUSINESS_FIELDS.filter((field) => hasSnapshotField(snapshot, field));

const getUpdatedFields = (record) => {
  const declared = record.changedFields.filter(isBusinessField);
  if (declared.length) return declared;

  return BUSINESS_FIELDS.filter((field) => {
    const oldValue = getSnapshotValue(record.oldData, field);
    const newValue = getSnapshotValue(record.newData, field);
    return (
      (hasSnapshotField(record.oldData, field) ||
        hasSnapshotField(record.newData, field)) &&
      !historyValuesAreEqual(oldValue, newValue)
    );
  });
};

const toPresentationFields = (fields, oldData, newData) =>
  fields.map((field) => ({
    field,
    label: getDataBookHistoryFieldLabel(field),
    newValue: getSnapshotValue(newData, field),
    oldValue: getSnapshotValue(oldData, field),
  }));

export const getDataBookHistoryDiff = (rawRecord) => {
  const record = normalizeDataBookHistoryEntry(rawRecord);
  const action = record.actionType.toLowerCase();

  if (action === "created") {
    return {
      fields: toPresentationFields(
        getRelevantFields(record.newData),
        null,
        record.newData,
      ),
      mode: "snapshot",
      record,
    };
  }

  if (action === "deleted") {
    return {
      fields: toPresentationFields(
        getRelevantFields(record.oldData),
        record.oldData,
        null,
      ),
      mode: "previous",
      record,
    };
  }

  if (action === "updated") {
    return {
      fields: toPresentationFields(
        getUpdatedFields(record),
        record.oldData,
        record.newData,
      ),
      mode: "diff",
      record,
    };
  }

  const changedFields = record.changedFields.filter(isBusinessField);
  if (changedFields.length) {
    return {
      fields: toPresentationFields(
        changedFields,
        record.oldData,
        record.newData,
      ),
      mode: "diff",
      record,
    };
  }

  const snapshot = record.newData ?? record.oldData;
  return {
    fields: toPresentationFields(
      getRelevantFields(snapshot),
      snapshot === record.oldData ? record.oldData : null,
      snapshot === record.newData ? record.newData : null,
    ),
    mode: snapshot === record.oldData ? "previous" : "snapshot",
    record,
  };
};

export const getDataBookConflictFields = (mine, current) => {
  return ["name", "value", "description", "category", "isPrivate"]
    .filter((field) => mine?.[field] !== current?.[field])
    .map((field) => ({
      current: current?.[field],
      field,
      mine: mine?.[field],
    }));
};
