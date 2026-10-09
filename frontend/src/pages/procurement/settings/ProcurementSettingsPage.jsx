import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock3,
  History,
  RotateCw,
  Settings2,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppTooltip from "../../../components/common/AppTooltip";
import PageHeader from "../../../components/common/PageHeader";
import { procurementSettingService } from "../../../services/procurement/procurementSettingService";
import LeadTimeHistoryModal from "./LeadTimeHistoryModal";
import {
  ProcurementErrorState,
  ProcurementPagination,
  ProcurementPill,
  ProcurementSectionCard,
  ProcurementTabs,
} from "../ProcurementShared";
import {
  formatProcurementDecimal,
  getCollection,
  getItemCode,
  getItemName,
  getPagination,
  getProcurementBoolean,
  getRecordId,
} from "../procurementHelpers";
import useProcurementCapabilities from "../useProcurementCapabilities";
import useLatestRequest from "../../../hooks/useLatestRequest";
import ProcurementStatCards from "../ProcurementStatCards";
import ProcurementTable, {
  PROCUREMENT_ROW_ACTION_CLASS,
  PROCUREMENT_TABLE_HEADER_CLASS,
} from "../ProcurementTable";

const QUICK_FILTERS = [
  { id: "all", label: "All materials" },
  { id: "missing", label: "Missing" },
  { id: "inactive", label: "Inactive" },
  { id: "manual", label: "Manual" },
  { id: "automatic", label: "Automatic" },
];

const getSettingItem = (setting) =>
  setting?.item ?? {
    itemCode: setting?.itemCode,
    itemId: setting?.itemId,
    itemName: setting?.itemName,
    unitName: setting?.unitName,
  };

