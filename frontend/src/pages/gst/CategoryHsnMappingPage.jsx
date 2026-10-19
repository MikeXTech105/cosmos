import { RefreshCw, Tags } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import DataTableShell from "../../components/common/DataTableShell";
import PageHeader from "../../components/common/PageHeader";
import useCapabilities from "../../hooks/useCapabilities";
import { categoryService } from "../../services/inventory/categoryService";
import { hsnGstService } from "../../services/gst/hsnGstService";
import { getApiErrorMessage } from "../../utils/apiError";
import { getPagedItems, todayIsoDate } from "./hsnGstHelpers";

const CategoryHsnMappingPage = () => {
  const capabilities = useCapabilities({ actions: ["view", "update"], label: "GST Category Mapping", pageName: "GST.CategoryMapping", resource: "GST.CategoryMapping", route: "/gst/category-mappings" });
  const [categories, setCategories] = useState([]);
  const [hsnOptions, setHsnOptions] = useState([]);
  const [mappings, setMappings] = useState({});
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [categoryResponse, hsnResponse] = await Promise.all([
        categoryService.getCategories({ PageNumber: 1, PageSize: 200, IsActive: true }),
        hsnGstService.listHsnSac({ PageNumber: 1, PageSize: 200, IsActive: true }),
      ]);
      const categoryItems = getPagedItems(categoryResponse);
      const entries = await Promise.all(categoryItems.map(async (category) => [category.id, (await hsnGstService.getEffectiveCategoryDefault(category.id, todayIsoDate())).data]));
      setCategories(categoryItems);
      setMappings(Object.fromEntries(entries));
      setHsnOptions(getPagedItems(hsnResponse).map((item) => ({ value: String(item.id), label: `${item.code} · ${item.codeType} — ${item.description}` })));
      setDrafts(Object.fromEntries(categoryItems.map((category) => [category.id, { hsnSacId: "", effectiveFrom: todayIsoDate(), effectiveTo: "" }])));
    } catch (requestError) { setError(getApiErrorMessage(requestError, "Unable to load categories or active HSN/SAC codes.")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  const updateDraft = (id, patch) => setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  const save = async (id) => { const draft = drafts[id]; if (!draft?.hsnSacId || !draft.effectiveFrom) return toast.error("Select an HSN/SAC code and effective-from date."); if (draft.effectiveTo && draft.effectiveTo < draft.effectiveFrom) return toast.error("Effective-to date cannot be earlier than effective-from date."); setSavingId(id); try { const response = await hsnGstService.saveCategoryDefault(id, { hsnSacId: Number(draft.hsnSacId), effectiveFrom: draft.effectiveFrom, effectiveTo: draft.effectiveTo || null }); toast.success(response.message || "Category default saved."); await load(); } catch (requestError) { toast.error(getApiErrorMessage(requestError, "Unable to save category default.")); } finally { setSavingId(null); } };
  const retire = async (id, mapping) => { setSavingId(id); try { const response = await hsnGstService.retireCategoryDefault(id, mapping.id, { effectiveTo: todayIsoDate() }); toast.success(response.message || "Category default retired at the end of today."); await load(); } catch (requestError) { toast.error(getApiErrorMessage(requestError, "Unable to retire category default.")); } finally { setSavingId(null); } };

  return <section className="space-y-5"><PageHeader badge={<> <Tags className="h-3.5 w-3.5" /> GST / Classification </>} title="Category HSN defaults" description="Review, add, or retire effective-dated category defaults without deleting history." actions={<AppButton disabled={loading} variant="secondary" onClick={load}><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />Refresh</AppButton>} />{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<DataTableShell columnCount={5} emptyTitle="No active categories found" emptyHint="Create an inventory category before assigning its GST default." head={<><th>Category</th><th>Current default</th><th className="min-w-[310px]">New default HSN/SAC</th><th className="min-w-[280px]">Effective range</th><th className="w-40 text-right">Actions</th></>} loading={loading} minWidth="min-w-[1160px]">{categories.map((category) => { const mapping = mappings[category.id]; const draft = drafts[category.id] ?? {}; return <tr key={category.id}><td><p className="font-semibold text-slate-900">{category.name}</p><p className="mt-1 max-w-xs truncate text-xs text-slate-500">{category.description || "No description"}</p></td><td>{mapping ? <><p className="font-semibold text-slate-800">{mapping.code} · {mapping.codeType}</p><p className="mt-1 text-xs text-slate-500">From {mapping.effectiveFrom}{mapping.effectiveTo ? ` to ${mapping.effectiveTo}` : ""}</p></> : <span className="text-sm text-slate-500">No active default</span>}</td><td><AppSelect aria-label={`HSN/SAC default for ${category.name}`} options={[{ value: "", label: "Select active code" }, ...hsnOptions]} value={draft.hsnSacId ?? ""} onChange={(hsnSacId) => updateDraft(category.id, { hsnSacId })} /></td><td><div className="grid grid-cols-2 gap-2"><AppInput aria-label={`Effective from for ${category.name}`} type="date" value={draft.effectiveFrom ?? ""} onChange={(event) => updateDraft(category.id, { effectiveFrom: event.target.value })} /><AppInput aria-label={`Effective to for ${category.name}`} min={draft.effectiveFrom || undefined} type="date" value={draft.effectiveTo ?? ""} onChange={(event) => updateDraft(category.id, { effectiveTo: event.target.value })} /></div></td><td className="space-x-2 text-right">{capabilities.canUpdate ? <><AppButton className="h-10 px-3" isLoading={savingId === category.id} onClick={() => save(category.id)}>Save</AppButton>{mapping && <AppButton className="h-10 px-3" disabled={savingId === category.id} variant="secondary" onClick={() => retire(category.id, mapping)}>Retire</AppButton>}</> : <span className="text-xs text-slate-500">Edit permission required</span>}</td></tr>; })}</DataTableShell></section>;
};

export default CategoryHsnMappingPage;
