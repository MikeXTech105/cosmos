export const AUTH_STORAGE_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  user: "user",
  roles: "roles",
  pages: "pages",
};

export const AUTH_STORAGE_OWNER_KEY = "cosmos_auth_storage";
export const AUTH_STORAGE_EVENT = "cosmos:auth-storage-change";
const LOCAL_OWNER = "local";
const SESSION_OWNER = "session";

const getBrowserStorages = () => {
  if (typeof window === "undefined") {
    return { local: null, session: null };
  }

  return {
    local: window.localStorage,
    session: window.sessionStorage,
  };
};

const hasStoredSession = (storage) => {
  return Boolean(storage?.getItem(AUTH_STORAGE_KEYS.accessToken));
};

const getOwnerMarker = (localStorage) => {
  const owner = localStorage?.getItem(AUTH_STORAGE_OWNER_KEY);

  return owner === LOCAL_OWNER || owner === SESSION_OWNER ? owner : null;
};

const setOwnerMarker = (localStorage, owner) => {
  if (owner) {
    localStorage?.setItem(AUTH_STORAGE_OWNER_KEY, owner);
  } else {
    localStorage?.removeItem(AUTH_STORAGE_OWNER_KEY);
  }
};

const resolveAuthStorage = ({ migrateLegacy = true } = {}) => {
  const storages = getBrowserStorages();
  const owner = getOwnerMarker(storages.local);

  if (owner === LOCAL_OWNER) {
    return { owner, storage: storages.local, storages };
  }

  if (owner === SESSION_OWNER) {
    return { owner, storage: storages.session, storages };
  }

  if (hasStoredSession(storages.local)) {
    if (migrateLegacy) {
      setOwnerMarker(storages.local, LOCAL_OWNER);
    }

    return { owner: LOCAL_OWNER, storage: storages.local, storages };
  }

  if (hasStoredSession(storages.session)) {
    if (migrateLegacy) {
      setOwnerMarker(storages.local, SESSION_OWNER);
    }

    return { owner: SESSION_OWNER, storage: storages.session, storages };
  }

  return { owner: null, storage: null, storages };
};

const parseStoredJson = (storage, key, fallback) => {
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

const setNullableItem = (storage, key, value) => {
  if (!storage) {
    return;
  }

  if (value) {
    storage.setItem(key, value);
    return;
  }

  storage.removeItem(key);
};

const clearStorageAuthKeys = (storage) => {
  if (!storage) {
    return;
  }

  Object.values(AUTH_STORAGE_KEYS).forEach((key) => {
    storage.removeItem(key);
  });
};

const emitAuthStorageChange = () => {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function" ||
    typeof CustomEvent !== "function"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_STORAGE_EVENT, { detail: getAuthData() }),
  );
};

export const getAuthStorageType = () => {
  return resolveAuthStorage().owner;
};

export const saveAuthData = (data, { rememberMe = true } = {}) => {
  const { storages } = resolveAuthStorage({ migrateLegacy: false });
  const owner = rememberMe ? LOCAL_OWNER : SESSION_OWNER;
  const storage = rememberMe ? storages.local : storages.session;

  if (!storage) {
    return;
  }

  clearStorageAuthKeys(storages.local);
  clearStorageAuthKeys(storages.session);
  setOwnerMarker(storages.local, owner);
  setNullableItem(storage, AUTH_STORAGE_KEYS.accessToken, data.accessToken);
  setNullableItem(storage, AUTH_STORAGE_KEYS.refreshToken, data.refreshToken);
  storage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(data.user ?? null));
  storage.setItem(AUTH_STORAGE_KEYS.roles, JSON.stringify(data.roles ?? []));
  storage.setItem(AUTH_STORAGE_KEYS.pages, JSON.stringify(data.pages ?? []));
  emitAuthStorageChange();
};

export const updateAuthTokens = ({ accessToken, refreshToken }) => {
  const { storage } = resolveAuthStorage();

  if (!storage) {
    return;
  }

  setNullableItem(storage, AUTH_STORAGE_KEYS.accessToken, accessToken);
  setNullableItem(storage, AUTH_STORAGE_KEYS.refreshToken, refreshToken);
  emitAuthStorageChange();
};

export const updateStoredAuthUser = (user) => {
  const { storage } = resolveAuthStorage();

  if (!storage) {
    return;
  }

  const currentUser = parseStoredJson(storage, AUTH_STORAGE_KEYS.user, null);
  storage.setItem(
    AUTH_STORAGE_KEYS.user,
    JSON.stringify({ ...(currentUser ?? {}), ...(user ?? {}) }),
  );
  emitAuthStorageChange();
};

export const getAuthData = () => {
  const { storage } = resolveAuthStorage();

  return {
    accessToken: storage?.getItem(AUTH_STORAGE_KEYS.accessToken) ?? null,
    refreshToken: storage?.getItem(AUTH_STORAGE_KEYS.refreshToken) ?? null,
    user: parseStoredJson(storage, AUTH_STORAGE_KEYS.user, null),
    roles: parseStoredJson(storage, AUTH_STORAGE_KEYS.roles, []),
    pages: parseStoredJson(storage, AUTH_STORAGE_KEYS.pages, []),
  };
};

export const clearAuthData = () => {
  const { storages } = resolveAuthStorage({ migrateLegacy: false });

  clearStorageAuthKeys(storages.local);
  clearStorageAuthKeys(storages.session);
  setOwnerMarker(storages.local, null);
  emitAuthStorageChange();
};
