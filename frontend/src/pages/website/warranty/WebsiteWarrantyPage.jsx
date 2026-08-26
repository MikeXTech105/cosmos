import { Eye, FileBarChart, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import DataTableShell, { DATA_TABLE_ROW_ACTION_CLASS } from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import { WARRANTY_RESOLUTION_NAMES, WARRANTY_STATUS_NAMES } from "../../../constants/websiteEnums";
import { userService } from "../../../services/rbac/userService";
import { fetchWebsiteDashboard, fetchWebsiteWarrantyClaims, fetchWebsiteWarrantySummary } from "../../../store/slices/website/websiteSlice";
import { getApiErrorMessage } from "../../../utils/apiError";
import useWebsiteCapabilities from "../useWebsiteCapabilities";
import { formatWebsiteDate, formatWebsiteDateTime } from "../websiteFormat";
import WarrantyStatusPill from "../WarrantyStatusPill";
import { getWarrantyStatusLabel } from "../warrantyStatus";
import { WebsiteErrorState, WebsitePagination } from "../WebsiteShared";

const createFilters = (searchParams) => ({
  assignedToUserId: "", pageNumber: 1, pageSize: 25, purchaseDateFrom: "", purchaseDateTo: "",
  resolutionType: "", search: "", status: searchParams.get("Status") || "", submittedFromUtc: "", submittedToUtc: "",
});

// BACKEND: GET /warranty-claims/reports/summary response fields remain unverified.
// The summary dialog renders only returned aggregate keys and never fabricates a CSV export.
const WebsiteWarrantyPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const capabilities = useWebsiteCapabilities().warranty;
  const warranty = useSelector((state) => state.website.warranty);
  const dashboard = useSelector((state) => state.website.dashboard);
  const [filters, setFilters] = useState(() => createFilters(searchParams));
  const [users, setUsers] = useState([]);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    const request = dispatch(fetchWebsiteWarrantyClaims(filters));
    return () => request.abort();
  }, [dispatch, filters]);
  useEffect(() => {
    const request = dispatch(fetchWebsiteDashboard());
    return () => request.abort();
  }, [dispatch]);
  useEffect(() => {
    let active = true;
    userService.getUsers({ PageNumber: 1, PageSize: 200 })
      .then((response) => {
        if (active) setUsers(Array.isArray(response.data) ? response.data : response.data?.items || []);
      })
      .catch((error) => {
        if (active) {
          setUsers([]);
          toast.error(getApiErrorMessage(error, "Unable to load assignees."));
        }
      });
    return () => { active = false; };
  }, []);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, pageNumber: key === "pageNumber" ? value : 1 }));
  const refresh = () => {
    dispatch(fetchWebsiteWarrantyClaims(filters));
    dispatch(fetchWebsiteDashboard());
  };
  const openSummary = () => {
    setSummaryOpen(true);
    dispatch(fetchWebsiteWarrantySummary());
  };
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => !["pageNumber", "pageSize"].includes(key) && value !== "").length;
  const cards = [
    { label: "Submitted", value: dashboard.data?.submittedClaims, icon: ShieldCheck },
    { label: "Under review", value: dashboard.data?.underReviewClaims, icon: ShieldCheck },
    { label: "Approved", value: dashboard.data?.approvedClaims, icon: ShieldCheck },
    { label: "Completed", value: dashboard.data?.completedClaims, icon: ShieldCheck },
  ];
  const userOptions = users.map((user) => ({ label: user.fullName || user.name || user.userName || user.email, value: user.id }));

  return (
    <div className="space-y-6">
      <PageHeader badge="Website Management" title="Warranty claims" description="Review customer submissions, evidence, decisions and immutable claim activity." actions={<><AppButton variant="secondary" onClick={refresh}><RefreshCw className={`h-4 w-4 ${warranty.loading ? "animate-spin" : ""}`} /> Refresh</AppButton>{capabilities.canExport ? <AppButton variant="secondary" onClick={openSummary}><FileBarChart className="h-4 w-4" /> Summary report</AppButton> : null}</>} />
      <StatCards cards={cards} loading={dashboard.loading} />
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <AppInput label="Search" placeholder="Reference, customer or order" value={filters.search} onChange={(event) => setFilter("search", event.target.value)} />
          <AppSelect label="Status" options={[{ label: "Any status", value: "" }, ...WARRANTY_STATUS_NAMES.map((value) => ({ label: getWarrantyStatusLabel(value), value }))]} value={filters.status} onChange={(value) => setFilter("status", value)} />
          <AppSelect label="Resolution type" options={[{ label: "Any resolution", value: "" }, ...WARRANTY_RESOLUTION_NAMES.filter((value) => value !== "None").map((value) => ({ label: value, value }))]} value={filters.resolutionType} onChange={(value) => setFilter("resolutionType", value)} />
          <AppSelect label="Assigned to" options={[{ label: "Anyone", value: "" }, ...userOptions]} value={filters.assignedToUserId} onChange={(value) => setFilter("assignedToUserId", value)} />
          <AppInput label="Submitted from" type="datetime-local" value={filters.submittedFromUtc} onChange={(event) => setFilter("submittedFromUtc", event.target.value)} />
          <AppInput label="Submitted to" type="datetime-local" value={filters.submittedToUtc} onChange={(event) => setFilter("submittedToUtc", event.target.value)} />
          <AppInput label="Purchase date from" type="date" value={filters.purchaseDateFrom} onChange={(event) => setFilter("purchaseDateFrom", event.target.value)} />
          <AppInput label="Purchase date to" type="date" value={filters.purchaseDateTo} onChange={(event) => setFilter("purchaseDateTo", event.target.value)} />
        </div>
        <div className="mt-3 flex items-center justify-between"><p className="text-xs text-slate-500">{activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}</p><AppButton variant="ghost" disabled={!activeFilterCount} onClick={() => setFilters(createFilters(new URLSearchParams()))}><X className="h-4 w-4" /> Clear</AppButton></div>
      </section>
      <WebsiteErrorState error={warranty.error} onRetry={refresh} />
      <DataTableShell columnCount={10} loading={warranty.loading} minWidth="min-w-[1480px]" emptyTitle={!warranty.items.length ? "No warranty claims found" : undefined} emptyHint="Try changing the filters. New customer submissions will appear here." head={<><th className="w-14">#</th><th className="w-48">Reference</th><th className="w-64">Customer</th><th className="w-44">Order number</th><th className="w-36">Purchase date</th><th className="w-40">Status</th><th className="w-36">Resolution</th><th className="w-48">Assigned to</th><th className="w-48">Submitted at</th><th className="w-20 text-right">Actions</th></>}>
        {warranty.items.map((claim, index) => <tr key={claim.id} className="cursor-pointer" tabIndex={0} onClick={() => navigate(`/website/warranty/${claim.id}`)} onKeyDown={(event) => { if (event.key === "Enter") navigate(`/website/warranty/${claim.id}`); }}><td>{(warranty.pageNumber - 1) * warranty.pageSize + index + 1}</td><td className="font-mono font-semibold text-brand">{claim.referenceId || "—"}</td><td><p className="truncate font-semibold text-slate-900">{claim.fullName || "—"}</p><p className="mt-0.5 truncate text-xs text-slate-500">{claim.email || "—"}</p></td><td>{claim.orderNumber || "—"}</td><td>{formatWebsiteDate(claim.purchaseDate)}</td><td><WarrantyStatusPill value={claim.status} /></td><td>{claim.resolutionType && claim.resolutionType !== "None" ? claim.resolutionType : "—"}</td><td>{claim.assignedToUserName || "Unassigned"}</td><td>{formatWebsiteDateTime(claim.submittedAtUtc)}</td><td><div className="flex justify-end"><button type="button" className={DATA_TABLE_ROW_ACTION_CLASS} aria-label={`Open claim ${claim.referenceId}`} onClick={(event) => { event.stopPropagation(); navigate(`/website/warranty/${claim.id}`); }}><Eye className="h-4 w-4" /></button></div></td></tr>)}
      </DataTableShell>
      <WebsitePagination disabled={warranty.loading} pageNumber={warranty.pageNumber} pageSize={warranty.pageSize} totalCount={warranty.totalCount} totalPages={warranty.totalPages} onPageChange={(value) => setFilter("pageNumber", value)} onPageSizeChange={(value) => setFilter("pageSize", value)} />

      <AppModal isOpen={summaryOpen} title="Warranty summary report" onClose={() => setSummaryOpen(false)}>
        <p className="text-sm leading-6 text-slate-500">The backend provides a summary report only; no CSV export endpoint exists.</p>
        <WebsiteErrorState error={warranty.summaryError} onRetry={() => dispatch(fetchWebsiteWarrantySummary())} />
        {warranty.summaryLoading ? <div className="mt-4 h-40 animate-pulse rounded-xl bg-slate-100" /> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(warranty.summary || {}).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value)).map(([key, value]) => <div key={key} className="rounded-xl border border-slate-200 p-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{key.replace(/([A-Z])/g, " $1")}</p><p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{String(value)}</p></div>)}</div>}
      </AppModal>
    </div>
  );
};

export default WebsiteWarrantyPage;
