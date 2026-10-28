import { useCallback, useEffect, useState } from "react";
import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppLookup from "../../components/common/AppLookup";
import AppModal from "../../components/common/AppModal";
import AppSelect from "../../components/common/AppSelect";
import useCapabilities from "../../hooks/useCapabilities";
import { hsnGstService } from "../../services/gst/hsnGstService";
import { categoryService } from "../../services/inventory/categoryService";
import { documentLookupService } from "../../services/documentLookupService";
import { getApiErrorMessage } from "../../utils/apiError";
import { lookupPage } from "../../utils/lookupPage";
import { validateHsnSacInput } from "./hsnGstHelpers";

const newCode = { code: "", codeType: "HSN", description: "", isActive: true };
const entity = response => response?.data ?? response;
const hsnLabel = row => `${row.code} · ${row.description}${row.isActive === false ? " (inactive)" : ""}`;
const loadCodes = async ({ search, page, pageSize, signal }) => lookupPage(await hsnGstService.listHsnSacs({ Search: search, PageNumber: page, PageSize: pageSize, IsActive: true }, { signal }), page, pageSize);

export default function HsnMaintenancePanel() {
  const catalogue = useCapabilities({ actions: ["view", "create", "update"], pageName: "GST.RateHistory", route: "/gst/rate-history", resource: "GST.RateHistory" });
  const items = useCapabilities({ actions: ["view", "update"], pageName: "Items", route: "/items", resource: "items" });
  const categories = useCapabilities({ actions: ["view", "update"], pageName: "Categories", route: "/categories", resource: "categories" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState({ items: [], hasMore: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mapping, setMapping] = useState({ kind: "item", entityId: "", hsnSacId: "", effectiveFrom: "", effectiveTo: "", onDate: "" });
  const [resolved, setResolved] = useState(null);
  const [mappingMessage, setMappingMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const canReadMapping = mapping.kind === "item" ? items.canView : categories.canView;
  const canSaveMapping = mapping.kind === "item" ? items.canUpdate : categories.canUpdate;
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setList(lookupPage(await hsnGstService.listHsnSacs({ Search: search, PageNumber: page, PageSize: 20 }), page, 20)); }
    catch (failure) { setError(getApiErrorMessage(failure, "Unable to load HSN/SAC catalogue.")); }
    finally { setLoading(false); }
  }, [page, search]);
  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 250);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!mapping.entityId || !mapping.onDate || !canReadMapping) return;
    const controller = new AbortController();
    const request = mapping.kind === "item" ? hsnGstService.getEffectiveClassification(mapping.entityId, mapping.onDate, { signal: controller.signal }) : hsnGstService.getEffectiveCategoryDefault(mapping.entityId, mapping.onDate, { signal: controller.signal });
    request.then(response => { if (!controller.signal.aborted) setResolved(entity(response)); }).catch(failure => { if (!controller.signal.aborted) { setResolved(null); setMappingMessage(getApiErrorMessage(failure, "Classification could not be resolved. Retry after checking access and date.")); } });
    return () => controller.abort();
  }, [canReadMapping, mapping.entityId, mapping.kind, mapping.onDate, revision]);
  const setMappingField = (key, value) => { setMapping(current => ({ ...current, [key]: value })); setMappingMessage(""); if (["kind", "entityId", "onDate"].includes(key)) setResolved(null); };
  const saveCode = async event => {
    event.preventDefault();
    const validation = validateHsnSacInput(editor);
    if (validation) { setError(validation); return; }
    setSaving(true); setError("");
    try { await hsnGstService.saveHsnSac(editor.id, { code: editor.code.trim(), codeType: editor.codeType, description: editor.description.trim(), isActive: editor.isActive }); setEditor(null); await load(); }
    catch (failure) { setError(getApiErrorMessage(failure, "HSN/SAC could not be saved. Your entry is retained.")); }
    finally { setSaving(false); }
  };
  const changeMapping = async retire => {
    if (!canSaveMapping || !mapping.entityId) return;
    if (!mapping.effectiveFrom && !retire || !mapping.effectiveTo && retire || !mapping.hsnSacId && !retire) { setMappingMessage("Choose the record, HSN/SAC and effective dates before saving."); return; }
    if (mapping.effectiveTo && mapping.effectiveFrom && mapping.effectiveTo < mapping.effectiveFrom) { setMappingMessage("The end date cannot precede the start date."); return; }
    const mappingId = resolved?.mappingId ?? resolved?.id;
    if (retire && !mappingId) { setMappingMessage("Resolve the current dated mapping before retiring it."); return; }
    if (retire && mapping.kind === "item" && resolved?.source !== "ProductOverride") { setMappingMessage("The selected item inherits this classification. Retire its category default from Category, or create an explicit Item override."); return; }
    setSaving(true); setMappingMessage("");
    try {
      const payload = { hsnSacId: String(mapping.hsnSacId), effectiveFrom: mapping.effectiveFrom, effectiveTo: mapping.effectiveTo || null };
      if (mapping.kind === "item") { if (retire) await hsnGstService.retireItemOverride(mapping.entityId, mappingId, mapping.effectiveTo); else await hsnGstService.saveItemOverride(mapping.entityId, payload); }
      else if (retire) await hsnGstService.retireCategoryDefault(mapping.entityId, mappingId, mapping.effectiveTo); else await hsnGstService.saveCategoryDefault(mapping.entityId, payload);
      setMappingMessage(retire ? "Mapping retired. Existing document snapshots are retained." : "Dated mapping saved. Resolve it on the required business date to review its effect."); setRevision(value => value + 1);
    } catch (failure) { setMappingMessage(getApiErrorMessage(failure, "Mapping could not be saved. Your entry is retained.")); }
    finally { setSaving(false); }
  };
  const loadEntities = async ({ search: query, page: number, pageSize, signal }) => lookupPage(mapping.kind === "item" ? await documentLookupService.items({ Search: query, PageNumber: number, PageSize: pageSize }, { signal }) : await categoryService.getCategories({ Search: query, PageNumber: number, PageSize: pageSize }, { signal }), number, pageSize);
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">HSN/SAC catalogue and effective classification</h2><p className="text-sm text-slate-500">Item override → category default → explicit legacy fallback. Mappings are dated; saved invoices retain their tax snapshots.</p></div>{catalogue.canCreate && <AppButton onClick={() => { setError(""); setEditor({ ...newCode }); }}>Add HSN/SAC</AppButton>}</div>
    <AppInput label="Search code or description" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" className="underline" onClick={load}>Retry catalogue</button></p>}
    {loading && <p role="status">Loading catalogue…</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Code</th><th className="p-2">Description</th><th className="p-2">Status</th><th className="p-2">Action</th></tr></thead><tbody>{list.items.map(row => <tr key={row.id} className="border-t border-slate-100"><td className="p-2 font-semibold">{row.code} ({row.codeType})</td><td className="p-2">{row.description}</td><td className="p-2">{row.isActive ? "Active" : "Inactive"}</td><td className="p-2">{catalogue.canUpdate && <button type="button" className="text-brand underline" onClick={() => { setError(""); setEditor(row); }}>Edit / retire code</button>}</td></tr>)}</tbody></table></div>
    {!loading && !error && !list.items.length && <p>No matching HSN/SAC records.</p>}
    <div className="flex items-center justify-end gap-3"><AppButton variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</AppButton><span className="text-sm">Page {page}</span><AppButton variant="secondary" disabled={!list.hasMore || loading} onClick={() => setPage(value => value + 1)}>Next</AppButton></div>
    <details className="rounded-lg border border-slate-200 p-4"><summary className="cursor-pointer font-semibold text-slate-900">Maintain category defaults and Item overrides</summary><div className="mt-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-3"><AppSelect label="Mapping belongs to" disabled={saving} value={mapping.kind} options={[{ value: "item", label: "Item override" }, { value: "category", label: "Category default" }]} onChange={value => { setMapping(current => ({ ...current, kind: value, entityId: "" })); setResolved(null); }} /><AppLookup label={mapping.kind === "item" ? "Inventory Item" : "Inventory Category"} disabled={!canReadMapping || saving} scopeKey={mapping.kind} value={mapping.entityId} onChange={value => setMappingField("entityId", String(value))} loadPage={loadEntities} loadById={async (id, options) => entity(mapping.kind === "item" ? await documentLookupService.item(id, options) : await categoryService.getCategoryById(id, options))} /><AppInput label="Resolve on business date" required type="date" value={mapping.onDate} onChange={event => setMappingField("onDate", event.target.value)} /></div>
      {!canReadMapping && <p role="status" className="text-sm text-amber-800">Ask an administrator for view access to this master.</p>}
      {resolved && <p className="rounded-lg bg-slate-50 p-3 text-sm">Resolved: {resolved.code || resolved.legacyHsnCode || "No classification"} · {resolved.source || "Category default"} · {resolved.effectiveFrom || "Legacy / no dated mapping"}{resolved.effectiveTo ? ` to ${resolved.effectiveTo}` : ""}</p>}
      <div className="grid gap-4 md:grid-cols-3"><AppLookup label="HSN/SAC" disabled={!canSaveMapping || saving} value={mapping.hsnSacId} onChange={value => setMappingField("hsnSacId", String(value))} loadPage={loadCodes} loadById={async (id, options) => entity(await hsnGstService.getHsnSac(id, options))} getOptionLabel={hsnLabel} /><AppInput type="date" label="Effective from" disabled={!canSaveMapping || saving} value={mapping.effectiveFrom} onChange={event => setMappingField("effectiveFrom", event.target.value)} /><AppInput type="date" label="Effective to (inclusive)" disabled={!canSaveMapping || saving} value={mapping.effectiveTo} onChange={event => setMappingField("effectiveTo", event.target.value)} /></div>
      {mappingMessage && <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{mappingMessage}</p>}
      <div className="flex flex-wrap gap-3"><AppButton disabled={!canSaveMapping || saving} onClick={() => changeMapping(false)}>Save dated mapping</AppButton><AppButton variant="secondary" disabled={!canSaveMapping || saving || !resolved} onClick={() => changeMapping(true)}>Retire resolved mapping</AppButton><AppButton variant="secondary" disabled={!canReadMapping || saving} onClick={() => setRevision(value => value + 1)}>Resolve / retry</AppButton></div>
      {!canSaveMapping && <p className="text-sm text-slate-500">You can review classification. An operator with edit permission for the selected master maintains mappings.</p>}
    </div></details>
    <AppModal isOpen={Boolean(editor)} isBusy={saving} onClose={() => setEditor(null)} title={editor?.id ? "Edit HSN/SAC" : "Add HSN/SAC"}>{editor && <form className="space-y-4" onSubmit={saveCode}>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<AppInput label="Code" required disabled={saving} value={editor.code} onChange={event => setEditor(value => ({ ...value, code: event.target.value }))} /><AppSelect label="Code type" disabled={saving} options={[{ value: "HSN", label: "HSN — goods" }, { value: "SAC", label: "SAC — services" }]} value={editor.codeType} onChange={value => setEditor(current => ({ ...current, codeType: value }))} /><AppInput label="Description" required disabled={saving} value={editor.description} onChange={event => setEditor(value => ({ ...value, description: event.target.value }))} /><label className="flex gap-2 text-sm"><input type="checkbox" disabled={saving} checked={editor.isActive} onChange={event => setEditor(value => ({ ...value, isActive: event.target.checked }))} />Active for new mappings</label><AppButton type="submit" isLoading={saving}>Save HSN/SAC</AppButton></form>}</AppModal>
  </section>;
}
