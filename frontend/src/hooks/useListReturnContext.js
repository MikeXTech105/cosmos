import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import useListReturnScope from "./useListReturnScope";
import { LIST_RETURN_VERSION, armListReturnPop, disarmListReturnPop, listReturnStorageKey, locationPath, readListReturnSnapshot, validateListReturnContext, writeListReturnSnapshot } from "../utils/listReturnContext";
import { workReturnPath } from "../utils/workReturnPath";

/** Capture only on real route navigation. Existing URL query and the owning list's filter model remain authoritative. */
export default function useListReturnContext({ key, filters, setFilters, ready = true, enabled = true }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { auth, scope } = useListReturnScope();
  const currentPath = locationPath(location);
  const storageKey = listReturnStorageKey(scope, key);
  const [highlight, setHighlight] = useState({ key: null, id: null });
  const [storageError, setStorageError] = useState("");
  const filtersRestored = useRef(null);
  const scrollRestored = useRef(null);
  const identity = `${storageKey}:${currentPath}`;
  const filterJson = JSON.stringify(filters ?? {});
  const incoming = useMemo(() => validateListReturnContext(location.state?.listReturn, scope, auth), [location.state?.listReturn, scope, auth]);
  const isReturning = useCallback(snapshot => snapshot && snapshot.path === currentPath && Boolean(workReturnPath(snapshot.path, auth)) && (
    (incoming?.key === key && incoming.token === snapshot.token && incoming.path === snapshot.path) ||
    (navigationType === "POP" && snapshot.pendingReturn && snapshot.entryKey === location.key)
  ), [auth, currentPath, incoming, key, location.key, navigationType]);

  const capture = useCallback((extraState = {}) => {
    const target = workReturnPath(currentPath, auth);
    if (!enabled || !scope || !target) return { ...extraState, ...(target ? { returnTo: target } : {}) };
    const context = { version: LIST_RETURN_VERSION, scope, key, token: crypto.randomUUID(), path: target };
    const snapshot = { ...context, filters: JSON.parse(filterJson), scroll: { x: window.scrollX, y: window.scrollY }, entryKey: location.key, pendingReturn: true, capturedAt: new Date().toISOString() };
    const saved = writeListReturnSnapshot(snapshot);
    if (saved) armListReturnPop(snapshot);
    setStorageError(saved ? "" : "List position could not be retained in this tab. The return link is still available.");
    return { ...extraState, listReturn: context, returnTo: target };
  }, [auth, currentPath, enabled, filterJson, key, location.key, scope]);

  useEffect(() => {
    if (!enabled || !scope || filtersRestored.current === identity) return;
    const snapshot = readListReturnSnapshot(scope, key);
    // A direct/deep-linked URL with a different query must never receive cached filters.
    if (!isReturning(snapshot)) return;
    filtersRestored.current = identity;
    if (snapshot.filters !== undefined && JSON.stringify(snapshot.filters) !== filterJson) setFilters?.(snapshot.filters);
  }, [enabled, filterJson, identity, isReturning, key, scope, setFilters]);

  const restoreScroll = useCallback(() => {
    if (!ready || !enabled || !scope || scrollRestored.current === identity) return false;
    const snapshot = readListReturnSnapshot(scope, key);
    if (!isReturning(snapshot)) return false;
    scrollRestored.current = identity;
    const x = Number.isFinite(snapshot.scroll?.x) ? Math.max(0, snapshot.scroll.x) : 0;
    const y = Number.isFinite(snapshot.scroll?.y) ? Math.max(0, snapshot.scroll.y) : 0;
    window.scrollTo({ left: x, top: y, behavior: "auto" });
    disarmListReturnPop(scope, key);
    const { highlight: pendingHighlight, ...remaining } = snapshot;
    const consumed = writeListReturnSnapshot({ ...remaining, pendingReturn: false });
    if (snapshot.highlight?.id && snapshot.highlight?.token) {
      const id = String(snapshot.highlight.id);
      // Consume storage once, but retain the visible highlight for this mounted list visit.
      if (consumed) setHighlight({ key: storageKey, id });
      else setStorageError("The saved row could not be highlighted safely in this tab.");
    }
    void pendingHighlight;
    return true;
  }, [enabled, identity, isReturning, key, ready, scope, storageKey]);
  useEffect(() => {
    if (!ready || !enabled) return;
    let second;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(restoreScroll); });
    return () => { cancelAnimationFrame(first); if (second) cancelAnimationFrame(second); };
  }, [enabled, ready, restoreScroll]);

  const clearHighlight = useCallback(() => setHighlight({ key: storageKey, id: null }), [storageKey]);
  return { capture, highlightId: highlight.key === storageKey ? highlight.id : null, clearHighlight, restoreScroll, available: Boolean(enabled && scope), storageError };
}
