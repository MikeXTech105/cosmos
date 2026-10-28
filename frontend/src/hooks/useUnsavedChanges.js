import { useCallback, useEffect, useId } from "react";
import { registerDirtyWork, withoutDirtyPrompt } from "../utils/dirtyWork";

export default function useUnsavedChanges({ when, message = "You have unsaved changes. Leave without saving?" }) {
  const key = useId();
  useEffect(() => {
    if (!when) return;
    const unregister = registerDirtyWork(key, message);
    const onUnload = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", onUnload);
    return () => { unregister(); window.removeEventListener("beforeunload", onUnload); };
  }, [key, message, when]);
  const confirmLeave = useCallback((callback) => {
    if (when && !window.confirm(message)) return false;
    withoutDirtyPrompt(callback);
    return true;
  }, [message, when]);
  return { confirmLeave };
}
