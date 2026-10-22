import { Edit3, Plus, RefreshCw, Search, Tags } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppModal from "../../components/common/AppModal";
import AppSelect from "../../components/common/AppSelect";
import DataTableShell from "../../components/common/DataTableShell";
import PageHeader from "../../components/common/PageHeader";
import useCapabilities from "../../hooks/useCapabilities";
import { hsnGstService } from "../../services/gst/hsnGstService";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  getPagedItems,
  getTotalCount,
  validateHsnSacInput,
} from "./hsnGstHelpers";

const emptyForm = { code: "", codeType: "HSN", description: "", isActive: true };

const HsnSacForm = ({ isOpen, isSaving, record, onClose, onSave }) => {
  const [form, setForm] = useState(() => (
    record
      ? { code: record.code ?? "", codeType: record.codeType ?? "HSN", description: record.description ?? "", isActive: record.isActive !== false }
      : emptyForm
  ));

  const submit = (event) => {
    event.preventDefault();
    const validationMessage = validateHsnSacInput(form);

    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    onSave({ ...form, code: form.code.trim(), description: form.description.trim() });
  };

  return (
    <AppModal isBusy={isSaving} isOpen={isOpen} maxWidth="max-w-xl" onClose={isSaving ? undefined : onClose} title={record ? "Edit HSN/SAC" : "Add HSN/SAC"}>
      <form className="space-y-4" onSubmit={submit}>
        <p className="text-sm leading-6 text-slate-500">Maintain the code catalogue used by dated category defaults and product overrides.</p>
        <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
          <AppInput label="Code" required value={form.code} onChange={(event) => setForm((value) => ({ ...value, code: event.target.value }))} />
          <AppSelect label="Type" value={form.codeType} onChange={(codeType) => setForm((value) => ({ ...value, codeType }))} options={[{ value: "HSN", label: "HSN" }, { value: "SAC", label: "SAC" }]} />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-slate-700" htmlFor="hsn-sac-description">Description <span className="text-red-500">*</span></label>
          <textarea id="hsn-sac-description" rows={4} value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/15" />
        </div>
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span><span className="block text-sm font-semibold text-slate-900">Active</span><span className="mt-0.5 block text-xs text-slate-500">Only active codes can be selected in a new mapping.</span></span>
          <input checked={form.isActive} className="h-4 w-4 accent-brand" type="checkbox" onChange={(event) => setForm((value) => ({ ...value, isActive: event.target.checked }))} />
        </label>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <AppButton disabled={isSaving} variant="secondary" onClick={onClose}>Cancel</AppButton>
          <AppButton isLoading={isSaving} type="submit">{record ? "Save changes" : "Create code"}</AppButton>
        </div>
      </form>
    </AppModal>
  );
};

const HsnSacMasterPage = () => {
  const capabilities = useCapabilities({ actions: ["view", "create", "update"], label: "HSN/SAC Master", pageName: "GST.HsnSac", resource: "GST.HsnSac", route: "/gst/hsn-sac" });
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [codeType, setCodeType] = useState("");
  const [active, setActive] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [modal, setModal] = useState({ isOpen: false, record: null, instance: 0 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await hsnGstService.listHsnSac({ Search: search.trim() || undefined, CodeType: codeType || undefined, IsActive: active === "all" ? undefined : active === "active", PageNumber: 1, PageSize: 200 });
      const items = getPagedItems(response);
      setRecords(items);
      setTotalCount(getTotalCount(response, items.length));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load the HSN/SAC catalogue."));
    } finally { setLoading(false); }
  }, [active, codeType, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  const save = async (payload) => {
    setSaving(true);
    try {
      const response = modal.record
        ? await hsnGstService.updateHsnSac(modal.record.id, payload)
        : await hsnGstService.createHsnSac(payload);
      toast.success(response.message || `HSN/SAC ${modal.record ? "updated" : "created"}.`);
      setModal((current) => ({ ...current, isOpen: false, record: null }));
      await load();
    } catch (requestError) { toast.error(getApiErrorMessage(requestError, "Unable to save HSN/SAC.")); }
    finally { setSaving(false); }
  };

  return (
    <section className="space-y-5">
      <PageHeader badge={<> <Tags className="h-3.5 w-3.5" /> GST / Master data </>} title="HSN/SAC master" description="Maintain the controlled HSN and SAC catalogue used by GST classifications." actions={<><AppButton disabled={loading} variant="secondary" onClick={load}><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />Refresh</AppButton>{capabilities.canCreate && <AppButton onClick={() => setModal((current) => ({ isOpen: true, record: null, instance: current.instance + 1 }))}><Plus className="h-4 w-4" />Add code</AppButton>}</>} />
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.4)]">
        <AppInput className="w-full sm:w-72" label="Search" placeholder="Code or description" value={search} onChange={(event) => setSearch(event.target.value)} LeadingIcon={Search} />
        <AppSelect className="w-40" label="Code type" value={codeType} onChange={setCodeType} options={[{ value: "", label: "All types" }, { value: "HSN", label: "HSN" }, { value: "SAC", label: "SAC" }]} />
        <AppSelect className="w-40" label="Status" value={active} onChange={setActive} options={[{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
        <p className="mb-2 text-xs text-slate-500">{totalCount} matching code{totalCount === 1 ? "" : "s"}</p>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <DataTableShell columnCount={5} emptyTitle="No HSN/SAC codes found" emptyHint="Change the filters or add an approved code to the catalogue." head={<><th>Code</th><th>Type</th><th>Description</th><th>Status</th><th className="w-28 text-right">Actions</th></>} loading={loading}>
        {records.map((record) => <tr key={record.id}><td className="font-semibold text-slate-900">{record.code}</td><td><span className="rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-semibold text-brand">{record.codeType}</span></td><td><p className="max-w-xl truncate" title={record.description}>{record.description}</p></td><td><span className={record.isActive ? "text-emerald-700" : "text-slate-500"}>{record.isActive ? "Active" : "Inactive"}</span></td><td className="text-right">{capabilities.canUpdate && <button aria-label={`Edit ${record.code}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-brand-light hover:text-brand" onClick={() => setModal({ isOpen: true, record })}><Edit3 className="h-4 w-4" /></button>}</td></tr>)}
      </DataTableShell>
      <HsnSacForm key={modal.record?.id ?? `new-${modal.instance}`} isOpen={modal.isOpen} isSaving={saving} record={modal.record} onClose={() => setModal((current) => ({ ...current, isOpen: false, record: null }))} onSave={save} />
    </section>
  );
};

export default HsnSacMasterPage;
