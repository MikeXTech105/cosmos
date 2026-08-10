const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

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
    return { parsed: false, raw: value, value };
  }
};

const getChangedFieldNames = (changedFields, oldData, newData) => {
  if (Array.isArray(changedFields)) {
    return changedFields.map(String);
  }

  if (isObject(changedFields)) {
    return Object.keys(changedFields);
  }

  return [
    ...new Set([
      ...Object.keys(isObject(oldData) ? oldData : {}),
      ...Object.keys(isObject(newData) ? newData : {}),
    ]),
  ];
};

export const getDataBookHistoryDiff = (record) => {
  const changedFields = parseDataBookHistoryJson(record?.changedFieldsJson);
  const oldData = parseDataBookHistoryJson(record?.oldDataJson);
  const newData = parseDataBookHistoryJson(record?.newDataJson);
  const fields = getChangedFieldNames(
    changedFields.value,
    oldData.value,
    newData.value,
  );

  return {
    fields: fields.map((field) => ({
      field,
      newValue: isObject(newData.value) ? newData.value[field] : undefined,
      oldValue: isObject(oldData.value) ? oldData.value[field] : undefined,
    })),
    raw: [changedFields, oldData, newData].filter((part) => !part.parsed),
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
