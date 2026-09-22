import { Ban, Boxes, CheckCircle2, FileBarChart, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import DataTableShell from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import { manufacturingProductionService } from "../../../services/manufacturing/manufacturingService";
import { getApiErrorMessage } from "../../../utils/apiError";
import { ManufacturingCard, ManufacturingInlineError, ManufacturingStatusPill } from "../ManufacturingShared";
import { formatDate, formatQuantity, getItemName, getRecordId, getStatus, normalizePage } from "../manufacturingHelpers";

const ManufacturingReportsPage = () => {
  const [filters, setFilters] = useState({ FromDate: "", ToDate: "", Status: "", PageNumber: 1, PageSize: 200 });
  const [state, setState] = useState({ error: "", items: [], loading: true, totalCount: 0 });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, error: "", loading: true }));
    try {
      const page = normalizePage(await manufacturingProductionService.list(filters));
      setState({ error: "", items: page.items, loading: false, totalCount: page.totalCount });
    } catch (error) {
      setState((current) => ({ ...current, error: getApiErrorMessage(error, "Unable to load the production register."), loading: false }));
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  const summary = useMemo(() => state.items.reduce((result, record) => {
    const status = getStatus(record).toLowerCase();
    result.quantity += Number(record.producedQuantity ?? record.quantity ?? 0);
    if (status === "posted") result.posted += 1;
    if (status === "cancelled" || status === "canceled") result.cancelled += 1;
    return result;
  }, { cancelled: 0, posted: 0, quantity: 0 }), [state.items]);

  const cards = [
    { icon: Boxes, label: "Matching records", value: state.totalCount, tone: "bg-brand-light text-brand" },
    { icon: CheckCircle2, label: "Posted in loaded set", value: summary.posted, tone: "bg-emerald-50 text-emerald-700" },
    { icon: Ban, label: "Cancelled in loaded set", value: summary.cancelled, tone: "bg-red-50 text-red-700" },
    { icon: FileBarChart, label: "Produced quantity", value: formatQuantity(summary.quantity), tone: "bg-violet-50 text-violet-700" },
  ];

  return <section className="space-y-6">
    <PageHeader icon={FileBarChart} badge="Manufacturing" title="Production reports" description="Review server-backed production history. Dedicated costing and multi-level manufacturing reports remain outside this module." actions={<AppButton variant="secondary" disabled={state.loading} onClick={load}><RefreshCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} /> Refresh</AppButton>} />
    <ManufacturingInlineError message={state.error} onRetry={load} title="Report unavailable" />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ icon: Icon, label, tone, value }) => <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold text-slate-900">{value}</p></div></div>)}</div>
    <div className="grid gap-3 sm:grid-cols-3"><AppInput type="date" label="From date" value={filters.FromDate} onChange={(event) => setFilters((current) => ({ ...current, FromDate: event.target.value }))} /><AppInput type="date" label="To date" value={filters.ToDate} onChange={(event) => setFilters((current) => ({ ...current, ToDate: event.target.value }))} /><AppSelect label="Status" value={filters.Status} options={[{ value: "", label: "All statuses" }, ...["Draft", "Posted", "Cancelled"].map((value) => ({ value, label: value }))]} onChange={(Status) => setFilters((current) => ({ ...current, Status }))} /></div>
    <ManufacturingCard title="Production register" description={state.totalCount > state.items.length ? `Showing the first ${state.items.length} of ${state.totalCount} matching records.` : `${state.totalCount} matching records.`}>
      <DataTableShell columnCount={7} loading={state.loading} emptyTitle={!state.loading && state.items.length === 0 ? "No production activity found" : ""} emptyHint="Adjust the date range or status filter." minWidth="min-w-[900px]" head={<>{["Date", "Reference", "Finished item", "Quantity", "BOM", "Status", "Cancellation reason"].map((label) => <th key={label}>{label}</th>)}</>}>
        {state.items.map((record) => <tr key={getRecordId(record)}><td>{formatDate(record.productionDate)}</td><td className="font-medium text-slate-900">{record.referenceNumber ?? record.referenceNo ?? `PR-${getRecordId(record)}`}</td><td>{getItemName(record)}</td><td>{formatQuantity(record.producedQuantity ?? record.quantity, record.unitShortName)}</td><td>v{record.bomVersion ?? record.version ?? "—"}</td><td><ManufacturingStatusPill record={record} /></td><td className="max-w-xs truncate" title={record.cancellationReason ?? record.cancelReason ?? ""}>{record.cancellationReason ?? record.cancelReason ?? "—"}</td></tr>)}
      </DataTableShell>
    </ManufacturingCard>
  </section>;
};

export default ManufacturingReportsPage;