const ProcurementSettingsPage = ({ embedded = false, moduleTabs = null }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState(null);
  const [missingData, setMissingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);
  const [configuredCount, setConfiguredCount] = useState(null);
  const { beginRequest, isLatestRequest } = useLatestRequest();
  const capabilities = useProcurementCapabilities({ label: "ProcurementPlanning.Settings", resource: "ProcurementPlanning.Settings", route: "/procurement/settings" });

  const load = useCallback(async () => {
    const requestId = beginRequest();
    setLoading(true); setError(null);
    const params = { Search: search.trim() || undefined, IsActive: mode === "inactive" ? false : undefined, AutomaticCalculationEnabled: mode === "automatic" ? true : undefined, ManualPlanning: mode === "manual" ? true : undefined, PageNumber: page, PageSize: pageSize };
    try {
      const [listResponse, missingResponse] = await Promise.all([
        mode === "missing" ? procurementSettingService.getMissing(params) : procurementSettingService.list(params),
        procurementSettingService.getMissing({ PageNumber: 1, PageSize: 200 }),
      ]);
      if (isLatestRequest(requestId)) {
        setData(listResponse.data); setMissingData(missingResponse.data);
        if (mode === "all" && !search.trim()) {
          setConfiguredCount(
            Number(listResponse.data?.totalCount) ||
              getCollection(listResponse.data, ["settings", "materials"]).length,
          );
        }
      }
    } catch (loadError) { if (isLatestRequest(requestId)) setError(loadError); }
    finally { if (isLatestRequest(requestId)) setLoading(false); }
  }, [beginRequest, isLatestRequest, mode, page, pageSize, search]);

  useEffect(() => {
    beginRequest();
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [beginRequest, load]);
  const rows = getCollection(data, ["settings", "materials", "missingSettings"]);
  const missingRows = getCollection(missingData, ["items", "missingSettings", "materials"]);
  const missingCount = Number(missingData?.totalCount) || missingRows.length;
  const pagination = getPagination(data, rows.length);
  const defaultLeadTime =
    data?.defaultLeadTimeDays ??
    data?.summary?.defaultLeadTimeDays ??
    missingData?.defaultLeadTimeDays ??
    null;
  const activeFilterCount = [
    Boolean(search.trim()),
    mode !== "all",
  ].filter(Boolean).length;
  const settingsTab = mode === "missing" ? "missing" : "items";
  const tabs = [
    { id: "items", label: "Items", icon: Boxes },
    { id: "missing", label: "Missing", icon: Wrench, count: missingCount },
  ];

  return (
    <section className="min-w-0 space-y-5">
      {!embedded && <PageHeader badge={<><SlidersHorizontal className="h-3.5 w-3.5" />Procurement Planning</>} title="Procurement settings" description="Make lead-time sourcing, planning mode, safety stock, minimum order quantities, and rounding explicit for every purchased material." actions={<AppButton variant="secondary" disabled={loading} onClick={load}><RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</AppButton>} />}
      <ProcurementStatCards
        cards={[
          loading || configuredCount !== null
            ? { icon: Boxes, label: "Items configured", loading: loading && configuredCount === null, value: configuredCount }
            : null,
          loading || missingData !== null
            ? { icon: Wrench, label: "Missing configuration", loading, value: missingCount }
            : null,
          defaultLeadTime === null || defaultLeadTime === undefined
            ? null
            : {
                icon: Clock3,
                label: "Default lead time",
                loading,
                suffix: "days",
                value: defaultLeadTime,
                formatValue: (value) => formatProcurementDecimal(value),
              },
        ]}
      />
      {moduleTabs}
      <ProcurementTabs
        active={settingsTab}
        tabs={tabs}
        onChange={(tab) => {
          setMode(tab === "missing" ? "missing" : "all");
          setPage(1);
        }}
      />
      {missingCount > 0 && <button type="button" className="flex w-full items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-amber-800" onClick={() => { setMode("missing"); setPage(1); }}><span className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span><span className="block text-sm font-semibold">{missingCount} material{missingCount === 1 ? "" : "s"} need configuration</span><span className="mt-0.5 block text-xs leading-5">Configure these before validating a complete automatic plan.</span></span></span><ProcurementPill tone="amber">Open queue</ProcurementPill></button>}
      <ProcurementSectionCard>
        <div className="m-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between"><div className="w-full max-w-md"><AppInput label="Search materials" placeholder="Item code or name" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div><div className="flex flex-wrap gap-2">{QUICK_FILTERS.map((filter) => <button key={filter.id} type="button" className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${mode === filter.id ? "border-brand bg-brand-light text-brand" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`} onClick={() => { setMode(filter.id); setPage(1); }}>{filter.label}{filter.id === "missing" && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-700">{missingCount}</span>}</button>)}</div></div><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><p className="text-xs text-slate-500">{activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}</p>{activeFilterCount > 0 && <AppButton variant="ghost" onClick={() => { setSearch(""); setMode("all"); setPage(1); }}>Clear</AppButton>}</div></div>
        {error ? <ProcurementErrorState error={error} onRetry={load} /> : (
          <ProcurementTable
            columnCount={8}
            emptyIcon={mode === "missing" ? CheckCircle2 : Wrench}
            emptyHint={mode === "missing" ? "Every purchased material has a planning configuration." : "Clear filters or configure an eligible purchased material."}
            emptyTitle={!loading && rows.length === 0 ? mode === "missing" ? "Configuration queue is clear" : "No materials match these filters" : undefined}
            head={<><th className={PROCUREMENT_TABLE_HEADER_CLASS}>#</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Material</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Effective lead time</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Safety factor</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Minimum order qty</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Order multiple</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Mode</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Action</th></>}
            loading={loading}
            minWidth="min-w-[1120px]"
          >
            {rows.map((row, index) => { const item = getSettingItem(row); const manual = getProcurementBoolean(row.manualPlanning); const automatic = getProcurementBoolean(row.automaticCalculationEnabled); const active = getProcurementBoolean(row.isActive, true); return <tr key={getRecordId(item, ["itemId"]) ?? index}><td className="text-xs font-semibold tabular-nums text-slate-400">{(page - 1) * pageSize + index + 1}</td><td><p className="font-semibold text-slate-800">{getItemCode(item)}</p><p className="text-xs text-slate-500">{getItemName(item)} · {row.unitName ?? item.unitName ?? "-"}</p></td><td><div className="flex items-center gap-2"><span className="font-semibold tabular-nums">{formatProcurementDecimal(row.effectiveLeadTimeDays)} days</span><ProcurementPill tone="brand">{row.leadTimeSource ?? row.effectiveLeadTimeSource ?? "Configured"}</ProcurementPill></div></td><td className="text-right tabular-nums">{formatProcurementDecimal(row.safetyFactor)}</td><td className="text-right tabular-nums">{formatProcurementDecimal(row.minimumOrderQuantity)}</td><td className="text-right tabular-nums">{formatProcurementDecimal(row.orderMultiple)}</td><td><div className="flex flex-wrap gap-1"><ProcurementPill tone={manual ? "violet" : automatic ? "emerald" : "amber"}>{manual ? "Manual" : automatic ? "Automatic" : "No mode"}</ProcurementPill>{!active && <ProcurementPill tone="slate">Inactive</ProcurementPill>}</div></td><td><div className="flex items-center justify-end gap-0.5"><AppTooltip label="Lead-time history"><button type="button" aria-label="Lead-time history" className={PROCUREMENT_ROW_ACTION_CLASS} onClick={() => setHistoryItem(item)}><History className="h-4 w-4" /></button></AppTooltip><AppTooltip label="Configure material"><button type="button" aria-label="Configure material" className={PROCUREMENT_ROW_ACTION_CLASS} disabled={!capabilities.canCreate && !capabilities.canEdit} onClick={() => navigate(`/procurement/settings/${getRecordId(item, ["itemId"])}/edit`, { state: { row } })}><Settings2 className="h-4 w-4" /></button></AppTooltip></div></td></tr>; })}
          </ProcurementTable>
        )}
        <ProcurementPagination disabled={loading} {...pagination} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(Number(value)); setPage(1); }} />
      </ProcurementSectionCard>
      <LeadTimeHistoryModal canManage={capabilities.canCreate || capabilities.canEdit} item={historyItem} isOpen={Boolean(historyItem)} onClose={() => setHistoryItem(null)} />
    </section>
  );
};

export default ProcurementSettingsPage;
