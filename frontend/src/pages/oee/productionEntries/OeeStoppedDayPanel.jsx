import { useCallback, useEffect, useRef, useState } from "react";
import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import AppLookup from "../../../components/common/AppLookup";
import useUnsavedChanges from "../../../hooks/useUnsavedChanges";
import { lookupPage } from "../../../utils/lookupPage";
import { getApiErrorMessage } from "../../../utils/apiError";
import { oeeMachineService } from "../../../services/oee/oeeMachineService";
import { oeeDayAcknowledgementService as service } from "../../../services/oee/oeeDayAcknowledgementService";
import { generateUUID } from "../../../utils/uuid";
const labels = { NotRun: "Not run", PlannedStop: "Planned stop", Withdrawn: "Withdrawn" };

export default function OeeStoppedDayPanel({ productionDate, canView, canCreate, canUpdate, onDirtyChange }) {
  const [records, setRecords] = useState([]), [machineId, setMachineId] = useState("");
  const [state, setState] = useState("NotRun"), [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [intent, setIntent] = useState(null);
  const dateScope = useRef(productionDate);
  useEffect(() => { dateScope.current = productionDate; return () => { dateScope.current = null; }; }, [productionDate]);
  const { confirmLeave } = useUnsavedChanges({ when: Boolean(reason.trim()), message: "This stopped-day acknowledgement is unsaved. Leave without saving?" });
  useEffect(() => { onDirtyChange?.(Boolean(reason.trim())); return () => onDirtyChange?.(false); }, [reason, onDirtyChange]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const rows = await service.all({ fromDate: productionDate, toDate: productionDate });
      if (dateScope.current !== productionDate) return false;
      setRecords(rows); return true;
    } catch (failure) { if (dateScope.current === productionDate) setError(getApiErrorMessage(failure, "Stopped-day acknowledgements could not be loaded. This does not mean the machines were running or missing.")); return false; }
    finally { if (dateScope.current === productionDate) setLoading(false); }
  }, [productionDate]);
  useEffect(() => { if (canView && productionDate) void Promise.resolve().then(load); }, [canView, productionDate, load]);
  const previous = records.find(row => String(row.machineId) === String(machineId));
  const canSave = previous ? canUpdate : canCreate;
  const submit = async () => {
    if (saving || loading || !canSave || !machineId || !reason.trim() || state === "Withdrawn" && !previous) return;
    const request = intent ?? { productionDate, machineId, state, reason: reason.trim(), previousId: previous?.id ?? null, commandKey: generateUUID() };
    setIntent(request); setSaving(true); setError(""); setNotice("");
    try {
      await service.save(request);
      if (!await load()) { setError("The acknowledgement was saved but its history could not be refreshed. Retry the same command or reload before another change."); return; }
      setIntent(null); setReason(""); setNotice("Machine day acknowledged. No runtime, shots, OEE result or stock movement was fabricated.");
    } catch (failure) { setError(getApiErrorMessage(failure, "Acknowledgement could not be confirmed. Retry the same reviewed command, or reload its history.")); }
    finally { setSaving(false); }
  };
  if (!canView) return null;
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div><h2 className="text-base font-semibold text-slate-900">Stopped-day acknowledgements</h2><p className="mt-1 text-sm text-slate-600">Off / skipped remains unentered. Explicitly record Not run or Planned stop with a reason. This evidence is separate from saved readings and OEE performance; it does not declare every machine or shift complete.</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    <div className="grid gap-4 md:grid-cols-3"><AppLookup label="Machine to acknowledge" value={machineId} disabled={saving || Boolean(intent)}
      loadPage={async ({ search, page, pageSize }) => lookupPage(await oeeMachineService.getMachines({ Search: search, IsActive: true, Page: page, PageSize: pageSize }), page, pageSize)}
      loadById={async id => (await oeeMachineService.getMachineById(id)).data} getOptionLabel={machine => `${machine.machineCode} · ${machine.machineName}`}
      onChange={value => confirmLeave(() => { setMachineId(value); setReason(""); setState("NotRun"); })} />
      <AppSelect label="Day acknowledgement" value={state} disabled={saving || Boolean(intent)} options={[{ value: "NotRun", label: "Not run" }, { value: "PlannedStop", label: "Planned stop" }, ...(previous ? [{ value: "Withdrawn", label: "Withdraw prior acknowledgement" }] : [])]} onChange={setState} />
      <AppInput label="Reason / evidence" required maxLength={700} value={reason} disabled={saving || Boolean(intent)} onChange={event => setReason(event.target.value)} /></div>
    {previous && <p className="text-xs text-slate-600">Current saved state: {labels[previous.state]} · {previous.reason}. A correction appends a linked revision; original evidence remains in history.</p>}
    <div className="flex flex-wrap gap-3"><AppButton disabled={!canSave || saving || loading || !machineId || !reason.trim()} onClick={submit}>{saving ? "Saving…" : intent ? "Retry same acknowledgement" : "Reviewed: save acknowledgement"}</AppButton><AppButton variant="secondary" disabled={saving} onClick={async () => { if (await load()) { setIntent(null); setReason(""); } }}>Reload saved acknowledgements</AppButton>{!canSave && <p className="self-center text-xs text-amber-700">{previous ? "Editing an acknowledgement requires Production Entries edit permission." : "Acknowledging a machine day requires Production Entries create permission."}</p>}</div>
    <ul className="divide-y divide-slate-100">{records.map(row => <li className="py-2 text-sm" key={row.id}><strong>{row.machineCode} · {row.machineName}</strong> — {labels[row.state]} · {row.reason}</li>)}</ul>
    {loading && <p role="status" className="text-xs text-slate-500">Loading saved stopped-day evidence…</p>}
  </section>;
}

