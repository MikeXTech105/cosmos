export const PREFERENCES_STORAGE_KEY = "cosmos_preferences";
export const PREFERENCES_EVENT = "cosmos:preferences-change";
export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_MANUFACTURING_ENABLED = true;
export const PAGE_SIZE_OPTIONS = [10, 20, 25, 50, 100];

const normalizePageSize = (value) => {
  const pageSize = Number(value);

  return PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE;
};

export const getStoredPreferences = () => {
  if (typeof window === "undefined") {
    return {
      defaultPageSize: DEFAULT_PAGE_SIZE,
      manufacturingEnabled: DEFAULT_MANUFACTURING_ENABLED,
    };
  }

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(PREFERENCES_STORAGE_KEY) || "{}",
    );

    return {
      defaultPageSize: normalizePageSize(stored.defaultPageSize),
      manufacturingEnabled: stored.manufacturingEnabled !== false,
    };
  } catch {
    return {
      defaultPageSize: DEFAULT_PAGE_SIZE,
      manufacturingEnabled: DEFAULT_MANUFACTURING_ENABLED,
    };
  }
};

export const updateStoredPreferences = (updates) => {
  const preferences = {
    ...getStoredPreferences(),
    ...(updates ?? {}),
  };
  const normalized = {
    defaultPageSize: normalizePageSize(preferences.defaultPageSize),
    manufacturingEnabled: preferences.manufacturingEnabled !== false,
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify(normalized),
    );
    window.dispatchEvent(
      new CustomEvent(PREFERENCES_EVENT, { detail: normalized }),
    );
  }

  return normalized;
};

export const getDefaultPageSize = () => getStoredPreferences().defaultPageSize;
export const getManufacturingEnabled = () => getStoredPreferences().manufacturingEnabled;
