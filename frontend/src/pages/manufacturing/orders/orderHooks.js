import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useCapabilities from "../../../hooks/useCapabilities";
import productionOrderService from "../../../services/manufacturing/productionOrderService";
import { productionError, entityLabel, normalizeOrderPage } from "./orderHelpers";
const actions = ["view", "create", "update", "approve"];
export const useOrderCapabilities = () => useCapabilities({
  actions,
  pageName: "Manufacturing.Orders",
  resource: "Manufacturing.Orders",
  route: "/manufacturing/orders",
  label: "Production Orders"
});
export const useOrderLookupAccess = () => ({
  items: useCapabilities({ actions: ["view"], pageName: "Items", resource: "items", route: "/items" }).canView,
  boms: useCapabilities({ actions: ["view"], pageName: "Manufacturing.Boms", resource: "Manufacturing.Boms", route: "/manufacturing/boms" }).canView,
  configuration: useCapabilities({ actions: ["view"], pageName: "Manufacturing.Configuration", resource: "Manufacturing.Configuration", route: "/manufacturing/configuration" }).canView,
  machines: useCapabilities({ actions: ["view"], pageName: "OEE.Machines", resource: "oeeMachines", route: "/oee/machines" }).canView,
  moulds: useCapabilities({ actions: ["view"], pageName: "OEE.Moulds", resource: "oeeMoulds", route: "/oee/moulds" }).canView,
  shifts: useCapabilities({ actions: ["view"], pageName: "HR.Shift", resource: "shifts", route: "/hr/shifts" }).canView,
  channels: useCapabilities({ actions: ["view"], pageName: "SupplyChain.Channels", resource: "scChannels", route: "/supply-chain/channels" }).canView,
});
export const useItemLabels = ids => {
  const access = useCapabilities({ pageName: "Items", resource: "items", route: "/items" });
  const [items, setItems] = useState({});
  const requested = useRef(new Set());
  const key = [...new Set(ids.filter(Boolean).map(String))].sort().join(",");
  useEffect(() => {
    if (!access.canView) return;
    let cancelled = false;
    const requestedIds = requested.current;
    const missing = key.split(",").filter(id => id && !requestedIds.has(id));
    missing.forEach(id => requestedIds.add(id));
    Promise.allSettled(missing.map(async id => [id, (await productionOrderService.item(id)).data])).then(results => {
      if (cancelled) return;
      setItems(current => ({
        ...current,
        ...Object.fromEntries(results.filter(r => r.status === "fulfilled").map(r => r.value))
      }));
    });
    return () => {
      cancelled = true;
      missing.forEach(id => requestedIds.delete(id));
    };
  }, [key, access.canView]);
  return useMemo(() => Object.assign(
    id => access.canView && items[String(id)] ? entityLabel(items[String(id)]) : `Item #${id}`,
    {
      item: id => access.canView ? items[String(id)] : undefined,
      canView: Boolean(access.canView),
      unitLabel: (id, unitId) => {
        const item = access.canView ? items[String(id)] : null;
        return item && String(item.unitId) === String(unitId) && item.unitName ? item.unitName : "Base unit unavailable";
      },
      unitName: unitId => access.canView ? Object.values(items).find(item => String(item.unitId) === String(unitId) && item.unitName)?.unitName ?? "Base unit unavailable" : "Base unit unavailable",
    },
  ), [items, access.canView]);
};

// Shared masters may contain more than 200 rows; do not silently discard later pages.
export const loadAllMasterPages = async (load, params = {}, { signal } = {}) => {
  const collected = [];
  for (let pageNumber = 1; pageNumber <= 10000; pageNumber += 1) {
    if (signal?.aborted) throw new DOMException("Lookup read cancelled.", "AbortError");
    const response = await load({
      ...params,
      PageNumber: pageNumber,
      PageSize: 200
    }, { signal });
    const page = normalizeOrderPage(response);
    collected.push(...page.items);
    if (!page.items.length || pageNumber >= page.totalPages || page.totalCount && collected.length >= page.totalCount) return collected;
  }
  throw new Error("The master lookup is too large. Refine the selection.");
};
export const useAsyncResource = (load, enabled = true) => {
  const [state, setState] = useState({
    source: null,
    data: null,
    busy: false,
    error: ""
  });
  const sequence = useRef(0);
  const controller = useRef(null);
  const reload = useCallback(async () => {
    if (!enabled) return null;
    const request = ++sequence.current;
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setState(s => ({
      source: load,
      data: s.source === load ? s.data : null,
      busy: true,
      error: ""
    }));
    try {
      const result = await load({ signal: active.signal });
      const data = result && Object.prototype.hasOwnProperty.call(result, "data") ? result.data : result;
      if (request !== sequence.current || active.signal.aborted) return null;
      setState({
        source: load,
        data,
        busy: false,
        error: ""
      });
      return data;
    } catch (error) {
      if (request === sequence.current && !active.signal.aborted) setState((previous) => ({
        source: load,
        data: previous.source === load ? previous.data : null,
        busy: false,
        error: productionError(error)
      }));
      return null;
    }
  }, [enabled, load]);
  useEffect(() => {
    void reload();
    return () => {
      sequence.current += 1;
      controller.current?.abort();
    };
  }, [reload]);
  return {
    ...state,
    data: enabled && state.source === load ? state.data : null,
    busy: enabled && (state.source !== load || state.busy),
    error: enabled && state.source === load ? state.error : "",
    reload
  };
};
