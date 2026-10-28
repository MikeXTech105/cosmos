import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { CompanyDraftScopeContext } from "../../../hooks/companyDraftScopeContext";
import useCapabilities from "../../../hooks/useCapabilities";
import { getApiCorrelationId, getApiErrorMessage, getApiFieldErrors, isTimeoutError } from "../../../utils/apiError";
import { productionConfigurationService as service } from "../../../services/manufacturing/productionConfigurationService";
import { rowsOf } from "./configurationHelpers";

const actions = ["view", "create", "update", "approve"];
export const useConfigurationCapabilities = () => useCapabilities({ actions, pageName: "Manufacturing.Configuration", resource: "Manufacturing.Configuration", route: "/manufacturing/configuration" });
export const errorText = error => {
  const fields = Object.entries(getApiFieldErrors(error)).map(([key, message]) => `${key}: ${Array.isArray(message) ? message.join(", ") : message}`);
  const correlation = getApiCorrelationId(error);
  return [getApiErrorMessage(error, "Unable to complete this request."), ...fields, correlation ? `Reference: ${correlation}` : ""].filter(Boolean).join("\n");
};

// Keys mask old entity/permission data before effect cleanup. Generations also
// protect against adapters which resolve after cancellation.
export const useConfigurationRead = (loader, resourceKey, enabled = true) => {
  const companyScope = useContext(CompanyDraftScopeContext);
  const scopeKey = JSON.stringify([companyScope, resourceKey]);
  const generation = useRef(0);
  const [state, setState] = useState({ key: null, data: null, loading: false, error: "" });
  const reload = useCallback(async ({ signal } = {}) => {
    const request = ++generation.current;
    if (!enabled || signal?.aborted) return false;
    setState({ key: scopeKey, data: null, loading: true, error: "" });
    try {
      const response = await loader({ signal });
      if (request !== generation.current || signal?.aborted) return false;
      const data = response && Object.hasOwn(response, "data") ? response.data : response;
      if (data == null) throw new Error("The authoritative configuration response was empty. Reload before writing.");
      setState({ key: scopeKey, data, loading: false, error: "" });
      return true;
    } catch (cause) {
      if (request !== generation.current || signal?.aborted) return false;
      setState({ key: scopeKey, data: null, loading: false, error: errorText(cause) });
      return false;
    }
  }, [enabled, loader, scopeKey]);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => reload({ signal: controller.signal }));
    return () => { controller.abort(); generation.current += 1; };
  }, [reload]);
  const current = enabled && state.key === scopeKey;
  return { data: current ? state.data : null, error: current ? state.error : "", loading: enabled && (!current || state.loading), reload };
};

export const useConfigurationLookups = ({ masters = false, resources = false, shifts = false } = {}) => {
  const companyScope = useContext(CompanyDraftScopeContext);
  const config = useConfigurationCapabilities();
  const machine = useCapabilities({ pageName: "OEE.Machines", resource: "oeeMachines", route: "/oee/machines" });
  const mould = useCapabilities({ pageName: "OEE.Moulds", resource: "oeeMoulds", route: "/oee/moulds" });
  const shift = useCapabilities({ pageName: "HR.Shift", resource: "shifts", route: "/hr/shifts" });
  const key = JSON.stringify([companyScope, masters, resources, shifts, config.canView, machine.canView, mould.canView, shift.canView]);
  const [cached, setCached] = useState({ key, rows: {} });
  const remember = useCallback((kind, row) => {
    if (!row?.id) return;
    setCached((previous) => ({ key, rows: { ...(previous.key === key ? previous.rows : {}), [kind]: [...new Map([...(previous.key === key ? previous.rows[kind] ?? [] : []), row].map((entry) => [String(entry.id), entry])).values()] } }));
  }, [key]);
  const loader = useCallback(async ({ signal }) => {
    const requests = [];
    if (masters && config.canView) requests.push(["operations", params => service.listMasters("operations", params, { signal })], ["workCentres", params => service.listMasters("work-centres", params, { signal })]);
    if (resources && machine.canView) requests.push(["machines", params => service.machines(params, { signal })]);
    if (resources && mould.canView) requests.push(["moulds", params => service.moulds(params, { signal })]);
    if (shifts && shift.canView) requests.push(["shifts", params => service.hrShifts(params, { signal })]);
    const result = await Promise.all(requests.map(async ([name, fetcher]) => {
      const response = await fetcher({ PageNumber: 1, PageSize: 40 });
      if (response?.data == null) throw new Error("Lookup response was empty. Reload the current references.");
      return [name, rowsOf(response)];
    }));
    return Object.fromEntries(result);
  }, [masters, resources, shifts, config.canView, machine.canView, mould.canView, shift.canView]);
  const resource = useConfigurationRead(loader, key, config.canView);
  const records = (kind) => resource.error ? [] : [...new Map([...(resource.data?.[kind] ?? []), ...(cached.key === key ? cached.rows[kind] ?? [] : [])].map((row) => [String(row.id), row])).values()];
  const reload = resource.reload;
  const refresh = useCallback(async () => { setCached({ key, rows: {} }); return reload(); }, [key, reload]);
  return { scopeKey: key, operations: records("operations"), workCentres: records("workCentres"), machines: records("machines"), moulds: records("moulds"), shifts: records("shifts"), loading: resource.loading, error: resource.error, refresh, remember, canReadMachines: machine.canView, canReadMoulds: mould.canView, canReadShifts: shift.canView };
};

export const useCommand = onSaved => {
  const [state, setState] = useState({ busy: false, error: "", uncertain: false, conflict: false, committed: false, refreshFailed: false });
  const lock = useRef(false), blocked = useRef(false);
  const clearAfterRead = useCallback(() => {
    if (lock.current) return false;
    blocked.current = false;
    setState({ busy: false, error: "", uncertain: false, conflict: false, committed: false, refreshFailed: false });
    return true;
  }, []);
  const run = async (send, { retrySafe = false } = {}) => {
    if (lock.current || blocked.current || (state.uncertain && !retrySafe)) return false;
    lock.current = true;
    setState(current => ({ ...current, busy: true, error: "" }));
    let response;
    try { response = await send(); }
    catch (cause) {
      const unknown = isTimeoutError(cause) || (!cause.response && cause.code !== "ERR_CANCELED");
      const conflict = cause.response?.status === 409;
      blocked.current = conflict || (unknown && !retrySafe);
      setState({ busy: false, error: `${errorText(cause)}${unknown ? "\nThe outcome is unknown. Reload and inspect saved configuration before changing the request." : ""}`, uncertain: unknown, conflict, committed: false, refreshFailed: false });
      lock.current = false;
      return false;
    }
    blocked.current = true;
    setState({ busy: true, error: "", uncertain: false, conflict: false, committed: true, refreshFailed: false });
    try {
      const refreshed = await onSaved?.(response?.data ?? response);
      if (refreshed !== true) throw new Error("Authoritative configuration readback failed.");
      blocked.current = false;
      setState({ busy: false, error: "", uncertain: false, conflict: false, committed: false, refreshFailed: false });
      return true;
    } catch (cause) {
      setState({ busy: false, error: `The change was saved, but its readback failed. Reload saved configuration before another write.\n${errorText(cause)}`, uncertain: false, conflict: true, committed: true, refreshFailed: true });
      return false;
    } finally { lock.current = false; }
  };
  return { ...state, setError: error => setState(current => ({ ...current, error })), clearAfterRead, run };
};
