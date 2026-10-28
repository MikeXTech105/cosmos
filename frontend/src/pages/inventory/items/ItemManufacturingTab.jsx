import {
  Ban,
  CheckCircle2,
  Factory,
  GitBranch,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import useCapabilities from "../../../hooks/useCapabilities";
import useProductionRuntime from "../../../hooks/useProductionRuntime";
import { EffectivityDialog } from "../../manufacturing/configuration/ConfigurationShared";
import { manufacturingBomService, manufacturingProductionService } from "../../../services/manufacturing/manufacturingService";
import {
  getApiCorrelationId,
  getApiErrorMessage,
  getApiFieldErrors,
  isTimeoutError,
} from "../../../utils/apiError";
import { ProcurementItemAutocomplete } from "../../procurement/ProcurementShared";
import { ManufacturingInlineError, ManufacturingStatusPill } from "../../manufacturing/ManufacturingShared";
import ItemProductionConfiguration from "../../manufacturing/configuration/ItemProductionConfiguration";
import {
  buildBomUpdatePayload,
  buildBomPayload,
  buildProductionUpdatePayload,
  buildProductionPayload,
  calculateRequiredQuantity,
  formatDate,
  formatQuantity,
  getBomLines,
  getBomStatus,
  getRecordId,
  getSnapshotLines,
  getStatus,
  isBomActive,
  isDraftProduction,
  normalizePage,
} from "../../manufacturing/manufacturingHelpers";

const emptyLine = () => ({ item: null, notes: "", quantity: "", unitId: null, wastagePercentage: "0" });
const EMPTY_HISTORY = [];
const emptyBom = (businessDate = "") => ({ components: [emptyLine()], effectiveFrom: businessDate, effectiveTo: "", isDefault: true, notes: "", version: "1", outputBaseQuantity: "1" });
const componentItem = (line) => line.item ?? line.componentItem ?? {
  id: line.componentItemId ?? line.itemId,
  itemCode: line.componentItemCode ?? line.itemCode,
  name: line.componentItemName ?? line.itemName,
  unitId: line.unitId,
  unitName: line.unitName,
};
const requestErrorMessage = (error, fallback) => {
  const message = getApiErrorMessage(error, fallback);
  const correlationId = getApiCorrelationId(error);
  return correlationId && !message.includes(correlationId)
    ? `${message}\nReference: ${correlationId}`
    : message;
};
const fieldError = (errors, ...names) => names
  .map((name) => errors?.[name])
  .find(Boolean) ?? "";
const toBomForm = (bom, businessDate) => bom ? {
  components: getBomLines(bom).map((line) => ({
    item: componentItem(line),
    notes: line.notes ?? "",
    quantity: String(line.quantity ?? line.baseQuantity ?? ""),
    unitId: line.unitId ?? line.unit?.id ?? null,
    wastagePercentage: String(line.wastagePercentage ?? 0),
  })),
  effectiveFrom: String(bom.effectiveFrom ?? businessDate ?? "").slice(0, 10),
  effectiveTo: bom.effectiveTo ? String(bom.effectiveTo).slice(0, 10) : "",
  isDefault: Boolean(bom.isDefault),
  notes: bom.notes ?? bom.description ?? "",
  version: String(bom.version ?? bom.versionNumber ?? ""),
  outputBaseQuantity: String(bom.outputBaseQuantity ?? 1),
} : emptyBom(businessDate);

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

const BomEditor = ({ bom, businessDate, item, onClose, onSaved, open }) => {
  const [form, setForm] = useState(() => toBomForm(bom, businessDate));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const setLine = (index, patch) => setForm((current) => ({
    ...current,
    components: current.components.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line),
  }));

  const submit = async () => {
    const ids = form.components.map((line) => String(line.item?.id ?? line.item?.itemId ?? ""));
    if (!form.version.trim()) { setError("BOM version is required."); return; }
    if (form.components.length === 0) { setError("Add at least one raw material."); return; }
    if (ids.some((id) => !id)) { setError("Select every raw material."); return; }
    if (new Set(ids).size !== ids.length) { setError("A raw material cannot be added twice."); return; }
    if (!form.effectiveFrom) { setError("Effective from date is required."); return; }
    if (form.effectiveTo && form.effectiveTo < form.effectiveFrom) { setError("Effective to date cannot be before effective from date."); return; }
    if (form.components.some((line) => Number(line.quantity) <= 0)) { setError("Component quantity must be greater than zero."); return; }
    if (form.components.some((line) => Number(line.wastagePercentage) < 0 || Number(line.wastagePercentage) > 100)) { setError("Wastage must be between 0% and 100%."); return; }

    setSaving(true); setError(""); setFieldErrors({});
    try {
      const values = { ...form, finishedItem: item };
      const response = bom
        ? await manufacturingBomService.update(getRecordId(bom), buildBomUpdatePayload(values))
        : await manufacturingBomService.create(buildBomPayload(values));
      toast.success(response.message || (bom ? "BOM updated." : "BOM version created."));
      onSaved(); onClose();
    } catch (requestError) {
      const message = requestErrorMessage(requestError, "Unable to create the BOM version.");
      setFieldErrors(getApiFieldErrors(requestError));
      setError(message); toast.error(message);
    } finally { setSaving(false); }
  };

  return <AppModal isOpen={open} isBusy={saving} onClose={onClose} maxWidth="max-w-5xl" title={`${bom ? "Edit" : "Add"} BOM · ${item?.name ?? "Item"}`}>
    <div className="space-y-4">
      <ManufacturingInlineError message={error} title="BOM could not be saved" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><AppInput required label="Version" value={form.version} error={fieldError(fieldErrors, "version")} disabled={saving || Boolean(bom)} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} /><AppInput required type="date" label="Effective from" value={form.effectiveFrom} error={fieldError(fieldErrors, "effectiveFrom")} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, effectiveFrom: event.target.value }))} /><AppInput type="date" label="Effective to" value={form.effectiveTo} error={fieldError(fieldErrors, "effectiveTo")} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, effectiveTo: event.target.value }))} /><AppInput label="Notes" value={form.notes} error={fieldError(fieldErrors, "notes")} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></div>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4 accent-brand" checked={form.isDefault} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} />Set as default when activated</label>
      <AppInput required type="number" min="0.000001" step="any" label="BOM output quantity in Item base units" value={form.outputBaseQuantity} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, outputBaseQuantity: event.target.value }))} />
      <Panel title="Raw materials" description="Enter material required for the BOM output quantity above, plus expected wastage." actions={<AppButton className="h-9" variant="secondary" disabled={saving} onClick={() => setForm((current) => ({ ...current, components: [...current.components, emptyLine()] }))}><Plus className="h-4 w-4" />Add material</AppButton>}>
        <div className="space-y-3 p-4">{form.components.map((line, index) => <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[minmax(240px,1fr)_130px_120px_minmax(180px,1fr)_42px]"><ProcurementItemAutocomplete required mode="component" excludeItemId={item?.id} label={`Raw material ${index + 1}`} error={fieldError(fieldErrors, `components.${index}.componentItemId`, `components.${index}.itemId`)} disabled={saving} value={line.item} onChange={(selected) => setLine(index, { item: selected, unitId: selected?.unitId ?? selected?.unit?.id ?? null })} /><AppInput required type="number" min="0.000001" step="any" label="Qty / BOM output" value={line.quantity} error={fieldError(fieldErrors, `components.${index}.quantity`)} disabled={saving} onChange={(event) => setLine(index, { quantity: event.target.value })} /><AppInput type="number" min="0" max="100" step="any" label="Wastage %" value={line.wastagePercentage} error={fieldError(fieldErrors, `components.${index}.wastagePercentage`)} disabled={saving} onChange={(event) => setLine(index, { wastagePercentage: event.target.value })} /><AppInput label="Component notes" value={line.notes} error={fieldError(fieldErrors, `components.${index}.notes`)} disabled={saving} onChange={(event) => setLine(index, { notes: event.target.value })} /><button type="button" aria-label="Remove material" className="mt-6 flex h-10 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" disabled={saving || form.components.length === 1} onClick={() => setForm((current) => ({ ...current, components: current.components.filter((_, lineIndex) => lineIndex !== index) }))}><Trash2 className="h-4 w-4" /></button></div>)}</div>
      </Panel>
      <div className="flex justify-end gap-2"><AppButton variant="secondary" disabled={saving} onClick={onClose}>Cancel</AppButton><AppButton isLoading={saving} loadingText="Saving…" onClick={submit}>{bom ? "Update BOM" : "Save BOM"}</AppButton></div>
    </div>
  </AppModal>;
};

export const ProductionEditor = ({ boms, applicableBom, businessDate, item, onClose, onSaved, open, production }) => {
  const [form, setForm] = useState(() => ({
    bomId: production?.bomId ?? getRecordId(applicableBom) ?? "",
    notes: production?.notes ?? "",
    plannedQuantity: String(production?.plannedQuantity ?? production?.producedQuantity ?? production?.quantity ?? ""),
    producedQuantity: String(production?.producedQuantity ?? production?.quantity ?? ""),
    productionDate: production?.productionDate ? String(production.productionDate).slice(0, 10) : businessDate,
    referenceNumber: production?.referenceNumber ?? production?.referenceNo ?? "",
  }));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [resolved, setResolved] = useState({ date: businessDate, bom: applicableBom, error: "" });
  const resolutionPending = !production && resolved.date !== form.productionDate;
  useEffect(() => {
    if (production || !form.productionDate || form.productionDate === businessDate) return;
    let active = true;
    manufacturingBomService.applicable(item?.id, form.productionDate).then(response => {
      if (!active) return;
      const bom = response?.data ?? response;
      setResolved({ date: form.productionDate, bom, error: "" });
      setForm(current => ({ ...current, bomId: getRecordId(bom) ?? "" }));
    }).catch(failure => {
      if (active) setResolved({ date: form.productionDate, bom: null, error: requestErrorMessage(failure, "No active BOM is effective on the selected production date.") });
    });
    return () => { active = false; };
  }, [businessDate, form.productionDate, item?.id, production]);
  const dateBom = form.productionDate === businessDate ? applicableBom : resolved.date === form.productionDate ? resolved.bom : null;
  const activeBoms = production ? [applicableBom ?? boms.find(bom => String(getRecordId(bom)) === String(production.bomId))].filter(Boolean) : dateBom ? [dateBom] : [];

  const selectedBom = production ? applicableBom : dateBom;
  const lines = getBomLines(selectedBom);

  const submit = async () => {
    if (resolutionPending || !form.bomId || !selectedBom) { setError("Resolve an active BOM for the selected production date before saving."); return; }
    if (Number(form.plannedQuantity) <= 0) { setError("Planned quantity must be greater than zero."); return; }
    if (Number(form.producedQuantity) <= 0) { setError("Quantity to manufacture must be greater than zero."); return; }
    setSaving(true); setError(""); setFieldErrors({});
    try {
      const values = { ...form, finishedItem: item };
      const response = production
        ? await manufacturingProductionService.update(getRecordId(production), buildProductionUpdatePayload(values))
        : await manufacturingProductionService.create(buildProductionPayload(values));
      toast.success(response.message || (production ? "Production draft updated." : "Production draft created. Review it and post to update stock."));
      onSaved(); onClose();
    } catch (requestError) {
      const message = requestErrorMessage(requestError, "Unable to create the production draft.");
      setFieldErrors(getApiFieldErrors(requestError));
      setError(message); toast.error(message);
    } finally { setSaving(false); }
  };

  return <AppModal isOpen={open} isBusy={saving} onClose={onClose} maxWidth="max-w-4xl" title={`${production ? "Edit production" : "Manufacture"} · ${item?.name ?? "Item"}`}><div className="space-y-4"><ManufacturingInlineError message={error || resolved.error || (resolutionPending ? "Resolving the effective BOM for this production date…" : "")} title="Production draft" /><div className="grid gap-4 sm:grid-cols-2"><AppSelect required label="BOM version" value={form.bomId} error={fieldError(fieldErrors, "bomId")} disabled={saving || Boolean(production)} options={activeBoms.map((bom) => ({ value: getRecordId(bom), label: `Version ${bom.version ?? bom.versionNumber}${bom.isDefault ? " · Default" : ""}` }))} onChange={(bomId) => setForm((current) => ({ ...current, bomId }))} /><AppInput required type="number" min="0.000001" step="any" label="Planned quantity" value={form.plannedQuantity} error={fieldError(fieldErrors, "plannedQuantity")} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, plannedQuantity: event.target.value, producedQuantity: current.producedQuantity || event.target.value }))} /><AppInput required type="number" min="0.000001" step="any" label="Produced quantity" value={form.producedQuantity} error={fieldError(fieldErrors, "producedQuantity")} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, producedQuantity: event.target.value }))} /><AppInput required type="date" label="Production date" value={form.productionDate} error={fieldError(fieldErrors, "productionDate")} disabled={saving} onChange={(event) => { const date=event.target.value; setForm(current => ({ ...current, productionDate: date, bomId: production ? current.bomId : date === businessDate ? getRecordId(applicableBom) ?? "" : "" })); if (!production) setResolved({date:"",bom:null,error:""}); }} /><AppInput label="Reference" value={form.referenceNumber} error={fieldError(fieldErrors, "referenceNumber")} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, referenceNumber: event.target.value }))} /></div><AppInput label="Notes" value={form.notes} error={fieldError(fieldErrors, "notes")} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
    <Panel title="Material consumption preview" description="The saved draft keeps its own BOM snapshot."><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="bg-slate-50"><tr>{["Raw material", "Qty / unit", "Wastage", "Required"].map((label) => <th key={label} className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead><tbody>{lines.length ? lines.map((line, index) => <tr key={line.id ?? line.componentItemId ?? index} className="border-t border-slate-100"><td className="px-4 py-3 font-medium">{line.componentItemName ?? line.itemName ?? line.item?.name ?? "—"}</td><td className="px-4 py-3">{formatQuantity(line.baseQuantity ?? line.quantity)}</td><td className="px-4 py-3">{line.wastagePercentage ?? 0}%</td><td className="px-4 py-3 font-semibold">{formatQuantity(calculateRequiredQuantity(line, form.producedQuantity))}</td></tr>) : <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Select an active BOM.</td></tr>}</tbody></table></div></Panel>
    <div className="flex justify-end gap-2"><AppButton variant="secondary" disabled={saving} onClick={onClose}>Cancel</AppButton><AppButton disabled={resolutionPending || !selectedBom} isLoading={saving} loadingText="Saving…" onClick={submit}>{production ? "Update production draft" : "Save production draft"}</AppButton></div></div></AppModal>;
};

const ProductionDetail = ({ onClose, open, production }) => {
  const lines = getSnapshotLines(production);
  return <AppModal isOpen={open} onClose={onClose} maxWidth="max-w-5xl" title={`Production · ${production?.referenceNumber ?? `PR-${getRecordId(production)}`}`}>
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="text-xs text-slate-500">Date</p><p className="mt-1 font-semibold text-slate-900">{formatDate(production?.productionDate)}</p></div>
        <div><p className="text-xs text-slate-500">BOM version</p><p className="mt-1 font-semibold text-slate-900">{production?.bomVersion ?? production?.version ?? "—"}</p></div>
        <div><p className="text-xs text-slate-500">Produced</p><p className="mt-1 font-semibold text-slate-900">{formatQuantity(production?.producedQuantity ?? production?.quantity)}</p></div>
        <div><p className="text-xs text-slate-500">Status</p><div className="mt-1"><ManufacturingStatusPill record={production} /></div></div>
      </div>
      <Panel title="Material snapshot" description="This is the production record's authoritative material snapshot; later BOM changes do not alter it.">
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50"><tr>{["Raw material", "Required", "Wastage", "Total consumed", "Unit"].map((label) => <th key={label} className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead><tbody>{lines.length ? lines.map((line, index) => {
          const required = line.requiredQuantity ?? line.baseRequiredQuantity ?? line.quantityRequired ?? line.quantity ?? line.baseQuantity;
          const wastage = line.wastageQuantity ?? line.wasteQuantity ?? (Number(required ?? 0) * Number(line.wastagePercentage ?? 0) / 100);
          const consumed = line.totalConsumedQuantity ?? line.totalRequiredQuantity ?? line.consumedQuantity ?? line.actualQuantity ?? (Number(required ?? 0) + Number(wastage ?? 0));
          return <tr key={line.id ?? line.componentItemId ?? index} className="border-t border-slate-100"><td className="px-4 py-3 font-medium text-slate-900">{line.componentItemName ?? line.itemName ?? line.item?.name ?? "—"}</td><td className="px-4 py-3">{formatQuantity(required)}</td><td className="px-4 py-3">{formatQuantity(wastage)}</td><td className="px-4 py-3 font-semibold">{formatQuantity(consumed)}</td><td className="px-4 py-3">{line.unitName ?? line.unitShortName ?? "—"}</td></tr>;
        }) : <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No material snapshot was returned.</td></tr>}</tbody></table></div>
      </Panel>
      {production?.notes && <div className="rounded-xl border border-slate-200 px-4 py-3"><p className="text-xs font-semibold text-slate-500">Notes</p><p className="mt-1 text-sm text-slate-700">{production.notes}</p></div>}
      <div className="flex justify-end"><AppButton variant="secondary" onClick={onClose}>Close</AppButton></div>
    </div>
  </AppModal>;
};

