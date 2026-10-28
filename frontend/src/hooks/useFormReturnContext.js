import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useListReturnScope from "./useListReturnScope";
import { exactSavedRecordId, readListReturnSnapshot, sameListEntity, validateListReturnContext, writeListReturnSnapshot } from "../utils/listReturnContext";
import { workReturnPath } from "../utils/workReturnPath";

/** Propagate through create → existing detail → edit. Call savedState only after authoritative save/readback. */
export default function useFormReturnContext(defaultPath) {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth, scope } = useListReturnScope();
  const context = useMemo(() => validateListReturnContext(location.state?.listReturn, scope, auth), [location.state?.listReturn, scope, auth]);
  const fallback = workReturnPath(defaultPath, auth) ?? "/today";
  const explicit = workReturnPath(location.state?.returnTo, auth);
  const returnTo = context?.path ?? explicit ?? fallback;
  const returnState = useCallback((extraState = {}) => ({ ...extraState, ...(context ? { listReturn: context } : {}), returnTo }), [context, returnTo]);
  const savedState = useCallback((savedId, extraState = {}) => {
    const id = exactSavedRecordId(savedId);
    // Cross-document handoffs keep their origin but never highlight a bill ID as a purchase-order ID.
    if (context && id && sameListEntity(context.path, defaultPath)) {
      const snapshot = readListReturnSnapshot(scope, context.key);
      if (snapshot?.token === context.token && snapshot.path === context.path)
        writeListReturnSnapshot({ ...snapshot, highlight: { id, token: crypto.randomUUID(), savedAt: new Date().toISOString() } });
    }
    return returnState(extraState);
  }, [context, defaultPath, returnState, scope]);
  const returnToList = useCallback(savedId => navigate(returnTo, { state: savedId === undefined ? returnState() : savedState(savedId) }), [navigate, returnState, returnTo, savedState]);
  return { returnTo, returnState, savedState, returnToList, hasReturnContext: Boolean(context) };
}
