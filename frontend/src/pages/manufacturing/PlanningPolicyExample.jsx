import { useEffect, useState } from "react";
import AppInput from "../../components/common/AppInput";
import api from "../../services/manufacturing/productionApi";
import { unwrapResponse } from "../../services/apiServiceUtils";
import { decimalWire } from "../../utils/productionValues";
import { getApiErrorMessage } from "../../utils/apiError";
const numeric = new Set(["salesQuantity", "currentStock", "inbound", "unitsPerBox", "safetyStockFactor", "recurringDemandFactor", "minimumDispatchQuantity", "materialRequirement", "configuredLeadTimeDays", "leadTimeOverrideDays", "historyAverageLeadTimeDays", "safetyFactor", "minimumOrderQuantity", "orderMultiple"]);
export default function PlanningPolicyExample({ kind, policy, disabled = false }) {
  const [open, setOpen] = useState(false), [sample, setSample] = useState({ quantity: "100", currentStock: "30", inbound: "10", unitsPerBox: "10", periodDays: "30" });
  const [result, setResult] = useState({ key: "", value: null, error: "" });
  const key = JSON.stringify({ ...policy, currentStock: sample.currentStock, inbound: sample.inbound,
    ...(kind === "dispatch" ? { salesQuantity: sample.quantity, unitsPerBox: sample.unitsPerBox } : { materialRequirement: sample.quantity, periodDays: Number(sample.periodDays) }) });
  useEffect(() => {
    if (!open || disabled) return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const request = Object.fromEntries(Object.entries(JSON.parse(key)).map(([name, value]) => [name, numeric.has(name) && value != null && value !== "" ? decimalWire(value) : value === "" ? null : value]));
        const response = unwrapResponse(await api.post(`/api/v1/planning-policy-examples/${kind}`, request, { signal: controller.signal }));
        if (!controller.signal.aborted) setResult({ key, value: response.data, error: "" });
      } catch (failure) { if (!controller.signal.aborted) setResult({ key, value: null, error: getApiErrorMessage(failure, "Complete the policy fields to calculate this example.") }); }
    }, 350);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [disabled, key, kind, open]);
  const current = result.key === key;
  return <details className="rounded-xl border border-brand/20 bg-brand/5 p-4" onToggle={event => setOpen(event.currentTarget.open)}><summary className="cursor-pointer text-sm font-semibold text-slate-900">Try a worked policy example</summary><p className="mt-2 text-xs text-slate-600">Illustrative quantities below use the same server calculation as real plans. Your setting and company data are only saved with the separate Save action.</p><div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">{[["quantity", kind === "dispatch" ? "Example sales quantity" : "Example material requirement"], ["currentStock", "Example stock"], ["inbound", "Example eligible inbound"], [kind === "dispatch" ? "unitsPerBox" : "periodDays", kind === "dispatch" ? "Example units per box" : "Requirement period (days)"]].map(([name, label]) => <AppInput key={name} label={label} inputMode="decimal" value={sample[name]} disabled={disabled} onChange={event => setSample(previous => ({ ...previous, [name]: event.target.value }))} />)}</div>{open && (disabled ? <p className="mt-3 text-sm">Finish loading the policy before calculating an example.</p> : !current ? <p role="status" className="mt-3 text-sm text-slate-500">Calculating with the current policy…</p> : result.error ? <p role="alert" className="mt-3 text-sm text-red-700">{result.error}</p> : result.value && <div className="mt-3 space-y-2 text-sm"><p className="font-semibold text-brand">Recommended quantity: {String(result.value.recommendedQuantity)}</p><p className="leading-6 text-slate-700">{result.value.explanation}</p><p className="text-xs text-slate-500">{result.value.calculationVersion} · {result.value.scope}</p></div>)}</details>;
}
