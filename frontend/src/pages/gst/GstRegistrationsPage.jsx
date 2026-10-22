import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import AppModal from "../../components/common/AppModal";
import DataTableShell from "../../components/common/DataTableShell";
import { gstService } from "../../services/gst/gstService";
import { GSTIN_PATTERN, GST_REGISTRATION_SORTS } from "../../utils/gstCompliance";
import { GstError, GstFrame, GstPager } from "./GstShared";
import { useGstAccess, useGstOperation, useGstQuery } from "./useGst";

const fields = [
  ["gstin", "GSTIN", 15], ["legalName", "Legal name", 250], ["tradeName", "Trade name", 250],
  ["stateCode", "State code", 10], ["stateName", "State name", 100], ["branchName", "Branch name", 150],
  ["addressLine1", "Address line 1"], ["addressLine2", "Address line 2"], ["city", "City"], ["district", "District"], ["pincode", "PIN code", 20],
  ["companyId", "Company ID"], ["branchId", "Branch ID"], ["gstPortalUsername", "GST portal username", 150], ["status", "Status", 50],
];

function RegistrationForm({ record, onClose, onSaved }) {
  const operation = useGstOperation();
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: record ?? { status: "Active", isEInvoiceEnabled: false, isEWayBillEnabled: false, isGstReturnEnabled: false, isDefault: false } });
  const submit = values => operation.run(async () => {
    await gstService.saveRegistration(record?.id, values);
    toast.success(record ? "GST registration updated." : "GST registration created.");
    onSaved();
  });
  return <AppModal isOpen title={record ? "Edit GST registration" : "Add GST registration"} maxWidth="max-w-3xl" onClose={onClose} isBusy={operation.busy}>
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      <p className="text-sm text-slate-500">Company and branch IDs are optional. Provider secrets are configured on the server.</p>
      <div className="grid gap-4 sm:grid-cols-2">{fields.map(([name, label, maxLength]) => <AppInput key={name} label={label} maxLength={maxLength} required={name === "gstin" || name === "status"} type={name.endsWith("Id") ? "number" : "text"} min={name.endsWith("Id") ? 1 : undefined} step={name.endsWith("Id") ? 1 : undefined} error={errors[name]?.message}
        {...register(name, {
          required: ["gstin", "status"].includes(name) ? `${label} is required.` : false,
          ...(name === "gstin" ? { setValueAs: value => value.trim().toUpperCase(), pattern: { value: GSTIN_PATTERN, message: "Enter a valid 15-character GSTIN." } } : {}),
          ...(maxLength ? { maxLength: { value: maxLength, message: `Use at most ${maxLength} characters.` } } : {}),
          ...(name.endsWith("Id") ? { validate: value => !value || (Number.isSafeInteger(Number(value)) && Number(value) > 0) || "Enter a positive whole-number ID." } : {}),
        })} />)}</div>
      <fieldset className="flex flex-wrap gap-5 rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-medium text-slate-700">Registration settings</legend>{[["isEInvoiceEnabled", "E-Invoice enabled"], ["isEWayBillEnabled", "E-Way Bill enabled"], ["isGstReturnEnabled", "GST returns enabled"], ["isDefault", "Default registration"]].map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" {...register(key)} className="h-4 w-4 accent-brand" />{label}</label>)}</fieldset>
      <GstError error={operation.error} />
      <div className="flex flex-wrap justify-end gap-2"><AppButton variant="secondary" disabled={operation.busy} onClick={onClose}>Cancel</AppButton><AppButton type="submit" isLoading={operation.busy}>Save registration</AppButton></div>
    </form>
  </AppModal>;
}

