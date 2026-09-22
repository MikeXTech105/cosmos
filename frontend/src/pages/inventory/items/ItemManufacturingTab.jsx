import {
  Ban,
  CheckCircle2,
  Factory,
  GitBranch,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import { manufacturingBomService, manufacturingProductionService } from "../../../services/manufacturing/manufacturingService";
import { getApiErrorMessage } from "../../../utils/apiError";
import { ProcurementItemAutocomplete } from "../../procurement/ProcurementShared";
import { ManufacturingInlineError, ManufacturingStatusPill } from "../../manufacturing/ManufacturingShared";
import {
  buildBomPayload,
  buildProductionPayload,
  calculateRequiredQuantity,
  formatDate,
  formatQuantity,
  getBomLines,
  getRecordId,
  isDraftProduction,
  normalizePage,
} from "../../manufacturing/manufacturingHelpers";

const emptyLine = () => ({ baseQuantity: "", item: null, wastagePercentage: "0" });
const emptyBom = () => ({ components: [emptyLine()], description: "", isDefault: true, version: "1" });
const today = () => new Date().toISOString().slice(0, 10);
const isBomActive = (bom) =>
  bom?.isActive === true || String(bom?.status ?? "").toLowerCase() === "active";

const Panel = ({ actions, children, description, title }) => (
  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
    {children}
  </section>
);

const BomEditor = ({ item, onClose, onSaved, open }) => {
  const [form, setForm] = useState(emptyBom);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const setLine = (index, patch) => setForm((current) => ({
    ...current,
    components: current.components.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line),
  }));

  const submit = async () => {
    const ids = form.components.map((line) => String(line.item?.id ?? line.item?.itemId ?? ""));
    if (!form.version.trim()) { setError("BOM version is required."); return; }
    if (ids.some((id) => !id)) { setError("Select every raw material."); return; }
    if (new Set(ids).size !== ids.length) { setError("A raw material cannot be added twice."); return; }
    if (form.components.some((line) => Number(line.baseQuantity) <= 0)) { setError("Base quantity must be greater than zero."); return; }

    setSaving(true); setError("");
    try {
      const response = await manufacturingBomService.create(buildBomPayload({
        ...form,
        finishedItem: item,
      }));
      toast.success(response.message || "BOM version created.");
      onSaved(); onClose();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Unable to create the BOM version.");
      setError(message); toast.error(message);
    } finally { setSaving(false); }
  };

  return <AppModal isOpen={open} isBusy={saving} onClose={onClose} maxWidth="max-w-5xl" title={`Add BOM · ${item?.name ?? "Item"}`}>
    <div className="space-y-4">
      <ManufacturingInlineError message={error} title="BOM could not be saved" />
      <div className="grid gap-4 sm:grid-cols-2"><AppInput required label="Version" value={form.version} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} /><AppInput label="Description" value={form.description} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></div>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4 accent-brand" checked={form.isDefault} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} />Set as default when activated</label>
      <Panel title="Raw materials" description="Enter material required for one finished unit, plus expected wastage." actions={<AppButton className="h-9" variant="secondary" disabled={saving} onClick={() => setForm((current) => ({ ...current, components: [...current.components, emptyLine()] }))}><Plus className="h-4 w-4" />Add material</AppButton>}>
        <div className="space-y-3 p-4">{form.components.map((line, index) => <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[1fr_150px_140px_42px]"><ProcurementItemAutocomplete required mode="component" excludeItemId={item?.id} label={`Raw material ${index + 1}`} disabled={saving} value={line.item} onChange={(selected) => setLine(index, { item: selected })} /><AppInput required type="number" min="0.000001" step="any" label="Qty / unit" value={line.baseQuantity} disabled={saving} onChange={(event) => setLine(index, { baseQuantity: event.target.value })} /><AppInput type="number" min="0" step="any" label="Wastage %" value={line.wastagePercentage} disabled={saving} onChange={(event) => setLine(index, { wastagePercentage: event.target.value })} /><button type="button" aria-label="Remove material" className="mt-6 flex h-10 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" disabled={saving || form.components.length === 1} onClick={() => setForm((current) => ({ ...current, components: current.components.filter((_, lineIndex) => lineIndex !== index) }))}><Trash2 className="h-4 w-4" /></button></div>)}</div>
      </Panel>
      <div className="flex justify-end gap-2"><AppButton variant="secondary" disabled={saving} onClick={onClose}>Cancel</AppButton><AppButton isLoading={saving} loadingText="Saving…" onClick={submit}>Save BOM</AppButton></div>
    </div>
  </AppModal>;
};

const ProductionEditor = ({ boms, item, onClose, onSaved, open }) => {
  const activeBoms = boms.filter(isBomActive);
  const defaultBom = activeBoms.find((bom) => bom.isDefault) ?? activeBoms[0] ?? null;
  const [form, setForm] = useState(() => ({ bomId: getRecordId(defaultBom) ?? "", notes: "", producedQuantity: "", productionDate: today(), referenceNumber: "" }));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedBom = useMemo(() => boms.find((bom) => String(getRecordId(bom)) === String(form.bomId)), [boms, form.bomId]);
  const lines = getBomLines(selectedBom);

  const submit = async () => {
    if (!form.bomId) { setError("Select an active BOM."); return; }
    if (Number(form.producedQuantity) <= 0) { setError("Quantity to manufacture must be greater than zero."); return; }
    setSaving(true); setError("");
    try {
      const response = await manufacturingProductionService.create(buildProductionPayload({ ...form, finishedItem: item }));
      toast.success(response.message || "Production draft created. Review it and post to update stock.");
      onSaved(); onClose();
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Unable to create the production draft.");
      setError(message); toast.error(message);
    } finally { setSaving(false); }
  };

  return <AppModal isOpen={open} isBusy={saving} onClose={onClose} maxWidth="max-w-4xl" title={`Manufacture · ${item?.name ?? "Item"}`}><div className="space-y-4"><ManufacturingInlineError message={error} title="Production draft" /><div className="grid gap-4 sm:grid-cols-2"><AppSelect required label="BOM version" value={form.bomId} disabled={saving} options={activeBoms.map((bom) => ({ value: getRecordId(bom), label: `Version ${bom.version ?? bom.versionNumber}${bom.isDefault ? " · Default" : ""}` }))} onChange={(bomId) => setForm((current) => ({ ...current, bomId }))} /><AppInput required type="number" min="0.000001" step="any" label="Units to manufacture" value={form.producedQuantity} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, producedQuantity: event.target.value }))} /><AppInput required type="date" label="Production date" value={form.productionDate} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, productionDate: event.target.value }))} /><AppInput label="Reference" value={form.referenceNumber} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, referenceNumber: event.target.value }))} /></div><AppInput label="Notes" value={form.notes} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
    <Panel title="Material consumption preview" description="The saved draft keeps its own BOM snapshot."><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="bg-slate-50"><tr>{["Raw material", "Qty / unit", "Wastage", "Required"].map((label) => <th key={label} className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead><tbody>{lines.length ? lines.map((line, index) => <tr key={line.id ?? line.componentItemId ?? index} className="border-t border-slate-100"><td className="px-4 py-3 font-medium">{line.componentItemName ?? line.itemName ?? line.item?.name ?? "—"}</td><td className="px-4 py-3">{formatQuantity(line.baseQuantity ?? line.quantity)}</td><td className="px-4 py-3">{line.wastagePercentage ?? 0}%</td><td className="px-4 py-3 font-semibold">{formatQuantity(calculateRequiredQuantity(line, form.producedQuantity))}</td></tr>) : <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Select an active BOM.</td></tr>}</tbody></table></div></Panel>
    <div className="flex justify-end gap-2"><AppButton variant="secondary" disabled={saving} onClick={onClose}>Cancel</AppButton><AppButton isLoading={saving} loadingText="Saving…" onClick={submit}>Save production draft</AppButton></div></div></AppModal>;
};

const ItemManufacturingTab = ({ disabled, enabled, item, onEnabledChange }) => {
  const itemId = item?.id;
  const [boms, setBoms] = useState([]);
  const [productions, setProductions] = useState([]);
  const [state, setState] = useState({ error: "", loading: false });
  const [bomOpen, setBomOpen] = useState(false);
  const [productionOpen, setProductionOpen] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [cancelRecord, setCancelRecord] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(async () => {
    if (!itemId || !enabled) return;
    setState({ error: "", loading: true });
    try {
      const [bomResponse, productionResponse] = await Promise.all([
        manufacturingBomService.list({ FinishedItemId: itemId, PageNumber: 1, PageSize: 100 }),
        manufacturingProductionService.list({ FinishedItemId: itemId, PageNumber: 1, PageSize: 20 }),
      ]);
      setBoms(normalizePage(bomResponse).items);
      setProductions(normalizePage(productionResponse).items);
      setState({ error: "", loading: false });
    } catch (error) { setState({ error: getApiErrorMessage(error, "Unable to load manufacturing details."), loading: false }); }
  }, [enabled, itemId]);

  useEffect(() => {
    if (!itemId || !enabled) return undefined;

    let active = true;
    Promise.all([
      manufacturingBomService.list({ FinishedItemId: itemId, PageNumber: 1, PageSize: 100 }),
      manufacturingProductionService.list({ FinishedItemId: itemId, PageNumber: 1, PageSize: 20 }),
    ]).then(([bomResponse, productionResponse]) => {
      if (!active) return;
      setBoms(normalizePage(bomResponse).items);
      setProductions(normalizePage(productionResponse).items);
      setState({ error: "", loading: false });
    }).catch((error) => {
      if (active) setState({ error: getApiErrorMessage(error, "Unable to load manufacturing details."), loading: false });
    });

    return () => { active = false; };
  }, [enabled, itemId]);

  const activate = async (bom) => {
    const id = getRecordId(bom); setActionId(id);
    try { const response = await manufacturingBomService.activate(id); toast.success(response.message || "BOM activated."); await load(); }
    catch (error) { toast.error(getApiErrorMessage(error, "Unable to activate the BOM.")); }
    finally { setActionId(null); }
  };

  const post = async (record) => {
    const id = getRecordId(record); setActionId(id);
    try { const response = await manufacturingProductionService.post(id); toast.success(response.message || "Production posted and stock updated."); await load(); }
    catch (error) { toast.error(getApiErrorMessage(error, "Unable to post production.")); }
    finally { setActionId(null); }
  };

  const cancel = async () => {
    if (!cancelReason.trim()) return;
    const id = getRecordId(cancelRecord); setActionId(id);
    try { const response = await manufacturingProductionService.cancel(id, cancelReason.trim()); toast.success(response.message || "Production cancelled and stock reversed."); setCancelRecord(null); setCancelReason(""); await load(); }
    catch (error) { toast.error(getApiErrorMessage(error, "Unable to cancel production.")); }
    finally { setActionId(null); }
  };

  return <div className="space-y-4">
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><span><span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Factory className="h-4 w-4 text-brand" />Enable manufacturing</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">Create this item from raw materials using a bill of materials.</span></span><input type="checkbox" className="h-4 w-4 accent-brand" checked={enabled} disabled={disabled} onChange={(event) => onEnabledChange(event.target.checked)} /></label>
    {!enabled ? <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center"><Factory className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-800">Manufacturing is disabled</p><p className="mt-1 text-xs text-slate-500">Enable it to add a BOM and record production for this item.</p></div> : !itemId ? <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-800"><p className="font-semibold">Save the item first</p><p className="mt-1 text-xs leading-5">After the item is created, reopen its Manufacturing tab to add raw materials and manufacture units.</p></div> : <>
      <ManufacturingInlineError message={state.error} onRetry={load} title="Manufacturing details unavailable" />
      <Panel title="Bill of materials" description="BOM versions and raw-material recipe for this finished item." actions={<><AppButton className="h-9" variant="secondary" disabled={state.loading} onClick={load}><RefreshCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} /></AppButton><AppButton className="h-9" onClick={() => setBomOpen(true)}><Plus className="h-4 w-4" />Add BOM</AppButton></>}>
        {boms.length === 0 ? <div className="px-5 py-10 text-center"><GitBranch className="mx-auto h-6 w-6 text-slate-400" /><p className="mt-2 text-sm font-medium text-slate-800">No BOM added yet</p><p className="mt-1 text-xs text-slate-500">Add raw materials required to make one unit.</p></div> : <div className="divide-y divide-slate-100">{boms.map((bom) => { const active = bom.isActive === true || String(bom.status ?? "").toLowerCase() === "active"; return <div key={getRecordId(bom)} className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><p className="text-sm font-semibold text-slate-900">Version {bom.version ?? bom.versionNumber}</p>{bom.isDefault && <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-semibold text-brand">Default</span>}<span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{active ? "Active" : "Draft"}</span></div><p className="mt-1 text-xs text-slate-500">{getBomLines(bom).length || bom.componentCount || 0} raw materials</p></div>{!active && <AppButton className="h-9" variant="secondary" disabled={actionId === getRecordId(bom)} onClick={() => activate(bom)}><CheckCircle2 className="h-4 w-4" />Activate</AppButton>}</div>{getBomLines(bom).length > 0 && <div className="mt-3 flex flex-wrap gap-2">{getBomLines(bom).map((line, index) => <span key={line.id ?? index} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">{line.componentItemName ?? line.itemName ?? "Material"}: {formatQuantity(line.baseQuantity ?? line.quantity)} + {line.wastagePercentage ?? 0}%</span>)}</div>}</div>; })}</div>}
      </Panel>
      <Panel title="Production" description="Manufacture this item, then post the draft to update raw-material and finished-goods stock." actions={<AppButton className="h-9" disabled={!boms.some(isBomActive)} onClick={() => setProductionOpen(true)}><Factory className="h-4 w-4" />Manufacture</AppButton>}>
        {productions.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">No production history for this item.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-slate-50"><tr>{["Date", "Reference", "Quantity", "BOM", "Status", "Actions"].map((label) => <th key={label} className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead><tbody>{productions.map((record) => { const id = getRecordId(record); const status = String(record.statusName ?? record.status ?? "").toLowerCase(); return <tr key={id} className="border-t border-slate-100"><td className="px-4 py-3">{formatDate(record.productionDate)}</td><td className="px-4 py-3 font-medium">{record.referenceNumber ?? `PR-${id}`}</td><td className="px-4 py-3">{formatQuantity(record.producedQuantity ?? record.quantity)}</td><td className="px-4 py-3">v{record.bomVersion ?? record.version ?? "—"}</td><td className="px-4 py-3"><ManufacturingStatusPill record={record} /></td><td className="px-4 py-3"><div className="flex gap-1">{isDraftProduction(record) && <button type="button" title="Post and update stock" disabled={actionId === id} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40" onClick={() => post(record)}><Send className="h-4 w-4" /></button>}{status === "posted" && <button type="button" title="Cancel and reverse stock" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => setCancelRecord(record)}><Ban className="h-4 w-4" /></button>}</div></td></tr>; })}</tbody></table></div>}
      </Panel>
    </>}
    {bomOpen && <BomEditor item={item} open onClose={() => setBomOpen(false)} onSaved={load} />}
    {productionOpen && <ProductionEditor boms={boms} item={item} open onClose={() => setProductionOpen(false)} onSaved={load} />}
    <AppModal isOpen={Boolean(cancelRecord)} isBusy={Boolean(actionId)} onClose={() => setCancelRecord(null)} title="Cancel production"><div className="space-y-4"><p className="text-sm text-slate-600">This reverses the posted raw-material and finished-goods stock movements.</p><div><label className="mb-1.5 block text-xs font-semibold text-slate-700">Reason <span className="text-red-500">*</span></label><textarea rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></div><div className="flex justify-end gap-2"><AppButton variant="secondary" onClick={() => setCancelRecord(null)}>Keep production</AppButton><AppButton variant="danger" disabled={!cancelReason.trim()} isLoading={Boolean(actionId)} onClick={cancel}>Cancel production</AppButton></div></div></AppModal>
  </div>;
};

export default ItemManufacturingTab;
