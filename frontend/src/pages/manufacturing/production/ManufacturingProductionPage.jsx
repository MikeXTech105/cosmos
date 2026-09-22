import { Ban, ClipboardList, Edit3, Eye, Plus, RefreshCw, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import DataTableShell from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import useCapabilities from "../../../hooks/useCapabilities";
import { manufacturingBomService, manufacturingProductionService } from "../../../services/manufacturing/manufacturingService";
import { getApiErrorMessage } from "../../../utils/apiError";
import { ProcurementItemAutocomplete } from "../../procurement/ProcurementShared";
import { ManufacturingCard, ManufacturingInlineError, ManufacturingPagination, ManufacturingStatusPill } from "../ManufacturingShared";
import {
  buildProductionPayload,
  calculateRequiredQuantity,
  formatDate,
  formatQuantity,
  getItemName,
  getRecordId,
  getSnapshotLines,
  isDraftProduction,
  normalizePage,
} from "../manufacturingHelpers";

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({ bomId: "", finishedItem: null, notes: "", producedQuantity: "", productionDate: today(), referenceNumber: "" });
const toForm = (record) => ({
  bomId: record?.bomId ?? record?.manufacturingBomId ?? "",
  finishedItem: { id: record?.finishedItemId ?? record?.itemId, itemCode: record?.finishedItemCode ?? record?.itemCode, name: getItemName(record) },
  notes: record?.notes ?? record?.remarks ?? "",
  producedQuantity: String(record?.producedQuantity ?? record?.quantity ?? ""),
  productionDate: record?.productionDate?.slice?.(0, 10) ?? today(),
  referenceNumber: record?.referenceNumber ?? record?.referenceNo ?? "",
});

const getBomLabel = (bom) => `v${bom.version ?? bom.versionNumber ?? "—"}${bom.isDefault ? " · Default" : ""}`;

const ProductionModal = ({ production, isOpen, onClose, onSaved, readOnly = false }) => {
  const [form, setForm] = useState(emptyForm);
  const [boms, setBoms] = useState([]);
  const [snapshot, setSnapshot] = useState([]);
  const [state, setState] = useState({ error: "", loading: false, saving: false });
  const isEdit = Boolean(production);

  useEffect(() => {
    if (!isOpen) return;
    setForm(production ? toForm(production) : emptyForm());
    setSnapshot(getSnapshotLines(production));
    setState({ error: "", loading: false, saving: false });
  }, [isOpen, production]);

  useEffect(() => {
    if (!isOpen || !production) return undefined;
    let current = true;
    manufacturingProductionService.getById(getRecordId(production))
      .then((response) => {
        if (!current) return;
        const detail = response.data ?? response;
        setForm(toForm(detail));
        setSnapshot(getSnapshotLines(detail));
      })
      .catch((error) => {
        if (current) setState((value) => ({ ...value, error: getApiErrorMessage(error, "Unable to load production details.") }));
      });
    return () => { current = false; };
  }, [isOpen, production]);

  const finishedItemId = form.finishedItem?.id ?? form.finishedItem?.itemId;
  useEffect(() => {
    if (!isOpen || !finishedItemId || readOnly) return undefined;
    let current = true;
    setState((value) => ({ ...value, loading: true }));
    manufacturingBomService.list({ FinishedItemId: finishedItemId, IsActive: true, PageNumber: 1, PageSize: 100 })
      .then((response) => { if (current) setBoms(normalizePage(response).items); })
      .catch((error) => { if (current) setState((value) => ({ ...value, error: getApiErrorMessage(error, "Unable to load active BOM versions.") })); })
      .finally(() => { if (current) setState((value) => ({ ...value, loading: false })); });
    return () => { current = false; };
  }, [finishedItemId, isOpen, readOnly]);

  const selectedBom = useMemo(() => boms.find((bom) => String(getRecordId(bom)) === String(form.bomId)), [boms, form.bomId]);
  const previewLines = snapshot.length > 0 ? snapshot : selectedBom ? (selectedBom.components ?? selectedBom.materials ?? selectedBom.lines ?? []) : [];

  const submit = async () => {
    if (!finishedItemId) { setState((value) => ({ ...value, error: "Select a finished item." })); return; }
    if (!form.bomId) { setState((value) => ({ ...value, error: "Select an active BOM version." })); return; }
    if (Number(form.producedQuantity) <= 0) { setState((value) => ({ ...value, error: "Produced quantity must be greater than zero." })); return; }
    setState((value) => ({ ...value, error: "", saving: true }));
    try {
      const payload = buildProductionPayload(form);
      const response = isEdit
        ? await manufacturingProductionService.update(getRecordId(production), payload)
        : await manufacturingProductionService.create(payload);
      toast.success(response.message || `Production draft ${isEdit ? "updated" : "created"}.`);
      onSaved();
      onClose();
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to save the production draft.");
      setState((value) => ({ ...value, error: message }));
      toast.error(message);
    } finally { setState((value) => ({ ...value, saving: false })); }
  };

  return (
    <AppModal isOpen={isOpen} isBusy={state.saving} onClose={onClose} maxWidth="max-w-5xl" title={readOnly ? "Production details" : isEdit ? "Edit production draft" : "New production draft"}>
      <div className="space-y-5">
        <ManufacturingInlineError message={state.error} title="Production record" />
        {production && <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-xs font-medium text-slate-500">Current status</span><ManufacturingStatusPill record={production} /></div>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1"><ProcurementItemAutocomplete required mode="finished" includeLegacy label="Finished item" disabled={state.saving || isEdit || readOnly} value={form.finishedItem} onChange={(finishedItem) => setForm((current) => ({ ...current, bomId: "", finishedItem }))} /></div>
          <AppSelect required label="BOM version" disabled={state.loading || state.saving || readOnly} placeholder={state.loading ? "Loading BOMs…" : "Select active BOM"} value={form.bomId} options={boms.map((bom) => ({ value: getRecordId(bom), label: getBomLabel(bom) }))} onChange={(bomId) => setForm((current) => ({ ...current, bomId }))} />
          <AppInput required type="number" min="0.000001" step="any" label="Produced quantity" disabled={state.saving || readOnly} value={form.producedQuantity} onChange={(event) => setForm((current) => ({ ...current, producedQuantity: event.target.value }))} />
          <AppInput required type="date" label="Production date" disabled={state.saving || readOnly} value={form.productionDate} onChange={(event) => setForm((current) => ({ ...current, productionDate: event.target.value }))} />
          <AppInput label="Reference number" disabled={state.saving || readOnly} value={form.referenceNumber} onChange={(event) => setForm((current) => ({ ...current, referenceNumber: event.target.value }))} />
          <AppInput label="Notes" disabled={state.saving || readOnly} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </div>
        <ManufacturingCard title={snapshot.length ? "Snapshotted materials" : "Material preview"} description={snapshot.length ? "These quantities were captured when the draft was created." : "Preview only. The server snapshots the BOM when the draft is saved."}>
          {previewLines.length === 0 ? <p className="p-5 text-sm text-slate-500">Select a BOM to view materials.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead className="bg-slate-50"><tr>{["Material", "Base / unit", "Wastage", "Total required"].map((label) => <th key={label} className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead><tbody>{previewLines.map((line, index) => <tr key={line.id ?? line.componentItemId ?? index} className="border-t border-slate-100"><td className="px-4 py-3 font-medium text-slate-800">{line.componentItemName ?? line.itemName ?? line.item?.name ?? "—"}</td><td className="px-4 py-3">{formatQuantity(line.baseQuantity ?? line.quantityPerUnit ?? line.quantity, line.unitShortName)}</td><td className="px-4 py-3">{line.wastagePercentage ?? line.wastagePercent ?? 0}%</td><td className="px-4 py-3 font-semibold text-slate-900">{formatQuantity(line.totalRequiredQuantity ?? line.requiredQuantity ?? calculateRequiredQuantity(line, form.producedQuantity), line.unitShortName)}</td></tr>)}</tbody></table></div>}
        </ManufacturingCard>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><AppButton variant="secondary" disabled={state.saving} onClick={onClose}>{readOnly ? "Close" : "Cancel"}</AppButton>{!readOnly && <AppButton isLoading={state.saving} loadingText="Saving…" onClick={submit}>Save draft</AppButton>}</div>
      </div>
    </AppModal>
  );
};

const CancelModal = ({ production, onClose, onSaved }) => {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (production) { setReason(""); setError(""); } }, [production]);
  const submit = async () => {
    if (!reason.trim()) { setError("Cancellation reason is required."); return; }
    setSaving(true);
    try {
      const response = await manufacturingProductionService.cancel(getRecordId(production), reason.trim());
      toast.success(response.message || "Production cancelled and stock movements reversed.");
      onSaved(); onClose();
    } catch (requestError) { const message = getApiErrorMessage(requestError, "Unable to cancel production."); setError(message); toast.error(message); }
    finally { setSaving(false); }
  };
  return <AppModal isOpen={Boolean(production)} isBusy={saving} onClose={onClose} title="Cancel production"><div className="space-y-4"><p className="text-sm leading-6 text-slate-600">This reverses the posted component and finished-good stock movements atomically.</p><ManufacturingInlineError message={error} /><div><label className="mb-1.5 block text-xs font-semibold text-slate-700">Reason <span className="text-red-500">*</span></label><textarea rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" value={reason} disabled={saving} onChange={(event) => setReason(event.target.value)} /></div><div className="flex justify-end gap-2"><AppButton variant="secondary" disabled={saving} onClick={onClose}>Keep production</AppButton><AppButton variant="danger" isLoading={saving} loadingText="Cancelling…" onClick={submit}>Cancel production</AppButton></div></div></AppModal>;
};

const ManufacturingProductionPage = () => {
  const capabilities = useCapabilities({ label: "Manufacturing.Production", pageName: "Manufacturing.Production", resource: "manufacturingProductions", route: "/manufacturing/production" });
  const [filters, setFilters] = useState({ FromDate: "", PageNumber: 1, PageSize: 20, Search: "", Status: "" });
  const [state, setState] = useState({ actionError: "", error: "", loading: true, page: normalizePage([]) });
  const [modal, setModal] = useState({ open: false, production: null, readOnly: false });
  const [cancelRecord, setCancelRecord] = useState(null);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, error: "", loading: true }));
    try { const response = await manufacturingProductionService.list(filters); setState((current) => ({ ...current, error: "", loading: false, page: normalizePage(response) })); }
    catch (error) { setState((current) => ({ ...current, error: getApiErrorMessage(error, "Unable to load production records."), loading: false })); }
  }, [filters]);
  useEffect(() => { void load(); }, [load]);

  const postProduction = async (production) => {
    const id = getRecordId(production);
    setActionId(id); setState((current) => ({ ...current, actionError: "" }));
    try { const response = await manufacturingProductionService.post(id); toast.success(response.message || "Production posted and inventory updated."); await load(); }
    catch (error) { const message = getApiErrorMessage(error, "Unable to post production."); setState((current) => ({ ...current, actionError: message })); toast.error(message); }
    finally { setActionId(null); }
  };

  return <section className="space-y-6">
    <PageHeader icon={ClipboardList} badge="Manufacturing" title="Production" description="Create drafts, post stock movements, and reverse posted production with an auditable reason." actions={<><AppButton variant="secondary" disabled={state.loading} onClick={load}><RefreshCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} /> Refresh</AppButton><AppButton disabled={!capabilities.canCreate} onClick={() => setModal({ open: true, production: null, readOnly: false })}><Plus className="h-4 w-4" /> New production</AppButton></>} />
    <ManufacturingInlineError message={state.error} onRetry={load} title="Production unavailable" />
    <ManufacturingInlineError message={state.actionError} title="Production could not be posted" />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><AppInput label="Search" placeholder="Reference or item" value={filters.Search} onChange={(event) => setFilters((current) => ({ ...current, PageNumber: 1, Search: event.target.value }))} /><AppSelect label="Status" value={filters.Status} options={[{ value: "", label: "All statuses" }, ...["Draft", "Posted", "Cancelled"].map((value) => ({ value, label: value }))]} onChange={(Status) => setFilters((current) => ({ ...current, PageNumber: 1, Status }))} /><AppInput type="date" label="From date" value={filters.FromDate} onChange={(event) => setFilters((current) => ({ ...current, FromDate: event.target.value, PageNumber: 1 }))} /><AppInput type="date" label="To date" value={filters.ToDate ?? ""} onChange={(event) => setFilters((current) => ({ ...current, PageNumber: 1, ToDate: event.target.value }))} /></div>
    <ManufacturingCard><DataTableShell columnCount={7} loading={state.loading} emptyTitle={!state.loading && state.page.items.length === 0 ? "No production records found" : ""} emptyHint="Create a draft from an active manufacturing BOM." minWidth="min-w-[980px]" head={<>{["Date", "Reference", "Finished item", "Quantity", "BOM", "Status", "Actions"].map((label) => <th key={label}>{label}</th>)}</>}>
      {state.page.items.map((production) => { const id = getRecordId(production); const draft = isDraftProduction(production); const status = String(production.statusName ?? production.status ?? "").toLowerCase(); return <tr key={id}><td>{formatDate(production.productionDate)}</td><td className="font-medium text-slate-900">{production.referenceNumber ?? production.referenceNo ?? `PR-${id}`}</td><td>{getItemName(production)}</td><td>{formatQuantity(production.producedQuantity ?? production.quantity, production.unitShortName)}</td><td>v{production.bomVersion ?? production.version ?? "—"}</td><td><ManufacturingStatusPill record={production} /></td><td><div className="flex gap-1"><button type="button" title="View" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setModal({ open: true, production, readOnly: true })}><Eye className="h-4 w-4" /></button>{draft && <><button type="button" title="Edit draft" disabled={!capabilities.canUpdate} className="rounded-lg p-2 text-slate-400 hover:bg-brand-light hover:text-brand disabled:opacity-40" onClick={() => setModal({ open: true, production, readOnly: false })}><Edit3 className="h-4 w-4" /></button><button type="button" title="Post production" disabled={!capabilities.canUpdate || actionId === id} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40" onClick={() => postProduction(production)}><Send className="h-4 w-4" /></button></>}{status === "posted" && <button type="button" title="Cancel and reverse" disabled={!capabilities.canUpdate} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" onClick={() => setCancelRecord(production)}><Ban className="h-4 w-4" /></button>}</div></td></tr>; })}
    </DataTableShell><ManufacturingPagination disabled={state.loading} page={state.page} onPageChange={(PageNumber) => setFilters((current) => ({ ...current, PageNumber }))} onPageSizeChange={(PageSize) => setFilters((current) => ({ ...current, PageNumber: 1, PageSize }))} /></ManufacturingCard>
    <ProductionModal {...modal} isOpen={modal.open} onClose={() => setModal({ open: false, production: null, readOnly: false })} onSaved={load} />
    <CancelModal production={cancelRecord} onClose={() => setCancelRecord(null)} onSaved={load} />
  </section>;
};

export default ManufacturingProductionPage;
