import { useCallback, useContext, useState } from "react";
import { useSelector } from "react-redux";
import { getTrustedDraftScope, getUserScope } from "../utils/userScope";
import { CompanyDraftScopeContext } from "./companyDraftScopeContext";

export default function useUserPreferences(namespace, fallback) {
  const auth = useSelector((state) => state.auth);
  const verifiedCompanyScope = useContext(CompanyDraftScopeContext);
  const scope = verifiedCompanyScope ?? getTrustedDraftScope(auth);
  const key = scope ? `cosmos:preferences:${scope}:${namespace}` : null;
  const memoryKey = key ?? `${getUserScope(auth)}:unverified:${namespace}`;
  const read = () => { try { return key ? JSON.parse(localStorage.getItem(key) || "null") ?? fallback : fallback; } catch { return fallback; } };
  const [state, setState] = useState(() => ({ key: memoryKey, value: read() }));
  const value = state.key === memoryKey ? state.value : read();
  const setValue = useCallback((next) => {
    setState((previous) => {
      let current = fallback;
      if (previous.key === memoryKey) current = previous.value;
      else { try { current = JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { /* storage is optional */ } }
      const resolved = typeof next === "function" ? next(current) : next;
      let storageError = "";
      try { if (key) localStorage.setItem(key, JSON.stringify(resolved)); } catch { storageError = "Browser storage is unavailable. Changes apply in this open page only and will not survive reload."; }
      return { key: memoryKey, value: resolved, storageError };
    });
  }, [fallback, key, memoryKey]);
  return [value, setValue, { available: Boolean(key), error: state.key === memoryKey ? state.storageError ?? "" : "" }];
}
