const PREFIX = "cosmos:form-draft:";

const getStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const readFormDraft = (key) => {
  try {
    const raw = getStorage()?.getItem(`${PREFIX}${key}`);
    return raw ? JSON.parse(raw)?.values ?? null : null;
  } catch {
    return null;
  }
};

export const saveFormDraft = (key, values) => {
  getStorage()?.setItem(
    `${PREFIX}${key}`,
    JSON.stringify({ savedAt: new Date().toISOString(), values }),
  );
};

export const clearFormDraft = (key) => {
  getStorage()?.removeItem(`${PREFIX}${key}`);
};
