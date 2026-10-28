import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage, isConflictError } from "../../../utils/apiError";

export function usePhysicalContext(read, id, enabled = true) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const generation = useRef(0);
  const abort = useRef(null);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    abort.current?.abort();
    if (!enabled || !id) { setState({ data: null, loading: false, error: "" }); return true; }
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    abort.current = new AbortController();
    try {
      const response = await read(id, { signal: abort.current.signal });
      if (current === generation.current) setState({ data: response.data, loading: false, error: "" });
      return current === generation.current;
    } catch (error) {
      if (current === generation.current) setState({ data: null, loading: false, error: getApiErrorMessage(error, "Unable to load document context.") });
      return false;
    }
  }, [read, id, enabled]);
  useEffect(() => { void Promise.resolve().then(reload); return () => { generation.current += 1; abort.current?.abort(); }; }, [reload]);
  return { ...state, reload };
}

export async function reloadPhysical(...reloaders) {
  const results = await Promise.all(reloaders.filter(Boolean).map((reload) => reload()));
  if (results.some((result) => result !== true)) throw new Error("Authoritative context could not be reloaded. Review the saved source before another command.");
  return true;
}

export async function reviewPhysical(command, ...reloaders) {
  try { await reloadPhysical(...reloaders); command.clear(true); return true; } catch { return false; /* Each context keeps its actionable read error. */ }
}

// Identical uncertain retries retain the original key and payload. A new intent gets a new key.
export function createCommandIntent() {
  let intent;
  return {
    matches(action, payload) { return intent?.fingerprint === JSON.stringify({ action, payload }); },
    payload(action, payload) {
      const fingerprint = JSON.stringify({ action, payload });
      if (intent?.fingerprint !== fingerprint) intent = { fingerprint, payload: { ...payload, idempotencyKey: globalThis.crypto.randomUUID() } };
      return intent.payload;
    },
    complete() { intent = undefined; },
  };
}

export function usePhysicalCommand(onSaved) {
  const retry = useRef(createCommandIntent());
  const locked = useRef(false);
  const [state, setState] = useState({ saving: false, error: "", conflict: false, uncertain: false });
  const run = async (action, payload, send) => {
    if (locked.current || state.conflict) return null;
    if (state.uncertain && !retry.current.matches(action, payload)) {
      setState((current) => ({ ...current, error: "The previous outcome is unknown. Retry the identical request or reload and inspect the authoritative source before changing the command." }));
      return null;
    }
    locked.current = true;
    setState({ saving: true, error: "", conflict: false, uncertain: false });
    try {
      const response = await send(retry.current.payload(action, payload));
      retry.current.complete();
      toast.success(response.message || "Command completed. Refreshing source balances.");
      try { if (onSaved && await onSaved(response.data) !== true) throw new Error("Readback was not confirmed."); } catch {
        setState({ saving: false, error: "The command completed, but refreshing its context failed. Reload and inspect the saved document before another action.", conflict: true, uncertain: false });
        return response.data;
      }
      setState({ saving: false, error: "", conflict: false, uncertain: false });
      return response.data;
    } catch (error) {
      setState({ saving: false, error: getApiErrorMessage(error, "Unable to complete the command. For an uncertain network result, reload context before retrying the same intent."), conflict: isConflictError(error), uncertain: !error.response });
      return null;
    } finally { locked.current = false; }
  };
  return { ...state, run, fail: (error) => setState((current) => ({ ...current, saving: false, error: error.message })), clear: (inspected = false) => {
    if (locked.current) return;
    if ((state.uncertain || state.conflict) && !inspected) return;
    if (inspected) retry.current.complete();
    setState({ saving: false, error: "", conflict: false, uncertain: false });
  } };
}

