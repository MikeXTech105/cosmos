import { workReturnPath } from "./workReturnPath";

export const LIST_RETURN_VERSION = 1;
export const listReturnStorageKey = (scope, key) => scope && key ? `cosmos:list-return:${scope}:${encodeURIComponent(key)}` : null;
export const locationPath = location => `${location.pathname}${location.search || ""}${location.hash || ""}`;
const validText = value => typeof value === "string" && value.length > 0 && value.length <= 512 && !/[\r\n]/.test(value);
export const exactSavedRecordId = value => {
  if (typeof value === "number" && (!Number.isSafeInteger(value) || value <= 0)) return null;
  if (!["string", "number", "bigint"].includes(typeof value)) return null;
  const id = String(value).trim();
  return validText(id) ? id : null;
};
export function validateListReturnContext(value, scope, auth) {
  if (!scope || !value || value.version !== LIST_RETURN_VERSION || value.scope !== scope || !validText(value.key) || !validText(value.token)) return null;
  const target = workReturnPath(value.path, auth);
  return target ? { version: LIST_RETURN_VERSION, scope, key: value.key, token: value.token, path: target } : null;
}
export function readListReturnSnapshot(scope, key) {
  const storageKey = listReturnStorageKey(scope, key);
  if (!storageKey) return null;
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    return value?.version === LIST_RETURN_VERSION && value.scope === scope && value.key === key && validText(value.path) && validText(value.token) ? value : null;
  } catch { return null; }
}
export function writeListReturnSnapshot(snapshot) {
  const storageKey = listReturnStorageKey(snapshot?.scope, snapshot?.key);
  if (!storageKey) return false;
  try { sessionStorage.setItem(storageKey, JSON.stringify(snapshot)); return true; } catch { return false; }
}
export const sameListEntity = (origin, fallback) => typeof origin === "string" && typeof fallback === "string" && origin.split(/[?#]/)[0].replace(/\/$/, "") === fallback.split(/[?#]/)[0].replace(/\/$/, "");

const pendingGuards = new Map();
export function armListReturnPop(snapshot) {
  const key = listReturnStorageKey(snapshot.scope, snapshot.key);
  const previous = pendingGuards.get(key);
  if (previous) window.removeEventListener("pagehide", previous);
  const invalidate = () => {
    const current = readListReturnSnapshot(snapshot.scope, snapshot.key);
    if (current?.token === snapshot.token) writeListReturnSnapshot({ ...current, pendingReturn: false });
    pendingGuards.delete(key);
  };
  pendingGuards.set(key, invalidate);
  // A fresh document/direct visit must not inherit an old SPA Back-return arm.
  window.addEventListener("pagehide", invalidate, { once: true });
}
export function disarmListReturnPop(scope, key) {
  const storageKey = listReturnStorageKey(scope, key);
  const listener = pendingGuards.get(storageKey);
  if (listener) window.removeEventListener("pagehide", listener);
  pendingGuards.delete(storageKey);
}
