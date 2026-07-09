const AUTH_STORAGE_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  user: "user",
  roles: "roles",
  pages: "pages",
};

const getStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
};

const parseStoredJson = (key, fallback) => {
  const storage = getStorage();

  if (!storage) {
    return fallback;
  }

  try {
    return JSON.parse(storage.getItem(key) || JSON.stringify(fallback));
  } catch {
    storage.removeItem(key);
    return fallback;
  }
};

const setNullableItem = (key, value) => {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  if (value) {
    storage.setItem(key, value);
    return;
  }

  storage.removeItem(key);
};

export const saveAuthData = (data) => {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  updateAuthTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });

  storage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(data.user ?? null));
  storage.setItem(AUTH_STORAGE_KEYS.roles, JSON.stringify(data.roles ?? []));
  storage.setItem(AUTH_STORAGE_KEYS.pages, JSON.stringify(data.pages ?? []));
};

export const updateAuthTokens = ({ accessToken, refreshToken }) => {
  setNullableItem(AUTH_STORAGE_KEYS.accessToken, accessToken);
  setNullableItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken);
};

export const getAuthData = () => {
  const storage = getStorage();

  return {
    accessToken: storage?.getItem(AUTH_STORAGE_KEYS.accessToken) ?? null,
    refreshToken: storage?.getItem(AUTH_STORAGE_KEYS.refreshToken) ?? null,
    user: parseStoredJson(AUTH_STORAGE_KEYS.user, null),
    roles: parseStoredJson(AUTH_STORAGE_KEYS.roles, []),
    pages: parseStoredJson(AUTH_STORAGE_KEYS.pages, []),
  };
};

export const clearAuthData = () => {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  Object.values(AUTH_STORAGE_KEYS).forEach((key) => {
    storage.removeItem(key);
  });
};
