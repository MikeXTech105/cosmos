import { useEffect, useMemo, useState } from "react";
import AppButton from "../../../components/common/AppButton";
import AppSelect from "../../../components/common/AppSelect";
import AppDateRangeFilter from "../../../components/common/AppDateRangeFilter";
import { getQuickDateRange } from "../../../components/common/dateRangePresets";
import { oeeProductionEntryService } from "../../../services/oee/oeeProductionEntryService";
import { buildDowntimeAnalysis, loadDowntimeEntries } from "./downtimeAnalysis";

export default function OeeDowntimeAnalysis() {
  const [range, setRange] = useState(() => getQuickDateRange("lastMonth"));
  const [filters, setFilters] = useState({ machineId: "", mouldId: "", downtimeReasonId: "", search: "" });
  const [result, setResult] = useState({ loading: true, rows: [], error: "" });
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setResult({ loading: true, rows: [], error: "" });
      try {
        const rows = await loadDowntimeEntries(oeeProductionEntryService.getProductionEntries,
          { FromDate: range.fromDate, ToDate: range.toDate }, controller.signal);
        if (!controller.signal.aborted) setResult({ loading: false, rows, error: "" });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ loading: false, rows: [], error: error.message || "Unable to load downtime analysis." });
      }
    });
    return () => controller.abort();
  }, [range, refresh]);
  const options = (key, labelKey, label) => [
    { label, value: "" },
    ...[...new Map(result.rows.filter((row) => row[key]).map((row) => [String(row[key]), { value: String(row[key]), label: row[labelKey] || String(row[key]) }])).values()]
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];
  const selected = useMemo(() => result.rows.filter((row) =>
    ["machineId", "mouldId", "downtimeReasonId"].every((key) => !filters[key] || String(row[key]) === filters[key]) &&
    [row.machineName, row.machineCode, row.mouldName, row.downtimeReasonName, row.remarks].filter(Boolean).join(" ").toLowerCase().includes(filters.search.trim().toLowerCase())
  ), [result.rows, filters]);
  const analysis = useMemo(() => buildDowntimeAnalysis(selected), [selected]);
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-base font-semibold text-slate-900">Machine downtime · reason analysis</h2>
        <p className="mt-1 text-sm text-slate-500">Starts with last calendar month. These filters apply only to this analysis.</p></div>
      <AppButton variant="secondary" disabled={result.loading} onClick={() => setRefresh((value) => value + 1)}>Refresh analysis</AppButton>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <AppDateRangeFilter fromDate={range.fromDate} toDate={range.toDate} allowLifetime={false} onChange={setRange} />
      <AppSelect aria-label="Downtime machine" options={options("machineId", "machineName", "All machines")} value={filters.machineId} onChange={(value) => setFilter("machineId", value)} />
      <AppSelect aria-label="Downtime mould" options={options("mouldId", "mouldName", "All moulds")} value={filters.mouldId} onChange={(value) => setFilter("mouldId", value)} />
      <AppSelect aria-label="Downtime reason" options={options("downtimeReasonId", "downtimeReasonName", "All reasons")} value={filters.downtimeReasonId} onChange={(value) => setFilter("downtimeReasonId", value)} />
      <input aria-label="Search downtime analysis" placeholder="Search machine, reason or remarks…" className="h-11 rounded-lg border border-slate-200 px-3 text-sm" value={filters.search} onChange={(event) => setFilter("search", event.target.value)} />
      <AppButton variant="secondary" onClick={() => { setFilters({ machineId: "", mouldId: "", downtimeReasonId: "", search: "" }); setRange(getQuickDateRange("lastMonth")); }}>Reset to last month</AppButton>
    </div>
    <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Percentage = machine/reason entries ÷ all reason-recorded entries matching these filters × 100. This measures recorded frequency, not downtime hours or percentage of scheduled operating time. Entries without a reason do not prove that a machine was running.</p>
    {result.loading ? <p role="status" className="py-6 text-sm text-slate-500">Loading all pages for a complete analysis…</p>
      : result.error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{result.error}</p>
        : <>
          <div className="grid gap-3 sm:grid-cols-3">{[["Matching production entries", analysis.total], ["Entries with a reason", analysis.recorded], ["No reason recorded", analysis.total - analysis.recorded]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}</div>
          {analysis.rows.length ? <>
            <p className="text-sm text-slate-700"><strong>Review first:</strong> {analysis.rows[0].machine} — {analysis.rows[0].reason} ({analysis.rows[0].count} entries). Review the recorded remarks and confirm the root cause before assigning corrective work.</p>
            <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Machine", "Recorded reason", "Entries", "Distinct days", "Share of reason entries"].map((text) => <th key={text} className="px-3 py-3">{text}</th>)}</tr></thead>
              <tbody>{analysis.rows.map((row) => <tr key={row.key} className="border-t border-slate-100"><td className="px-3 py-3">{row.machine}</td><td className="px-3 py-3">{row.reason}</td><td className="px-3 py-3">{row.count}</td><td className="px-3 py-3">{row.days}</td><td className="px-3 py-3"><span>{row.percentage.toFixed(1)}%</span><div className="mt-1 h-1.5 rounded bg-slate-100"><div className="h-full rounded bg-brand" style={{ width: `${row.percentage}%` }} /></div></td></tr>)}</tbody>
              <tfoot className="border-t bg-slate-50 font-semibold"><tr><th colSpan={2} className="px-3 py-3">Filtered total</th><td className="px-3 py-3">{analysis.recorded}</td><td /><td className="px-3 py-3">100%</td></tr></tfoot>
            </table></div>
            <details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-semibold">View matching entry dates and remarks</summary><div className="mt-3 max-h-72 overflow-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead><tr>{["Date", "Machine", "Reason", "Remarks"].map((label) => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{selected.filter((row) => Number(row.downtimeReasonId) > 0 || row.downtimeReasonName).map((row) => <tr key={row.id} className="border-t"><td className="p-2">{row.productionDate?.slice(0, 10)}</td><td className="p-2">{row.machineName}</td><td className="p-2">{row.downtimeReasonName || row.downtimeReasonId}</td><td className="p-2">{row.remarks || "—"}</td></tr>)}</tbody></table></div></details>
          </> : <p className="py-6 text-sm text-slate-500">No reason-recorded entries match these filters.</p>}
        </>}
  </section>;
}
