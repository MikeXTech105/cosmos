import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { canPerformAction } from "../../utils/permissionResolver";
import { GST_PAGES, gstError, createOperationGate } from "../../utils/gstCompliance";

export function useGstAccess() {
  const { pages, roles, user } = useSelector(state => state.auth);
  return (pageName, action = "view") => {
    const page = GST_PAGES.find(entry => entry.pageName === pageName);
    return Boolean(page && canPerformAction({ pages, roles, user, action, target: { pageName, route: page.route } }));
  };
}

export function useGstQuery(load) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    Promise.resolve().then(async () => {
      if (!active) return;
      setState({ loading: true, data: null, error: "" });
      try {
        const response = await load({ signal: controller.signal });
        if (active) setState({ loading: false, data: response.data, error: "" });
      } catch (error) {
        if (active) setState({ loading: false, data: null, error: gstError(error) });
      }
    });
    return () => { active = false; controller.abort(); };
  }, [load, version]);
  const retry = useCallback(() => setVersion(value => value + 1), []);
  return { ...state, retry };
}

export function useGstOperation() {
  const gate = useRef(createOperationGate());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = operation => gate.current(async () => {
    setBusy(true);
    setError("");
    try { return await operation(); }
    catch (cause) { setError(gstError(cause)); return undefined; }
    finally { setBusy(false); }
  });
  return { busy, error, run, clearError: () => setError("") };
}


