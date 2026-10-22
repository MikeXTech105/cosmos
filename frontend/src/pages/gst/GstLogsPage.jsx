import { useCallback, useState } from "react";
import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppSelect from "../../components/common/AppSelect";
import DataTableShell from "../../components/common/DataTableShell";
import { gstService } from "../../services/gst/gstService";
import { GST_LOG_SORTS, gstLogFilters, gstLogTimestamp, safeLogSummary } from "../../utils/gstCompliance";
import { GstError, GstFrame, GstPager } from "./GstShared";
import { useGstQuery } from "./useGst";

export default function GstLogsPage() {
  const [draft, setDraft] = useState({ Search: "", CompanyGstRegistrationId: "", ApiType: "", IsSuccess: "", FromDate: "", ToDate: "", SortBy: "CreatedAt", SortDirection: "DESC" });
  const [query, setQuery] = useState({ PageNumber: 1, PageSize: 20 });
  const [validation, setValidation] = useState("");
  const load = useCallback(options => gstService.logs(query, options), [query]);
  const list = useGstQuery(load);
  const set = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const rows = list.data?.items ?? [];
  return <GstFrame title="GST API logs" description="Trace provider operations using timestamps, outcomes and correlation IDs. Sensitive payloads are excluded." actions={<AppButton variant="secondary" disabled={list.loading} onClick={list.retry}>Refresh logs</AppButton>}>
    <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4" onSubmit={event => {
      event.preventDefault();
      try {
        const filters = gstLogFilters(draft);
        setValidation("");
        setQuery(current => ({ ...current, ...filters, PageNumber: 1 }));
      } catch (error) { setValidation(error.message); }
    }}>
      <AppInput label="Search" helperText="Operation, endpoint or error text" value={draft.Search} onChange={event => set("Search", event.target.value)} />
      <AppInput label="Operation" placeholder="Exact API type" value={draft.ApiType} onChange={event => set("ApiType", event.target.value)} />
      <AppInput label="Registration ID" type="number" min="1" step="1" value={draft.CompanyGstRegistrationId} onChange={event => set("CompanyGstRegistrationId", event.target.value)} />
      <AppSelect label="Outcome" value={draft.IsSuccess} onChange={value => set("IsSuccess", value)} options={[{ value: "", label: "All outcomes" }, { value: "true", label: "Success" }, { value: "false", label: "Failure" }]} />
      <AppInput label="From date / time" helperText="Your local time" type="datetime-local" value={draft.FromDate} onChange={event => set("FromDate", event.target.value)} />
      <AppInput label="To date / time" helperText="Your local time" type="datetime-local" min={draft.FromDate || undefined} value={draft.ToDate} onChange={event => set("ToDate", event.target.value)} />
      <AppSelect label="Sort by" value={draft.SortBy} onChange={value => set("SortBy", value)} options={GST_LOG_SORTS} />
      <div className="flex items-end gap-2"><AppSelect label="Direction" value={draft.SortDirection} onChange={value => set("SortDirection", value)} options={["DESC", "ASC"]} /><AppButton type="submit" disabled={list.loading}>Apply filters</AppButton></div>
    </form>
    <GstError error={validation} /><GstError error={list.error} retry={list.retry} />
    {!list.error && <><DataTableShell columnCount={6} loading={list.loading} minWidth="min-w-[1050px]" emptyTitle={!rows.length ? "No GST API logs found" : undefined} emptyHint="Change the filters or return after a provider operation." head={<><th>Timestamp</th><th>Operation</th><th>Outcome / HTTP</th><th>Duration</th><th>Correlation ID</th><th>Safe summary</th></>}>
      {rows.map(row => <tr key={row.id}><td>{gstLogTimestamp(row.createdAt)}</td><td>{row.apiType}<p className="mt-1 text-xs text-slate-500">Registration {row.companyGstRegistrationId ?? "—"}</p></td><td><span className={row.isSuccess ? "text-emerald-800" : "text-red-700"}>{row.isSuccess ? "Success" : "Failed"}</span> / {row.statusCode ?? "—"}</td><td>{row.durationMs == null ? "—" : `${row.durationMs} ms`}</td><td className="break-all font-mono text-xs select-all">{row.correlationId || "Not supplied"}</td><td>{safeLogSummary(row)}</td></tr>)}
    </DataTableShell><GstPager page={query.PageNumber} pageSize={query.PageSize} total={list.data?.totalCount ?? 0} busy={list.loading} onPage={PageNumber => setQuery(current => ({ ...current, PageNumber }))} onSize={PageSize => setQuery(current => ({ ...current, PageNumber: 1, PageSize }))} /></>}
    <p className="text-xs text-slate-500">The API supplies a correlation ID, with no separate request ID field or correlation ID search. Select a correlation ID in the results to copy it. Full provider errors and request/response payloads are withheld to protect credentials and personal information.</p>
  </GstFrame>;
}

