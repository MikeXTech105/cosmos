import HsnMaintenancePanel from "./HsnMaintenancePanel";
import { CalendarClock, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppModal from "../../components/common/AppModal";
import DataTableShell from "../../components/common/DataTableShell";
import PageHeader from "../../components/common/PageHeader";
import useCapabilities from "../../hooks/useCapabilities";
import { hsnGstService } from "../../services/gst/hsnGstService";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  getPagedItems,
  todayIsoDate,
  validateRateVersionInput,
} from "./hsnGstHelpers";

const defaultForm = { ruleCode: "", totalRate: "", effectiveFrom: todayIsoDate(), effectiveTo: "", isActive: true, notes: "" };

const GstRateHistoryPage = () => {
  const capabilities = useCapabilities({ actions: ["view", "create"], label: "GST Rate History", pageName: "GST.RateHistory", resource: "GST.RateHistory", route: "/gst/rate-history" });
  const [records, setRecords] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [isOpen, setIsOpen] = useState(false); const [saving, setSaving] = useState(false); const [form, setForm] = useState(defaultForm);
  const load = useCallback(async () => { setLoading(true); setError(""); try { const response = await hsnGstService.listRateVersions({ PageNumber: 1, PageSize: 200 }); setRecords(getPagedItems(response)); } catch (requestError) { setError(getApiErrorMessage(requestError, "Unable to load GST rate history.")); } finally { setLoading(false); } }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);
  const save = async (event) => { event.preventDefault(); const validationMessage = validateRateVersionInput(form); if (validationMessage) { toast.error(validationMessage); return; } setSaving(true); try { const response = await hsnGstService.createRateVersion({ ruleCode: form.ruleCode.trim(), totalRate: Number(form.totalRate), effectiveFrom: form.effectiveFrom, effectiveTo: form.effectiveTo || null, isActive: form.isActive, notes: form.notes.trim() || null }); toast.success(response.message || "GST rate version created."); setIsOpen(false); setForm(defaultForm); await load(); } catch (requestError) { toast.error(getApiErrorMessage(requestError, "Unable to create GST rate version.")); } finally { setSaving(false); } };
  return <section className="space-y-5"><PageHeader badge={<> <CalendarClock className="h-3.5 w-3.5" /> GST / Rate configuration </>} title="GST rate history" description="Record dated total-rate versions. Tax component calculation remains outside this Phase 1 screen." actions={<><AppButton disabled={loading} variant="secondary" onClick={load}><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />Refresh</AppButton>{capabilities.canCreate && <AppButton onClick={() => { setForm(defaultForm); setIsOpen(true); }}><Plus className="h-4 w-4" />Add rate version</AppButton>}</>} />{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<HsnMaintenancePanel /><DataTableShell columnCount={7} emptyTitle="No GST rate versions found" emptyHint="Add an approved effective-dated rate version when the business rule is ready." head={<><th>Rule code</th><th>Version</th><th>Total rate</th><th>Effective from</th><th>Effective to</th><th>Status</th><th>Notes</th></>} loading={loading}>{records.map((record) => <tr key={record.id}><td className="font-semibold text-slate-900">{record.ruleCode}</td><td>{record.versionNumber}</td><td>{Number(record.totalRate).toFixed(2)}%</td><td>{record.effectiveFrom}</td><td>{record.effectiveTo ?? "Open-ended"}</td><td className={record.isActive ? "text-emerald-700" : "text-slate-500"}>{record.isActive ? "Active" : "Inactive"}</td><td><p className="max-w-xs truncate" title={record.notes ?? ""}>{record.notes || "—"}</p></td></tr>)}</DataTableShell><AppModal isBusy={saving} isOpen={isOpen} maxWidth="max-w-xl" onClose={saving ? undefined : () => setIsOpen(false)} title="Add GST rate version"><form className="space-y-4" onSubmit={save}><p className="text-sm leading-6 text-slate-500">The API stores a total GST rate and effective range. It does not calculate CGST, SGST, or IGST here.</p><div className="grid gap-4 sm:grid-cols-2"><AppInput label="Rule code" required value={form.ruleCode} onChange={(event) => setForm((value) => ({ ...value, ruleCode: event.target.value }))} /><AppInput label="Total rate (%)" max="100" min="0" required step="0.01" type="number" value={form.totalRate} onChange={(event) => setForm((value) => ({ ...value, totalRate: event.target.value }))} /><AppInput label="Effective from" required type="date" value={form.effectiveFrom} onChange={(event) => setForm((value) => ({ ...value, effectiveFrom: event.target.value }))} /><AppInput label="Effective to" min={form.effectiveFrom || undefined} type="date" value={form.effectiveTo} onChange={(event) => setForm((value) => ({ ...value, effectiveTo: event.target.value }))} /></div><div><label className="mb-1.5 block text-[13px] font-medium text-slate-700" htmlFor="gst-rate-notes">Notes</label><textarea id="gst-rate-notes" rows={3} value={form.notes} onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))} className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" /></div><label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input checked={form.isActive} className="h-4 w-4 accent-brand" type="checkbox" onChange={(event) => setForm((value) => ({ ...value, isActive: event.target.checked }))} />Active version</label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><AppButton disabled={saving} variant="secondary" onClick={() => setIsOpen(false)}>Cancel</AppButton><AppButton isLoading={saving} type="submit">Create version</AppButton></div></form></AppModal></section>;
};

export default GstRateHistoryPage;
