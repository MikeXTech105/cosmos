import { CheckCircle2, Edit3, GitBranch, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import DataTableShell from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import useCapabilities from "../../../hooks/useCapabilities";
import { manufacturingBomService } from "../../../services/manufacturing/manufacturingService";
import { getApiErrorMessage } from "../../../utils/apiError";
import { ProcurementItemAutocomplete } from "../../procurement/ProcurementShared";
import {
  ManufacturingCard,
  ManufacturingInlineError,
  ManufacturingPagination,
} from "../ManufacturingShared";
import {
  buildBomPayload,
  formatQuantity,
  getBomLines,
  getItemName,
  getRecordId,
  normalizePage,
} from "../manufacturingHelpers";

const emptyLine = () => ({ item: null, baseQuantity: "", wastagePercentage: "0" });
const emptyForm = () => ({ components: [emptyLine()], description: "", finishedItem: null, isDefault: true, version: "1" });

const toForm = (record) => ({
  components: getBomLines(record).map((line) => ({
    item: {
      id: line.componentItemId ?? line.itemId ?? line.item?.id,
      itemCode: line.componentItemCode ?? line.itemCode ?? line.item?.itemCode,
      name: line.componentItemName ?? line.itemName ?? line.item?.name,
    },
    baseQuantity: String(line.baseQuantity ?? line.quantity ?? ""),
    wastagePercentage: String(line.wastagePercentage ?? line.wastagePercent ?? 0),
  })),
  description: record?.description ?? "",
  finishedItem: {
    id: record?.finishedItemId ?? record?.itemId ?? record?.finishedItem?.id,
    itemCode: record?.finishedItemCode ?? record?.itemCode ?? record?.finishedItem?.itemCode,
    name: getItemName(record),
  },
  isDefault: record?.isDefault ?? true,
  version: String(record?.version ?? record?.versionNumber ?? "1"),
});

const validate = (form) => {
  if (!form.finishedItem?.id && !form.finishedItem?.itemId) return "Select a finished item.";
  if (!String(form.version).trim()) return "Version is required.";
  if (form.components.length === 0) return "Add at least one component.";
  const ids = form.components.map((line) => String(line.item?.id ?? line.item?.itemId ?? ""));
  if (ids.some((id) => !id)) return "Select an item for every component.";
  if (new Set(ids).size !== ids.length) return "A component cannot be added more than once.";
  if (form.components.some((line) => Number(line.baseQuantity) <= 0)) return "Base quantity must be greater than zero.";
  if (form.components.some((line) => Number(line.wastagePercentage) < 0)) return "Wastage cannot be negative.";
  return "";
};

const BomModal = ({ bom, isOpen, onClose, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(bom);

  useEffect(() => {
    if (isOpen) {
      setForm(bom ? toForm(bom) : emptyForm());
      setError("");
    }
  }, [bom, isOpen]);

  useEffect(() => {
    if (!isOpen || !bom) return undefined;
    let current = true;
    manufacturingBomService.getById(getRecordId(bom))
      .then((response) => {
        if (current) setForm(toForm(response.data ?? response));
      })
      .catch((requestError) => {
        if (current) setError(getApiErrorMessage(requestError, "Unable to load the complete BOM."));
      });
    return () => { current = false; };
  }, [bom, isOpen]);

  const setLine = (index, patch) => setForm((current) => ({
    ...current,
    components: current.components.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line),
  }));

  const submit = async () => {
    const message = validate(form);
    if (message) { setError(message); return; }
    setSaving(true);
    setError("");
    try {
      const payload = buildBomPayload(form);
      const response = isEdit
        ? await manufacturingBomService.update(getRecordId(bom), payload)
        : await manufacturingBomService.create(payload);
      toast.success(response.message || `BOM ${isEdit ? "updated" : "created"} successfully.`);
      onSaved();
      onClose();
    } catch (requestError) {
      const requestMessage = getApiErrorMessage(requestError, "Unable to save the BOM.");
      setError(requestMessage);
      toast.error(requestMessage);
    } finally { setSaving(false); }
  };

  const finishedItemId = form.finishedItem?.id ?? form.finishedItem?.itemId;

  return (
    <AppModal isOpen={isOpen} isBusy={saving} onClose={onClose} maxWidth="max-w-5xl" title={isEdit ? "Edit manufacturing BOM" : "New manufacturing BOM"}>
      <div className="space-y-5">
        <ManufacturingInlineError message={error} title="BOM could not be saved" />
        <div className="grid gap-4 sm:grid-cols-2">
          <ProcurementItemAutocomplete required mode="finished" includeLegacy label="Finished item" disabled={saving || isEdit} value={form.finishedItem} onChange={(finishedItem) => setForm((current) => ({ ...current, finishedItem }))} />
          <AppInput required label="Version" disabled={saving} value={form.version} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} />
        </div>
        <AppInput label="Description" disabled={saving} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="h-4 w-4 accent-brand" checked={form.isDefault} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} />
          Make this the default BOM when activated
        </label>
        <ManufacturingCard
          title="Components"
          description="Base quantity is per one finished unit. Wastage is added by the server when production is drafted."
          actions={<AppButton className="h-9" variant="secondary" disabled={saving} onClick={() => setForm((current) => ({ ...current, components: [...current.components, emptyLine()] }))}><Plus className="h-4 w-4" /> Add component</AppButton>}
        >
          <div className="space-y-3 p-4">
            {form.components.map((line, index) => (
              <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[1fr_160px_160px_42px]">
                <ProcurementItemAutocomplete required mode="component" excludeItemId={finishedItemId} label={`Component ${index + 1}`} disabled={saving} value={line.item} onChange={(item) => setLine(index, { item })} />
                <AppInput required type="number" min="0.000001" step="any" label="Base quantity" disabled={saving} value={line.baseQuantity} onChange={(event) => setLine(index, { baseQuantity: event.target.value })} />
                <AppInput type="number" min="0" step="any" label="Wastage %" disabled={saving} value={line.wastagePercentage} onChange={(event) => setLine(index, { wastagePercentage: event.target.value })} />
                <button type="button" aria-label={`Remove component ${index + 1}`} className="mt-6 flex h-10 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" disabled={saving || form.components.length === 1} onClick={() => setForm((current) => ({ ...current, components: current.components.filter((_, lineIndex) => lineIndex !== index) }))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </ManufacturingCard>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <AppButton variant="secondary" disabled={saving} onClick={onClose}>Cancel</AppButton>
          <AppButton isLoading={saving} loadingText="Saving…" onClick={submit}>Save BOM</AppButton>
        </div>
      </div>
    </AppModal>
  );
};

const ManufacturingBomsPage = () => {
  const capabilities = useCapabilities({ label: "Manufacturing.BOM", pageName: "Manufacturing.BOM", resource: "manufacturingBoms", route: "/manufacturing/boms" });
  const [filters, setFilters] = useState({ PageNumber: 1, PageSize: 20, Search: "" });
  const [state, setState] = useState({ error: "", loading: true, page: normalizePage([]) });
  const [modal, setModal] = useState({ bom: null, open: false });
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, error: "", loading: true }));
    try {
      const response = await manufacturingBomService.list(filters);
      setState({ error: "", loading: false, page: normalizePage(response) });
    } catch (error) {
      setState((current) => ({ ...current, error: getApiErrorMessage(error, "Unable to load manufacturing BOMs."), loading: false }));
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  const activate = async (bom) => {
    const id = getRecordId(bom);
    setActionId(id);
    try {
      const response = await manufacturingBomService.activate(id);
      toast.success(response.message || "BOM activated successfully.");
      await load();
    } catch (error) { toast.error(getApiErrorMessage(error, "Unable to activate the BOM.")); }
    finally { setActionId(null); }
  };

  return (
    <section className="space-y-6">
      <PageHeader icon={GitBranch} badge="Manufacturing" title="Bills of material" description="Maintain versioned production BOMs independently from procurement planning." actions={<><AppButton variant="secondary" disabled={state.loading} onClick={load}><RefreshCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} /> Refresh</AppButton><AppButton disabled={!capabilities.canCreate} onClick={() => setModal({ bom: null, open: true })}><Plus className="h-4 w-4" /> New BOM</AppButton></>} />
      <ManufacturingInlineError message={state.error} onRetry={load} title="BOMs unavailable" />
      <div className="max-w-md"><AppInput label="Search" placeholder="Finished item, code or version" value={filters.Search} onChange={(event) => setFilters((current) => ({ ...current, PageNumber: 1, Search: event.target.value }))} /></div>
      <ManufacturingCard>
        <DataTableShell columnCount={7} loading={state.loading} emptyTitle={!state.loading && state.page.items.length === 0 ? "No manufacturing BOMs found" : ""} emptyHint="Create the first versioned BOM for a manufactured finished item." minWidth="min-w-[920px]" head={<>{["Finished item", "Version", "Components", "Default", "Status", "Created", "Actions"].map((label) => <th key={label}>{label}</th>)}</>}>
          {state.page.items.map((bom) => {
            const id = getRecordId(bom);
            const active = bom.isActive === true || String(bom.status ?? "").toLowerCase() === "active";
            return <tr key={id}><td><p className="font-medium text-slate-900">{getItemName(bom)}</p><p className="mt-0.5 text-xs text-slate-500">{bom.finishedItemCode ?? bom.itemCode ?? ""}</p></td><td>v{bom.version ?? bom.versionNumber ?? "—"}</td><td>{getBomLines(bom).length || bom.componentCount || 0}</td><td>{bom.isDefault ? <span className="font-medium text-brand">Default</span> : "—"}</td><td><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{active ? "Active" : "Draft"}</span></td><td>{bom.createdAt?.slice?.(0, 10) ?? "—"}</td><td><div className="flex items-center gap-1"><button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-brand-light hover:text-brand" disabled={!capabilities.canUpdate} onClick={() => setModal({ bom, open: true })}><Edit3 className="h-4 w-4" /></button>{!active && <button type="button" title="Activate BOM" className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40" disabled={!capabilities.canUpdate || actionId === id} onClick={() => activate(bom)}><CheckCircle2 className="h-4 w-4" /></button>}</div></td></tr>;
          })}
        </DataTableShell>
        <ManufacturingPagination disabled={state.loading} page={state.page} onPageChange={(PageNumber) => setFilters((current) => ({ ...current, PageNumber }))} onPageSizeChange={(PageSize) => setFilters((current) => ({ ...current, PageNumber: 1, PageSize }))} />
      </ManufacturingCard>
      <BomModal bom={modal.bom} isOpen={modal.open} onClose={() => setModal({ bom: null, open: false })} onSaved={load} />
    </section>
  );
};

export default ManufacturingBomsPage;
