import { useEffect } from "react";
import useProductionRuntime from "./useProductionRuntime";

// Only untouched date fields may inherit the verified company business day.
// A missing runtime never falls back to a workstation/UTC date or blocks manual entry.
export default function useDocumentBusinessDefaults({ enabled, fields, getValues, getFieldState, setValue }) {
  const context = useProductionRuntime();
  const fieldNames = fields.join(",");
  useEffect(() => {
    if (!enabled || !context.runtime?.businessDate) return;
    for (const name of fieldNames.split(",")) {
      const field = getFieldState(name);
      if (!getValues(name) && !field.isDirty && !field.isTouched) setValue(name, context.runtime.businessDate, { shouldDirty: false });
    }
  }, [enabled, fieldNames, context.runtime?.businessDate, getValues, getFieldState, setValue]);
  return context;
}