const HistoryPager = ({name,page,pages,loading,onPage}) => pages > 1 ? <nav aria-label={name} className="flex items-center justify-end gap-3 border-t border-slate-200 p-3 text-sm"><AppButton variant="secondary" disabled={loading || page <= 1} onClick={() => onPage(page - 1)}>Previous</AppButton><span>Page {page} of {pages}</span><AppButton variant="secondary" disabled={loading || page >= pages} onClick={() => onPage(page + 1)}>Next</AppButton></nav> : null;

const ItemManufacturingTab = ({ disabled, enabled, isActive, item, onEnabledChange, trackInventory }) => {
  const companyContext = useProductionRuntime();
  const businessDate = companyContext.runtime?.businessDate ?? "";
  const [searchParams, setSearchParams] = useSearchParams();
  const itemId = item?.id;
  const bomCapabilities = useCapabilities({ actions: ["view", "create", "update", "delete", "approve"], pageName: "Manufacturing.Boms", resource: "Manufacturing.Boms" });
  const orderCapabilities = useCapabilities({ actions: ["view"], pageName: "Manufacturing.Orders", resource: "Manufacturing.Orders" });
  const oeeCapabilities = useCapabilities({ actions: ["view"], pageName: "OEE.ProductionEntries", resource: "OEE.ProductionEntries" });
  const productionCapabilities = useCapabilities({ actions: ["view", "create", "update", "approve"], pageName: "Manufacturing.Productions", resource: "Manufacturing.Productions" });
  const [historyPages, setHistoryPages] = useState({ scope: String(itemId), bom: 1, production: 1 });
  const bomPage = historyPages.scope === String(itemId) ? historyPages.bom : 1;
  const productionPage = historyPages.scope === String(itemId) ? historyPages.production : 1;
  const [historyTotals, setHistoryTotals] = useState({ bom: 1, production: 1 });
  const loadSequence = useRef(0);
  const [bomResult, setBomResult] = useState({scope:null,items:[]});
  const boms = bomResult.scope === String(itemId) ? bomResult.items : EMPTY_HISTORY;
  const [productionResult, setProductionResult] = useState({scope:null,items:[]});
  const productions = productionResult.scope === String(itemId) ? productionResult.items : [];
  const [state, setState] = useState({ error: "", loading: false });
  const [bomOpen, setBomOpen] = useState(false);
  const [editingBom, setEditingBom] = useState(null);
  const [productionOpen, setProductionOpen] = useState(false);
  const [editingProduction, setEditingProduction] = useState(null);
  const [applicableBom, setApplicableBom] = useState(null);
  const [applicableMissing, setApplicableMissing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [deleteBomRecord, setDeleteBomRecord] = useState(null);
  const [effectivityTarget, setEffectivityTarget] = useState(null);
  const [cancelRecord, setCancelRecord] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [postRecord, setPostRecord] = useState(null);
  const [detailRecord, setDetailRecord] = useState(null);
  const eligible = Boolean(isActive && trackInventory);

  const load = useCallback(async () => {
    if (!itemId || !enabled) return;
    const request = ++loadSequence.current;
    setState({ error: "", loading: true });
    try {
      const [bomResponse, productionResponse] = await Promise.all([
        bomCapabilities.canView
          ? manufacturingBomService.list({ FinishedItemId: itemId, PageNumber: bomPage, PageSize: 40 })
          : Promise.resolve(null),
        productionCapabilities.canView
          ? manufacturingProductionService.list({ FinishedItemId: itemId, PageNumber: productionPage, PageSize: 20 })
          : Promise.resolve(null),
      ]);
      if (request !== loadSequence.current) return;
      setHistoryTotals({bom: normalizePage(bomResponse).totalPages, production: normalizePage(productionResponse).totalPages});
      setBomResult({scope:String(itemId),items:bomCapabilities.canView ? normalizePage(bomResponse).items : []});
      setProductionResult({scope:String(itemId),items:productionCapabilities.canView ? normalizePage(productionResponse).items : []});
      setState({ error: "", loading: false });
    } catch (error) { if (request === loadSequence.current) setState({ error: requestErrorMessage(error, "Unable to load manufacturing details."), loading: false }); }
  }, [bomCapabilities.canView, bomPage, enabled, itemId, productionCapabilities.canView, productionPage]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) return load(); });
    return () => { active = false; loadSequence.current += 1; };
  }, [load]);

  const activate = async (bom) => {
    const id = getRecordId(bom); setActionId(id);
    try { const response = await manufacturingBomService.activate(id); toast.success(response.message || "BOM activated."); await load(); }
    catch (error) { toast.error(requestErrorMessage(error, "Unable to activate the BOM.")); }
    finally { setActionId(null); }
  };

  const deactivate = async (bom) => {
    const id = getRecordId(bom); setActionId(id);
    try { const response = await manufacturingBomService.deactivate(id); toast.success(response.message || "BOM deactivated."); await load(); }
    catch (error) { toast.error(requestErrorMessage(error, "Unable to deactivate the BOM.")); }
    finally { setActionId(null); }
  };

  const openBomEditor = async (bom = null) => {
    if (!bom) { setEditingBom(null); setBomOpen(true); return; }
    const id = getRecordId(bom); setActionId(id);
    try {
      const response = await manufacturingBomService.getById(id);
      setEditingBom(response?.data ?? response);
      setBomOpen(true);
    } catch (error) { toast.error(requestErrorMessage(error, "Unable to load the BOM.")); }
    finally { setActionId(null); }
  };

  useEffect(() => {
    const requestedId = searchParams.get("bomId");
    if (!requestedId || !itemId || !bomCapabilities.canUpdate || !boms.some((bom) => String(getRecordId(bom)) === requestedId)) return;
    const next = new URLSearchParams(searchParams);
    next.delete("bomId");
    setSearchParams(next, { replace: true });
    void manufacturingBomService.getById(requestedId).then((response) => {
      setEditingBom(response?.data ?? response);
      setBomOpen(true);
    }).catch((error) => toast.error(requestErrorMessage(error, "Unable to load the BOM.")));
  }, [itemId, searchParams, boms, bomCapabilities.canUpdate, setSearchParams]);

  const removeBom = async () => {
    const id = getRecordId(deleteBomRecord); setActionId(id);
    try {
      const response = await manufacturingBomService.remove(id);
      toast.success(response.message || "BOM deleted.");
      setDeleteBomRecord(null);
      await load();
    } catch (error) { toast.error(requestErrorMessage(error, "Unable to delete the BOM.")); }
    finally { setActionId(null); }
  };

  const post = async () => {
    if (!productionCapabilities.canApprove) return;
    const id = getRecordId(postRecord); setActionId(id);
    try {
      const response = await manufacturingProductionService.post(id);
      toast.success(response.message || "Production posted and stock updated.");
      setPostRecord(null);
      await load();
    } catch (error) {
      if (isTimeoutError(error)) {
        // Close the action modal before reconciliation so an indeterminate
        // request cannot be submitted a second time by accident.
        setPostRecord(null);
        try {
          const response = await manufacturingProductionService.getById(id);
          const reconciled = response?.data ?? response;
          setDetailRecord(reconciled);
          await load();
          toast.warning(getStatus(reconciled).toLowerCase() === "posted"
            ? "The request timed out, but production was posted. The refreshed detail is shown."
            : "The request timed out. Production was reloaded; review its status before trying again.");
        } catch (reloadError) {
          toast.error(requestErrorMessage(reloadError, "Posting timed out and the latest production status could not be loaded. Refresh before trying again."));
        }
      } else {
        toast.error(requestErrorMessage(error, "Unable to post production."));
      }
    } finally { setActionId(null); }
  };

  const openProductionDetail = async (record) => {
    const id = getRecordId(record); setActionId(id);
    try {
      const response = await manufacturingProductionService.getById(id);
      setDetailRecord(response?.data ?? response);
    } catch (error) { toast.error(requestErrorMessage(error, "Unable to load production details.")); }
    finally { setActionId(null); }
  };

  const openProductionEditor = async (record = null) => {
    if (!record) {
      if (!businessDate) { toast.error("Load the verified company business date before recording production."); return; }
      try {
        const response = await manufacturingBomService.applicable(itemId, businessDate);
        setApplicableBom(response?.data ?? response);
        setApplicableMissing(false);
        setEditingProduction(null);
        setProductionOpen(true);
      } catch (error) {
        if (error?.response?.status === 404) { setApplicableBom(null); setApplicableMissing(true); }
        else toast.error(requestErrorMessage(error, "Unable to load the applicable BOM."));
      }
      return;
    }
    const id = getRecordId(record); setActionId(id);
    try {
      const response = await manufacturingProductionService.getById(id);
      const detail = response?.data ?? response;
      if (detail.bomId) {
        const bomResponse = await manufacturingBomService.getById(detail.bomId);
        setApplicableBom(bomResponse?.data ?? bomResponse);
      }
      setEditingProduction(detail);
      setProductionOpen(true);
    } catch (error) { toast.error(requestErrorMessage(error, "Unable to load the production draft.")); }
    finally { setActionId(null); }
  };

  const cancel = async () => {
    if (!productionCapabilities.canApprove) return;
    if (!cancelReason.trim()) return;
    const id = getRecordId(cancelRecord); setActionId(id);
    try { const response = await manufacturingProductionService.cancel(id, cancelReason.trim()); toast.success(response.message || "Production cancelled and stock reversed."); setCancelRecord(null); setCancelReason(""); await load(); }
    catch (error) { toast.error(requestErrorMessage(error, "Unable to cancel production.")); }
    finally { setActionId(null); }
  };

  return <div className="space-y-4">
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><p className="font-semibold">Choose the production flow</p><p className="mt-1">Daily Production and the production board are the order-based workflow: release, reserve, record actuals and close. This Item tab keeps the legacy draft → material snapshot → post/reverse stock history. OEE readings record runtime, shots and downtime; they do not post physical stock.</p><div className="mt-2 flex flex-wrap gap-4">{orderCapabilities.canView && <><Link className="font-semibold underline" to="/manufacturing/daily">Daily Production</Link><Link className="font-semibold underline" to="/manufacturing/board">Production board</Link></>}{oeeCapabilities.canView && <Link className="font-semibold underline" to="/oee/production-entries">OEE readings</Link>}</div></div>
    {!businessDate && <ManufacturingInlineError message={companyContext.loading ? "Loading the company business date…" : companyContext.error || "Verified company business date is unavailable."} onRetry={companyContext.reload} title="Company date required for new manufacturing entries" />}
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span><span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Factory className="h-4 w-4 text-brand" />Manufactured item</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{eligible ? "Create this item from raw materials using a bill of materials." : "Manufacturing requires an active, inventory-tracked product."}</span></span>
      <input type="checkbox" className="h-4 w-4 accent-brand" checked={enabled} disabled={disabled || (!eligible && !enabled)} onChange={(event) => onEnabledChange(event.target.checked)} />
    </label>
    {!enabled ? <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center"><Factory className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-800">Manufacturing is disabled</p><p className="mt-1 text-xs text-slate-500">Enable it to add a BOM and record production for this item.</p></div> : !itemId ? <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-800"><p className="font-semibold">Save the item first</p><p className="mt-1 text-xs leading-5">After the item is created, reopen its Manufacturing tab to add raw materials and manufacture units.</p></div> : <>
      <ManufacturingInlineError message={state.error} onRetry={load} title="Manufacturing details unavailable" />
      {!bomCapabilities.canView && !productionCapabilities.canView && <ManufacturingInlineError message="You don't have permission to view manufacturing BOMs or productions." title="Manufacturing access required" />}
      {bomCapabilities.canView && <Panel title="Bill of materials" description="Versioned recipe, validity dates and raw materials for this finished item." actions={<><AppButton className="h-9" variant="secondary" disabled={state.loading} onClick={load}><RefreshCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} /></AppButton>{bomCapabilities.canCreate && <AppButton className="h-9" disabled={!businessDate} onClick={() => openBomEditor()}><Plus className="h-4 w-4" />Add BOM</AppButton>}</>}>
        {boms.length === 0 ? <div className="px-5 py-10 text-center"><GitBranch className="mx-auto h-6 w-6 text-slate-400" /><p className="mt-2 text-sm font-medium text-slate-800">No BOM added yet</p><p className="mt-1 text-xs text-slate-500">Add raw materials and declare the matching BOM output quantity.</p></div> : <div className="divide-y divide-slate-100">{boms.map((bom) => {
          const id = getRecordId(bom);
          const status = isBomActive(bom) ? "Active" : getBomStatus(bom) === "Active" ? "Inactive" : getBomStatus(bom);
          const active = isBomActive(bom);
          const editable = !active;
          return <div key={id} className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><p className="text-sm font-semibold text-slate-900">{bom.bomNumber} · {bom.finishedItemCode} · {bom.finishedItemName} · Version {bom.version}</p>{bom.isDefault === true && <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-semibold text-brand">Default</span>}<span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{status}</span></div><p className="mt-1 text-xs text-slate-500">{bom.componentCount} raw materials · {formatDate(bom.effectiveFrom)}{bom.effectiveTo ? ` to ${formatDate(bom.effectiveTo)}` : " onward"}</p></div><div className="flex flex-wrap gap-2">{editable && bomCapabilities.canUpdate && <AppButton className="h-9" variant="secondary" disabled={actionId === id} onClick={() => openBomEditor(bom)}><Pencil className="h-4 w-4" />Edit</AppButton>}{editable && bomCapabilities.canDelete && <AppButton className="h-9" variant="secondary" disabled={actionId === id} onClick={() => setDeleteBomRecord(bom)}><Trash2 className="h-4 w-4" />Delete</AppButton>}{bomCapabilities.canUpdate && (active ? <AppButton className="h-9" variant="secondary" disabled={actionId === id} onClick={() => deactivate(bom)}><Ban className="h-4 w-4" />Deactivate</AppButton> : <AppButton className="h-9" variant="secondary" disabled={actionId === id} onClick={() => activate(bom)}><CheckCircle2 className="h-4 w-4" />Activate</AppButton>)}{active && bomCapabilities.canApprove && <AppButton className="h-9" variant="secondary" disabled={actionId === id} onClick={async () => { setActionId(id); try { const response = await manufacturingBomService.getById(id); const full = response.data ?? response; if (!full.concurrencyVersion) throw new Error("Reload the BOM with its concurrency version before ending effectivity."); setEffectivityTarget({ kind: "bom", record: { ...full, version: full.concurrencyVersion } }); } catch (error) { toast.error(requestErrorMessage(error, "Unable to load the BOM version.")); } finally { setActionId(null); } }}>End effectivity</AppButton>}</div></div>{bom.notes && <p className="mt-3 text-xs text-slate-500">{bom.notes}</p>}</div>;
        })}</div>}
        <HistoryPager name="BOM versions" page={bomPage} pages={historyTotals.bom} loading={state.loading} onPage={page => setHistoryPages({scope:String(itemId),bom:page,production:productionPage})}/>
      </Panel>}
      {productionCapabilities.canView && <Panel title="Production" description="Plan and record output, then post the draft to update raw-material and finished-goods stock." actions={productionCapabilities.canCreate && <AppButton className="h-9" onClick={() => openProductionEditor()}><Factory className="h-4 w-4" />Manufacture</AppButton>}>
        {applicableMissing && <ManufacturingInlineError title="No active effective Manufacturing BOM" message="Create or activate a BOM effective for today before manufacturing." />}
        {productions.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">No production history for this item.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead className="bg-slate-50"><tr>{["Date", "Reference", "Planned", "Produced", "BOM", "Status", "Actions"].map((label) => <th key={label} className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead><tbody>{productions.map((record) => { const id = getRecordId(record); const status = getStatus(record).toLowerCase(); return <tr key={id} className="border-t border-slate-100"><td className="px-4 py-3">{formatDate(record.productionDate)}</td><td className="px-4 py-3 font-medium">{record.referenceNumber ?? `PR-${id}`}</td><td className="px-4 py-3">{formatQuantity(record.plannedQuantity)}</td><td className="px-4 py-3">{formatQuantity(record.producedQuantity ?? record.quantity)}</td><td className="px-4 py-3">v{record.bomVersion ?? record.version ?? "—"}</td><td className="px-4 py-3"><ManufacturingStatusPill record={record} /></td><td className="px-4 py-3"><div className="flex gap-1"><button type="button" title="View production detail" disabled={actionId === id} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40" onClick={() => openProductionDetail(record)}><Eye className="h-4 w-4" /></button>{isDraftProduction(record) && <>{productionCapabilities.canUpdate && <button type="button" title="Edit production draft" disabled={actionId === id} className="rounded-lg p-2 text-slate-400 hover:bg-brand-light hover:text-brand disabled:opacity-40" onClick={() => openProductionEditor(record)}><Pencil className="h-4 w-4" /></button>}{productionCapabilities.canApprove && <button type="button" title="Post and update stock" disabled={actionId === id || !productionCapabilities.canApprove} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40" onClick={() => { if (productionCapabilities.canApprove) setPostRecord(record); }}><Send className="h-4 w-4" /></button>}</>}{productionCapabilities.canApprove && status === "posted" && <button type="button" title="Cancel and reverse stock" disabled={actionId === id} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" onClick={() => setCancelRecord(record)}><Ban className="h-4 w-4" /></button>}</div></td></tr>; })}</tbody></table></div>}
        <HistoryPager name="Production history" page={productionPage} pages={historyTotals.production} loading={state.loading} onPage={page => setHistoryPages({scope:String(itemId),bom:bomPage,production:page})}/>
      </Panel>}
    </>}
    {bomOpen && <BomEditor bom={editingBom} businessDate={businessDate} item={item} open onClose={() => { setBomOpen(false); setEditingBom(null); }} onSaved={load} />}
    {productionOpen && <ProductionEditor businessDate={businessDate} boms={boms} applicableBom={applicableBom} item={item} open production={editingProduction} onClose={() => { setProductionOpen(false); setEditingProduction(null); }} onSaved={load} />}
    {enabled && itemId && <ItemProductionConfiguration itemId={itemId} disabled={disabled} />}
    {effectivityTarget && <EffectivityDialog target={effectivityTarget} onClose={() => setEffectivityTarget(null)} onSaved={load} />}
    {detailRecord && <ProductionDetail production={detailRecord} open onClose={() => setDetailRecord(null)} />}
    <AppModal isOpen={Boolean(postRecord)} isBusy={Boolean(actionId)} onClose={() => setPostRecord(null)} title="Post production"><div className="space-y-4"><p className="text-sm text-slate-600">Post {postRecord?.referenceNumber ?? `PR-${getRecordId(postRecord)}`}? This atomically consumes raw materials and receives {formatQuantity(postRecord?.producedQuantity ?? postRecord?.quantity)} finished units into stock.</p><p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">Do not repeat this action if the request times out. COSMOS will reload the production first to verify whether posting completed.</p><div className="flex justify-end gap-2"><AppButton variant="secondary" disabled={Boolean(actionId)} onClick={() => setPostRecord(null)}>Keep as draft</AppButton><AppButton isLoading={Boolean(actionId)} loadingText="Posting…" onClick={post}>Post and update stock</AppButton></div></div></AppModal>
    <AppModal isOpen={Boolean(deleteBomRecord)} isBusy={Boolean(actionId)} onClose={() => setDeleteBomRecord(null)} title="Delete BOM"><div className="space-y-4"><p className="text-sm text-slate-600">Delete BOM version {deleteBomRecord?.version ?? deleteBomRecord?.versionNumber}? This action cannot be undone.</p><div className="flex justify-end gap-2"><AppButton variant="secondary" onClick={() => setDeleteBomRecord(null)}>Keep BOM</AppButton><AppButton variant="danger" isLoading={Boolean(actionId)} onClick={removeBom}>Delete BOM</AppButton></div></div></AppModal>
    <AppModal isOpen={Boolean(cancelRecord)} isBusy={Boolean(actionId)} onClose={() => setCancelRecord(null)} title="Cancel production"><div className="space-y-4"><p className="text-sm text-slate-600">This reverses the posted raw-material and finished-goods stock movements.</p><div><label className="mb-1.5 block text-xs font-semibold text-slate-700">Reason <span className="text-red-500">*</span></label><textarea rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></div><div className="flex justify-end gap-2"><AppButton variant="secondary" onClick={() => setCancelRecord(null)}>Keep production</AppButton><AppButton variant="danger" disabled={!cancelReason.trim()} isLoading={Boolean(actionId)} onClick={cancel}>Cancel production</AppButton></div></div></AppModal>
  </div>;
};

export default ItemManufacturingTab;
