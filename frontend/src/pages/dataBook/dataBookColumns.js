export const DEFAULT_DATA_BOOK_COLUMNS = Object.freeze({
  description: "Description",
  name: "Name",
  value: "Value",
});

const STORAGE_PREFIX = "dataBookColumns:";

const getStorage = (storage) => {
  if (storage) return storage;

  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

export const getDataBookColumnsStorageKey = (category) =>
  `${STORAGE_PREFIX}${String(category || "Uncategorised")}`;

const normalizeColumns = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_DATA_BOOK_COLUMNS };
  }

  return Object.fromEntries(
    Object.entries(DEFAULT_DATA_BOOK_COLUMNS).map(([field, fallback]) => {
      const label = typeof value[field] === "string" ? value[field].trim() : "";
      return [field, label || fallback];
    }),
  );
};

export const getDataBookColumns = (category, storage) => {
  try {
    const value = getStorage(storage)?.getItem(
      getDataBookColumnsStorageKey(category),
    );

    return value
      ? normalizeColumns(JSON.parse(value))
      : { ...DEFAULT_DATA_BOOK_COLUMNS };
  } catch {
    return { ...DEFAULT_DATA_BOOK_COLUMNS };
  }
};

export const saveDataBookColumns = (category, columns, storage) => {
  const normalized = normalizeColumns(columns);

  try {
    getStorage(storage)?.setItem(
      getDataBookColumnsStorageKey(category),
      JSON.stringify(normalized),
    );
  } catch {
    // Display preferences must never prevent the grid from working.
  }

  return normalized;
};
