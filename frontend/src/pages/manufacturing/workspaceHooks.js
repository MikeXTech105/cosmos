import { useCallback, useEffect, useRef, useState } from "react";
import useCapabilities from "../../hooks/useCapabilities";
import useProductionRuntime from "../../hooks/useProductionRuntime";
import { getApiErrorMessage, getApiFieldErrors } from "../../utils/apiError";
import { newCommandKey } from "../../utils/productionValues";
import { productionWorkspaceService as service } from "../../services/manufacturing/productionWorkspaceService";
const actions = ["view", "create", "update", "approve", "export"];
export const useProductionCapabilities = (page = "Orders") => useCapabilities({ pageName: `Manufacturing.${page}`, resource: `Manufacturing.${page}`, route: page === "Reports" ? "/reports/manufacturing" : "/manufacturing/orders", actions });
export function errorMessage(error) { return [getApiErrorMessage(error), ...Object.entries(getApiFieldErrors(error)).map(([field, text]) => `${field}: ${Array.isArray(text) ? text.join(", ") : text}`), error.response?.data?.data?.conflictCode, error.response?.status === 409 ? "Reload the authoritative source and review your entries before submitting again." : ""].filter(Boolean).join("\n"); }

export function commandIntent(previous, action, payload, scope = action) {
  const fingerprint = JSON.stringify({ action, scope, payload });
  return previous?.fingerprint === fingerprint ? previous : { fingerprint, scope, idempotencyKey: newCommandKey() };
}
export function useWorkspaceCommand() {
  const idle = { busy: false, error: "", success: "", uncertain: false, conflict: false, pending: false };
  const [state, setState] = useState(idle);
  const lock = useRef(false), intent = useRef(null), pending = useRef(null);
  const clear = useCallback((inspected = false, scope) => {
    if (lock.current) return false;
    if (pending.current && (!inspected || scope !== pending.current.scope)) return false;
    intent.current = null; pending.current = null;
    setState({ busy: false, error: "", success: "", uncertain: false, conflict: false, pending: false });
    return true;
  }, []);
  const run = async (action, payload, send, onSaved, scope = action) => {
    if (lock.current || ["conflict", "committed"].includes(pending.current?.status)) return false;
    const next = commandIntent(intent.current, action, payload, scope);
    if (pending.current?.status === "unknown" && (scope !== pending.current.scope || next !== intent.current)) { setState(value => ({ ...value, error: "The previous outcome is unknown. Retry the same request or reload and inspect the same saved source first." })); return false; }
    intent.current = next; lock.current = true; pending.current = { scope, status: "inflight" };
    setState({ busy: true, error: "", success: "", uncertain: false, conflict: false, pending: true });
    try {
      const response = await send({ ...payload, idempotencyKey: next.idempotencyKey });
      pending.current = { scope, status: "committed" };
      try {
        const refreshed = await onSaved?.(response.data);
        if (refreshed === false) throw new Error("Authoritative context could not be refreshed.");
      } catch {
        setState({ busy: false, error: "The command completed, but refreshing its context failed. Reload and inspect the same saved source before another command.", success: "", uncertain: false, conflict: true, pending: true });
        return true;
      }
      intent.current = null; pending.current = null;
      setState({ busy: false, error: "", success: response.message || "Saved. Authoritative context refreshed.", uncertain: false, conflict: false, pending: false });
      return true;
    }
    catch (error) {
      const uncertain = !error.response, conflict = error.response?.status === 409;
      pending.current = uncertain || conflict ? { scope, status: uncertain ? "unknown" : "conflict" } : null;
      setState({ busy: false, error: errorMessage(error), success: "", uncertain, conflict, pending: Boolean(pending.current) });
      return false;
    }
    finally { lock.current = false; }
  };
  return { ...state, run, clear };
}
export function useWorkspaceLookups() {
  const itemsAccess = useCapabilities({ pageName: "Items", resource: "items", route: "/items" });
  const unitsAccess = useCapabilities({ pageName: "Units", resource: "units", route: "/units" });
  const channelsAccess = useCapabilities({ pageName: "SupplyChain.Channels", resource: "scChannels", route: "/supply-chain/channels" });
  const [state, setState] = useState({ items: [], units: [], channels: [], loading: true, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    const all = async (fetcher) => { const output = []; for (let page = 1; ; page++) { const response = await fetcher({ PageNumber: page, PageSize: 200, pageNumber: page, pageSize: 200 }, controller.signal); const data = response.data; const rows = Array.isArray(data) ? data : data?.items || []; output.push(...rows); if (Array.isArray(data) || page * (data.pageSize || 200) >= data.totalCount || !rows.length) break; } return output; };
    Promise.allSettled([itemsAccess.canView ? all(service.items) : Promise.reject(new Error("Item lookup requires Items View access.")), unitsAccess.canView ? all(service.units) : Promise.reject(new Error("Unit lookup requires Units View access.")), channelsAccess.canView ? all(service.channels) : Promise.resolve([])]).then(results => {
      if (controller.signal.aborted) return;
      const names = ["items", "units", "channels"], next = { items: [], units: [], channels: [], loading: false, error: "" };
      results.forEach((result, index) => { if (result.status === "fulfilled") next[names[index]] = result.value; else next.error += `${errorMessage(result.reason)}\n`; }); setState(next);
    });
    return () => controller.abort();
  }, [itemsAccess.canView, unitsAccess.canView, channelsAccess.canView]);
  return { ...state, canReadChannels: channelsAccess.canView };
}
export const itemLabel = (lookups, id) => { const item = lookups.items.find(row => String(row.id) === String(id)); return item ? `${item.itemCode || ""} · ${item.name}` : `Item ${id}`; };
export const unitLabel = (lookups, id) => lookups.units.find(row => String(row.id) === String(id))?.shortName || lookups.units.find(row => String(row.id) === String(id))?.name || (id ? `Unit ${id}` : "Unavailable unit");
export { useProductionRuntime };
