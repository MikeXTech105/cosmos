import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getTrustedDraftScope } from "../utils/userScope";
import { CompanyDraftScopeContext } from "./companyDraftScopeContext";
import { generateUUID } from "../utils/uuid";

const readDraft = (key) => {
  if (!key) return null;
  try { return JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || "null"); } catch { return null; }
};
const stamp = (draft) => draft?.revision ?? draft?.savedAt ?? null;

export default function useScopedDraft({ entity, context = "new", version = 1, values, enabled = true, scope: suppliedScope }) {
  const verifiedCompanyScope = useContext(CompanyDraftScopeContext);
  const scope = suppliedScope === undefined ? verifiedCompanyScope ?? getTrustedDraftScope() : suppliedScope;
  const key = useMemo(() => scope ? `cosmos:draft:${scope}:${encodeURIComponent(entity)}:${encodeURIComponent(String(context))}` : null, [context, entity, scope]);
  const [recovered, setRecovered] = useState(() => ({ key, draft: readDraft(key) }));
  const expected = useRef({ key, stamp: stamp(recovered.draft) });
  const [storageError, setStorageError] = useState("");
  const recoveredDraft = recovered.key === key ? recovered.draft : readDraft(key);
  const saveDraft = useCallback((nextValues = values) => {
    if (!key) return false;
    try {
      const baseline = expected.current.key === key ? expected.current.stamp : stamp(recoveredDraft);
      if (stamp(readDraft(key)) !== baseline) {
        setStorageError("A newer draft exists in another tab. Your current entries are kept here; review that draft before replacing it.");
        return false;
      }
      const revision = generateUUID();
      localStorage.setItem(key, JSON.stringify({ version, values: nextValues, revision, savedAt: new Date().toISOString() }));
      expected.current = { key, stamp: revision };
      setStorageError("");
      return true;
    } catch { setStorageError("Draft recovery is unavailable in this browser. Save before leaving."); return false; }
  }, [key, recoveredDraft, values, version]);
  const clearDraft = useCallback(() => {
    if (key) {
      const baseline = expected.current.key === key ? expected.current.stamp : stamp(recoveredDraft);
      if (stamp(readDraft(key)) !== baseline) { setStorageError("A newer draft exists in another tab and has been retained."); return; }
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      expected.current = { key, stamp: null };
    }
    setRecovered({ key, draft: null });
  }, [key, recoveredDraft]);
  const acknowledgeRecovery = useCallback(() => {
    expected.current = { key, stamp: stamp(recoveredDraft) };
    setRecovered({ key, draft: null });
  }, [key, recoveredDraft]);
  useEffect(() => {
    if (!enabled || !key || recoveredDraft) return;
    const timer = window.setTimeout(() => saveDraft(values), 500);
    const saveOnExit = () => saveDraft(values);
    window.addEventListener("pagehide", saveOnExit);
    return () => { clearTimeout(timer); window.removeEventListener("pagehide", saveOnExit); };
  }, [enabled, key, recoveredDraft, saveDraft, values]);
  return { recoveredDraft, stale: Boolean(recoveredDraft && recoveredDraft.version !== version), saveDraft, clearDraft, acknowledgeRecovery, storageError, available: Boolean(key) };
}
