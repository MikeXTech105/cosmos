import { useEffect, useState } from "react";
import AppInput from "../../../components/common/AppInput";
import api from "../../../services/manufacturing/productionApi";
import { unwrapResponse } from "../../../services/apiServiceUtils";
import { decimalWire, quantityText } from "../../../utils/productionValues";
import { getApiErrorMessage } from "../../../utils/apiError";

export default function RoutingPolicyExample({ step, disabled }) {
  const [open, setOpen] = useState(false);
  const [sample, setSample] = useState({ outputQuantity: "120", verifiedOutputPerShot: "" });
  const [result, setResult] = useState({ key: "", value: null, error: "" });
  const key = JSON.stringify({ ...sample, rate: step.rate, rateBasis: Number(step.rateBasis), quantityBasis: step.quantityBasis, setupMinutes: step.setupMinutes });
  useEffect(() => {
    if (!open || disabled) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const source = JSON.parse(key);
        const request = Object.fromEntries(Object.entries(source).map(([name, value]) => [name, name === "rateBasis" ? value : value === "" ? null : decimalWire(value)]));
        const response = unwrapResponse(await api.post("/api/v1/planning-policy-examples/routing", request, { signal: controller.signal }));
        if (!controller.signal.aborted) setResult({ key, value: response.data, error: "" });
      } catch (failure) {
        if (!controller.signal.aborted) setResult({ key, value: null, error: getApiErrorMessage(failure, "Complete positive rate and quantity basis to calculate the example.") });
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [disabled, key, open]);
  return <details className="rounded-xl border border-brand/20 bg-brand/5 p-3" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer text-sm font-semibold">Try this routing step with example output</summary>
    <p className="mt-2 text-xs text-slate-600">Uses the current rate, quantity basis and setup. Example quantities do not create orders, reserve capacity or save eligibility.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2"><AppInput label="Example remaining output (base units)" value={sample.outputQuantity} inputMode="decimal" disabled={disabled} onChange={event => setSample(current => ({ ...current, outputQuantity: event.target.value }))} />{Number(step.rateBasis) === 3 && <AppInput label="Example verified Item output per shot" value={sample.verifiedOutputPerShot} inputMode="decimal" disabled={disabled} onChange={event => setSample(current => ({ ...current, verifiedOutputPerShot: event.target.value }))} />}</div>
    {open && (result.key !== key ? <p role="status" className="mt-3 text-sm">Calculating current step…</p> : result.error ? <p role="alert" className="mt-3 text-sm text-red-700">{result.error}</p> : result.value && <div className="mt-3 space-y-2 text-sm"><p className="font-semibold">Required time: {result.value.requiredMinutes == null ? "Unknown until verified output per shot is supplied" : `${quantityText(result.value.requiredMinutes)} minutes`}</p><p>{result.value.explanation}</p><p className="text-xs text-slate-500">{result.value.calculationVersion}</p></div>)}
  </details>;
}