export default function GstRegistrationsPage() {
  const access = useGstAccess();
  const operation = useGstOperation();
  const [query, setQuery] = useState({ Search: "", Status: "", StateCode: "", SortBy: "CreatedAt", SortDirection: "DESC", PageNumber: 1, PageSize: 20 });
  const load = useCallback(options => gstService.registrations(query, options), [query]);
  const list = useGstQuery(load);
  const [editor, setEditor] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const filter = (key, value) => setQuery(current => ({ ...current, [key]: value, PageNumber: 1 }));
  const confirm = () => operation.run(async () => {
    const { action, record } = confirmation;
    if (action === "Delete") await gstService.deleteRegistration(record.id);
    if (action === "Verify") await gstService.verifyRegistration(record.id);
    if (action === "Set default") await gstService.defaultRegistration(record.id, record.companyId);
    toast.success(`GST registration: ${action.toLowerCase()} completed.`);
    setConfirmation(null);
    list.retry();
  });
  const edit = record => operation.run(async () => {
    const response = await gstService.registration(record.id);
    setEditor({ record: response.data });
  });
  const rows = list.data?.items ?? [];
  return <GstFrame title="GST registrations" description="Manage company GSTINs, state details and compliance settings." actions={access("GST.Registration", "create") && <AppButton disabled={operation.busy} onClick={() => setEditor({ record: null })}>Add registration</AppButton>}>
    <form onSubmit={event => { event.preventDefault(); list.retry(); }} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
      <AppInput label="Search GSTIN / name" value={query.Search} onChange={event => filter("Search", event.target.value)} />
      <AppInput label="Status filter" helperText="Exact registration status" value={query.Status} onChange={event => filter("Status", event.target.value)} />
      <AppInput label="State code filter" maxLength={10} value={query.StateCode} onChange={event => filter("StateCode", event.target.value)} />
      <AppSelect label="Sort by" value={query.SortBy} onChange={value => filter("SortBy", value)} options={GST_REGISTRATION_SORTS} />
      <div className="flex items-end gap-2"><AppSelect label="Direction" value={query.SortDirection} onChange={value => filter("SortDirection", value)} options={["DESC", "ASC"]} /><AppButton type="submit" variant="secondary" disabled={list.loading}>Refresh</AppButton></div>
    </form>
    <GstError error={list.error} retry={list.retry} /><GstError error={operation.error} />
    {!list.error && <><DataTableShell columnCount={5} loading={list.loading} emptyTitle={!rows.length ? "No GST registrations found" : undefined} emptyHint="Add a company registration or adjust your filters." minWidth="min-w-[900px]" head={<><th>GSTIN / name</th><th>State / branch</th><th>Settings</th><th>Status</th><th>Actions</th></>}>
      {rows.map(record => <tr key={record.id}><td><p className="font-mono text-xs">{record.gstin}</p><p className="mt-1">{record.legalName || record.tradeName || "Name not supplied"}</p><p className="mt-1 text-xs text-slate-500">Registration ID: {record.id}</p></td><td>{record.stateName || record.stateCode || "—"}<p className="text-xs text-slate-500">{record.branchName}</p></td><td className="text-xs">{[record.isDefault && "Default", record.isEInvoiceEnabled && "E-Invoice", record.isEWayBillEnabled && "E-Way Bill"].filter(Boolean).join(" · ") || "None enabled"}</td><td>{record.status}<p className="mt-1 text-xs text-slate-500">{record.lastVerifiedAt ? `Verified ${new Date(record.lastVerifiedAt).toLocaleDateString()}` : "Not verified"}</p></td><td><div className="flex flex-wrap gap-1">
        {access("GST.Registration", "update") && <AppButton variant="ghost" className="h-8 px-2" disabled={operation.busy} onClick={() => edit(record)}>Edit</AppButton>}
        {access("GST.Registration", "approve") && <AppButton variant="ghost" className="h-8 px-2" disabled={operation.busy} onClick={() => { operation.clearError(); setConfirmation({ action: "Verify", record }); }}>Verify</AppButton>}
        {access("GST.Registration", "update") && !record.isDefault && <AppButton variant="ghost" className="h-8 px-2" disabled={operation.busy} onClick={() => { operation.clearError(); setConfirmation({ action: "Set default", record }); }}>Set default</AppButton>}
        {access("GST.Registration", "delete") && <AppButton variant="ghost" className="h-8 px-2 text-red-700" disabled={operation.busy} onClick={() => { operation.clearError(); setConfirmation({ action: "Delete", record }); }}>Delete</AppButton>}
        {access("GST.Session") && <Link to={`/gst/sessions?registrationId=${encodeURIComponent(record.id)}`} className="rounded-lg px-2 py-1 text-sm text-brand hover:bg-brand-light">Session status</Link>}
      </div></td></tr>)}
    </DataTableShell><GstPager page={query.PageNumber} pageSize={query.PageSize} total={list.data?.totalCount ?? 0} busy={list.loading} onPage={PageNumber => setQuery(current => ({ ...current, PageNumber }))} onSize={value => filter("PageSize", value)} /></>}
    {editor && <RegistrationForm record={editor.record} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); list.retry(); }} />}
    <AppModal isOpen={Boolean(confirmation)} title={`${confirmation?.action ?? "Confirm"} GST registration`} onClose={() => setConfirmation(null)} isBusy={operation.busy}>
      <p className="text-sm leading-6 text-slate-600">{confirmation?.action} {confirmation?.record.gstin}? {confirmation?.action === "Verify" ? "This calls the configured GST provider." : "This changes the company registration configuration."}</p>
      <GstError error={operation.error} />
      <div className="mt-5 flex justify-end gap-2"><AppButton variant="secondary" disabled={operation.busy} onClick={() => setConfirmation(null)}>Back</AppButton><AppButton variant={confirmation?.action === "Delete" ? "danger" : "primary"} isLoading={operation.busy} onClick={confirm}>Confirm {confirmation?.action?.toLowerCase()}</AppButton></div>
    </AppModal>
  </GstFrame>;
}

