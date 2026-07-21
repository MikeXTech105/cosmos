import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileClock,
  History,
  Pencil,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import {
  PlanningRunStatus,
  PLANNING_RUN_STATUS_LABELS,
  PLANNING_RUN_STATUS_OPTIONS,
} from "../../../constants/procurementEnums";
import { planningService } from "../../../services/procurement/planningService";
import {
  InventoryBasisNote,
  ProcurementDateRangeFields,
  ProcurementEmptyState,
  ProcurementErrorState,
  ProcurementInlineError,
  ProcurementLoadingRows,
  ProcurementPagination,
  ProcurementPill,
  ProcurementSectionCard,
} from "../ProcurementShared";
import {
  formatProcurementDate,
  formatProcurementDateTime,
  formatProcurementDecimal,
  formatProcurementInteger,
  getApiStatus,
  getCollection,
  getDefaultProcurementRange,
  getFieldErrorMap,
  getInclusiveDayCount,
  getItemCode,
  getItemName,
  getPagination,
  getProcurementBoolean,
  getProcurementError,
  getRecordId,
  hasDecimalPrecision,
  toNumberOrNull,
  validateDateRange,
} from "../procurementHelpers";
import useProcurementCapabilities from "../useProcurementCapabilities";
import useLatestRequest from "../../../hooks/useLatestRequest";

const getRunStatus = (run) => run?.status ?? run?.planningRunStatus;

const isFinalizedRun = (run) => {
  const status = getRunStatus(run);

  return (
    Number(status) === PlanningRunStatus.Finalized ||
    String(status).toLowerCase() === "finalized"
  );
};

const runStatusMeta = (run) => {
  const finalized = isFinalizedRun(run);

  return {
    label:
      run?.statusName ??
      PLANNING_RUN_STATUS_LABELS[getRunStatus(run)] ??
      (finalized ? "Finalized" : "Draft"),
    tone: finalized ? "emerald" : "amber",
  };
};

const getRunLines = (payload) => getCollection(payload, ["planningLines", "lines"]);

const RunList = ({
  data,
  error,
  filters,
  loading,
  onChangeFilters,
  onOpen,
  onPageChange,
  onPageSizeChange,
  onRetry,
  page,
  pageSize,
}) => {
  const rangeError = validateDateRange(filters.fromDate, filters.toDate);
  const runs = getCollection(data, ["runs", "planningRuns"]);
  const pagination = getPagination(data, runs.length);

  return (
    <ProcurementSectionCard
      title="Planning runs"
      description="Each saved run is a versioned snapshot. Opening one never recalculates its material values."
      actions={
        <AppButton disabled={loading} variant="secondary" onClick={onRetry}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </AppButton>
      }
    >
      <div className="grid gap-4 border-b border-slate-100 p-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <ProcurementDateRangeFields
          fromDate={filters.fromDate}
          toDate={filters.toDate}
          error={rangeError}
          onChange={(patch) => onChangeFilters(patch)}
        />
        <AppSelect
          label="Run status"
          options={[{ label: "All statuses", value: "" }, ...PLANNING_RUN_STATUS_OPTIONS]}
          value={filters.status}
          onChange={(status) => onChangeFilters({ status })}
        />
      </div>
      {loading ? (
        <ProcurementLoadingRows columns={7} />
      ) : error ? (
        <ProcurementErrorState error={error} onRetry={onRetry} />
      ) : runs.length === 0 ? (
        <ProcurementEmptyState
          icon={FileClock}
          title="No planning runs in this range"
          description="Saved draft and finalized plan snapshots will appear here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-left">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Run</th>
                <th className="px-4 py-3">Demand range</th>
                <th className="px-4 py-3 text-right">Days</th>
                <th className="px-4 py-3 text-right">Lines</th>
                <th className="px-4 py-3 text-right">Purchase lines</th>
                <th className="px-4 py-3">Calculated</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {runs.map((run, index) => {
                const status = runStatusMeta(run);
                const days =
                  Number(run.numberOfDays) ||
                  getInclusiveDayCount(run.fromDate, run.toDate);
                return (
                  <tr
                    key={getRecordId(run, ["planningRunId"])}
                    className="hover:bg-slate-50/80"
                  >
                    <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">
                        {run.runNumber ?? getRecordId(run, ["planningRunId"])}
                      </p>
                      {run.notes && (
                        <p className="mt-0.5 max-w-56 truncate text-xs text-slate-500">
                          {run.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatProcurementDate(run.fromDate)} – {formatProcurementDate(run.toDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatProcurementInteger(days)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatProcurementInteger(run.lineCount ?? run.totalLineCount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatProcurementInteger(
                        run.purchaseLineCount ?? run.purchaseLinesCount,
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatProcurementDateTime(run.calculatedAt ?? run.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <ProcurementPill tone={status.tone}>{status.label}</ProcurementPill>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <AppButton
                          className="h-8 px-3"
                          variant="secondary"
                          onClick={() => onOpen(run)}
                        >
                          Open snapshot
                        </AppButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ProcurementPagination
        disabled={loading}
        pageNumber={pagination.pageNumber || page}
        pageSize={pagination.pageSize || pageSize}
        totalCount={pagination.totalCount}
        totalPages={pagination.totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </ProcurementSectionCard>
  );
};

const AdjustmentModal = ({ line, onClose, onSaved, runId }) => {
  const [finalQuantity, setFinalQuantity] = useState(
    String(line?.finalQuantity ?? line?.calculatedSuggestedQuantity ?? "0"),
  );
  const [reason, setReason] = useState(line?.adjustmentReason ?? "");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const calculated = toNumberOrNull(line?.calculatedSuggestedQuantity) ?? 0;
  const final = toNumberOrNull(finalQuantity);
  const differs = final !== null && final !== calculated;
  const delta = final === null ? null : final - calculated;

  const submit = async () => {
    const validation = {};
    if (final === null || final < 0) {
      validation.finalQuantity = "Final quantity must be zero or greater.";
    } else if (!hasDecimalPrecision(finalQuantity)) {
      validation.finalQuantity = "Use no more than 6 decimal places.";
    }
    if (differs && !reason.trim()) {
      validation.adjustmentReason =
        "Explain why final quantity differs from the calculated suggestion.";
    }
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const response = await planningService.adjustLine(
        runId,
        getRecordId(line, ["planningLineId"]),
        {
          finalQuantity: final,
          adjustmentReason: differs ? reason.trim() : null,
        },
      );
      toast.success(response.message || "Planning line adjusted.");
      await onSaved();
      onClose();
    } catch (error) {
      const status = getApiStatus(error);
      if (status === 409) {
        setErrors({
          form: getProcurementError(
            error,
            "This run was finalized and can no longer be adjusted.",
          ),
        });
      } else if ([400, 422].includes(status)) {
        setErrors({ ...getFieldErrorMap(error), form: getProcurementError(error) });
      } else {
        setErrors({ form: getProcurementError(error, "Unable to adjust this line.") });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      isBusy={saving}
      isOpen={Boolean(line)}
      maxWidth="max-w-xl"
      title="Adjust draft planning line"
      onClose={saving ? undefined : onClose}
    >
      {line && (
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              {getItemCode(line.item) || line.itemCode || line.materialCode}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {getItemName(line.item) || line.itemName || line.materialName}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Calculated</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {formatProcurementDecimal(calculated)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Final</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {formatProcurementDecimal(final)}
              </p>
            </div>
            <div className={`rounded-xl border p-3 ${differs ? "border-amber-200 bg-amber-50" : "border-slate-200"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Delta</p>
              <p className={`mt-1 text-lg font-semibold tabular-nums ${delta && delta !== 0 ? "text-amber-800" : "text-slate-900"}`}>
                {delta === null ? "-" : formatProcurementDecimal(delta)}
              </p>
            </div>
          </div>
          <AppInput
            error={errors.finalQuantity}
            label="Final quantity"
            min="0"
            required
            step="any"
            type="number"
            value={finalQuantity}
            onChange={(event) => {
              setFinalQuantity(event.target.value);
              setErrors((current) => ({ ...current, finalQuantity: "" }));
            }}
          />
          <div>
            <label className="text-xs font-semibold text-slate-700" htmlFor="adjustment-reason">
              Adjustment reason {differs && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id="adjustment-reason"
              rows={3}
              disabled={!differs}
              placeholder={
                differs
                  ? "Required whenever the final quantity differs"
                  : "Cleared automatically when final equals calculated"
              }
              value={differs ? reason : ""}
              onChange={(event) => setReason(event.target.value)}
              className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-50 ${errors.adjustmentReason ? "border-red-400" : "border-slate-200"}`}
            />
            {errors.adjustmentReason && (
              <p className="mt-1 text-xs text-red-600">{errors.adjustmentReason}</p>
            )}
          </div>
          <ProcurementInlineError message={errors.form} title="Line conflict" />
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <AppButton variant="secondary" onClick={onClose}>Cancel</AppButton>
        <AppButton isLoading={saving} loadingText="Saving…" onClick={submit}>
          <Save className="h-4 w-4" />Save adjustment
        </AppButton>
      </div>
    </AppModal>
  );
};

const RunDetail = ({
  canApprove,
  canEdit,
  canExport,
  linesData,
  linesError,
  linesLoading,
  onBack,
  onFinalize,
  onLoadLines,
  onOpenAdjustment,
  onUpdateLineFilters,
  run,
  lineFilters,
  finalizeError,
  finalizing,
}) => {
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const finalized = isFinalizedRun(run);
  const runStatus = runStatusMeta(run);
  const lines = getRunLines(linesData);
  const pagination = getPagination(linesData, lines.length);
  const days =
    Number(run.numberOfDays) || getInclusiveDayCount(run.fromDate, run.toDate);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AppButton variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />All planning runs
        </AppButton>
        <div className="flex flex-wrap gap-2">
          {canExport && (
          <AppButton
            isLoading={exporting}
            loadingText="Exporting…"
            variant="secondary"
              onClick={async () => {
                setExporting(true);
                setExportError("");
                try {
                  await planningService.exportRun(getRecordId(run, ["planningRunId"]));
                } catch (error) {
                  const message = getProcurementError(
                    error,
                    "Unable to export this run.",
                  );
                  setExportError(message);
                  if (getApiStatus(error) !== 409) toast.error(message);
                } finally {
                  setExporting(false);
                }
              }}
            >
              <Download className="h-4 w-4" />Export XLSX
            </AppButton>
          )}
          {canApprove && !finalized && (
            <AppButton isLoading={finalizing} loadingText="Finalizing…" onClick={onFinalize}>
              <ShieldCheck className="h-4 w-4" />Finalize run
            </AppButton>
          )}
        </div>
      </div>
      <ProcurementInlineError message={exportError} title="Export could not be downloaded" />
      <ProcurementInlineError message={finalizeError} title="Run conflict" />
      <ProcurementSectionCard>
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(120px,1fr))]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">
                {run.runNumber ?? getRecordId(run, ["planningRunId"])}
              </h2>
              <ProcurementPill tone={runStatus.tone}>{runStatus.label}</ProcurementPill>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Snapshot range: {formatProcurementDate(run.fromDate)} – {formatProcurementDate(run.toDate)}
            </p>
            {run.notes && <p className="mt-1 text-xs leading-5 text-slate-500">{run.notes}</p>}
          </div>
          {[
            ["Days", formatProcurementInteger(days)],
            ["Lines", formatProcurementInteger(run.lineCount ?? run.totalLineCount)],
            ["Calculated", formatProcurementDateTime(run.calculatedAt ?? run.createdAt)],
            ["Calculation version", run.calculationVersion ?? "-"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 p-4">
          <InventoryBasisNote message={run.inventoryBasis || undefined} />
        </div>
        {finalized && (
          <div className="flex items-start gap-3 border-t border-emerald-100 bg-emerald-50 px-5 py-3 text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs leading-5"><strong>This run is finalized.</strong> Its snapshot and every line are immutable.</p>
          </div>
        )}
      </ProcurementSectionCard>
      <ProcurementSectionCard title="Snapshot lines" description="Values below are preserved from this planning run and are never recalculated in history.">
        <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
          <div className="relative">
            <AppInput
              label="Search materials"
              placeholder="Item code or material name"
              value={lineFilters.search}
              onChange={(event) => onUpdateLineFilters({ search: event.target.value })}
            />
            <Search className="pointer-events-none absolute bottom-3.5 right-3 h-4 w-4 text-slate-400" />
          </div>
          <AppSelect
            label="Purchase lines"
            options={[{ label: "All lines", value: "all" }, { label: "Purchase needed", value: "true" }]}
            value={lineFilters.purchaseOnly}
            onChange={(purchaseOnly) => onUpdateLineFilters({ purchaseOnly })}
          />
          <AppSelect
            label="Warnings"
            options={[{ label: "All lines", value: "all" }, { label: "Has warnings", value: "true" }]}
            value={lineFilters.hasWarnings}
            onChange={(hasWarnings) => onUpdateLineFilters({ hasWarnings })}
          />
          <AppSelect
            label="Manual planning"
            options={[{ label: "All lines", value: "all" }, { label: "Manual only", value: "true" }]}
            value={lineFilters.manualPlanning}
            onChange={(manualPlanning) => onUpdateLineFilters({ manualPlanning })}
          />
        </div>
        {linesLoading ? <ProcurementLoadingRows columns={8} rows={6} /> : linesError ? <ProcurementErrorState error={linesError} onRetry={onLoadLines} /> : lines.length === 0 ? <ProcurementEmptyState title="No snapshot lines match the filters" /> : (
          <div className="max-h-[60vh] overflow-auto"><table className="min-w-[1180px] w-full text-left"><thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="sticky left-0 z-20 min-w-64 border-b border-r border-slate-200 bg-slate-50 px-4 py-3">Material</th><th className="border-b border-slate-200 px-4 py-3 text-right">Suggested</th><th className="border-b border-slate-200 px-4 py-3 text-right">Final</th><th className="border-b border-slate-200 px-4 py-3 text-right">Delta</th><th className="border-b border-slate-200 px-4 py-3 text-right">Shortage</th><th className="border-b border-slate-200 px-4 py-3 text-right">Stock</th><th className="border-b border-slate-200 px-4 py-3">Warnings / flags</th><th className="border-b border-slate-200 px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100 text-sm">{lines.map((line, index) => { const suggested = toNumberOrNull(line.calculatedSuggestedQuantity) ?? 0; const final = toNumberOrNull(line.finalQuantity) ?? suggested; const delta = final - suggested; const warnings = Array.isArray(line.warnings) ? line.warnings : []; const manual = getProcurementBoolean(line.manualPlanning); return <tr key={getRecordId(line, ["planningLineId"]) ?? index} className="group"><td className="sticky left-0 z-10 border-r border-slate-100 bg-white px-4 py-3 group-hover:bg-slate-50"><p className="font-semibold text-slate-900">{getItemCode(line.item) || line.itemCode || line.materialCode}</p><p className="mt-0.5 text-xs text-slate-500">{getItemName(line.item) || line.itemName || line.materialName} · {line.unitName ?? line.unitCode ?? "-"}</p></td><td className="px-4 py-3 text-right font-medium tabular-nums">{formatProcurementDecimal(suggested)}</td><td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{formatProcurementDecimal(final)}</td><td className={`px-4 py-3 text-right font-semibold tabular-nums ${delta === 0 ? "text-slate-500" : "text-amber-700"}`}>{formatProcurementDecimal(delta)}</td><td className={`px-4 py-3 text-right tabular-nums ${Number(line.shortage) > 0 ? "bg-red-50 font-semibold text-red-700" : ""}`}>{formatProcurementDecimal(line.shortage)}</td><td className="px-4 py-3 text-right tabular-nums">{formatProcurementDecimal(line.physicalStock)}</td><td className="px-4 py-3"><div className="flex max-w-64 flex-wrap gap-1">{warnings.length > 0 && <ProcurementPill tone="amber"><AlertTriangle className="h-3 w-3" />{warnings.length} warning{warnings.length === 1 ? "" : "s"}</ProcurementPill>}{manual && <ProcurementPill tone="violet">Manual</ProcurementPill>}{final > 0 && <ProcurementPill tone="emerald">Purchase needed</ProcurementPill>}</div>{line.adjustmentReason && <p className="mt-1 max-w-52 truncate text-xs text-slate-500" title={line.adjustmentReason}>Reason: {line.adjustmentReason}</p>}</td><td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-0.5">{canEdit && !finalized ? <AppButton className="h-8 px-3" variant="secondary" onClick={() => onOpenAdjustment(line)}><Pencil className="h-4 w-4" />Adjust</AppButton> : <span className="text-xs text-slate-400">{finalized ? "Locked" : "Read only"}</span>}</div></td></tr>; })}</tbody></table></div>
        )}
        <ProcurementPagination disabled={linesLoading} {...pagination} onPageChange={(value) => onUpdateLineFilters({ page: value })} onPageSizeChange={(value) => onUpdateLineFilters({ page: 1, pageSize: Number(value) })} />
      </ProcurementSectionCard>
    </div>
  );
};

const PlanningHistoryPage = () => {
  const initialRange = useMemo(() => getDefaultProcurementRange(), []);
  const [filters, setFilters] = useState({ ...initialRange, status: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [run, setRun] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [lineData, setLineData] = useState(null);
  const [linesLoading, setLinesLoading] = useState(false);
  const [linesError, setLinesError] = useState(null);
  const [lineFilters, setLineFilters] = useState({
    hasWarnings: "all",
    manualPlanning: "all",
    page: 1,
    pageSize: 20,
    purchaseOnly: "all",
    search: "",
  });
  const [adjustLine, setAdjustLine] = useState(null);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState("");
  const {
    beginRequest: beginRunsRequest,
    isLatestRequest: isLatestRunsRequest,
  } = useLatestRequest();
  const {
    beginRequest: beginLinesRequest,
    isLatestRequest: isLatestLinesRequest,
  } = useLatestRequest();
  const {
    beginRequest: beginDetailRequest,
    isLatestRequest: isLatestDetailRequest,
  } = useLatestRequest();
  const capabilities = useProcurementCapabilities({
    label: "ProcurementPlanning.PlanningHistory",
    resource: "ProcurementPlanning.PlanningHistory",
    route: "/procurement/planning-history",
  });

  const loadRuns = useCallback(async () => {
    const requestId = beginRunsRequest();
    const rangeError = validateDateRange(filters.fromDate, filters.toDate);
    if (rangeError) {
      setError(rangeError);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await planningService.listRuns({
        FromDate: filters.fromDate,
        ToDate: filters.toDate,
        Status: filters.status || undefined,
        PageNumber: page,
        PageSize: pageSize,
      });
      if (isLatestRunsRequest(requestId)) {
        setData(response.data);
      }
    } catch (loadError) {
      if (isLatestRunsRequest(requestId)) {
        setError(loadError);
      }
    } finally {
      if (isLatestRunsRequest(requestId)) {
        setLoading(false);
      }
    }
  }, [beginRunsRequest, filters, isLatestRunsRequest, page, pageSize]);

  const loadLines = useCallback(async () => {
    if (!run) return;
    const requestId = beginLinesRequest();
    setLinesLoading(true);
    setLinesError(null);
    try {
      const response = await planningService.getRunLines(
        getRecordId(run, ["planningRunId"]),
        {
          Search: lineFilters.search.trim() || undefined,
          PurchaseOnly:
            lineFilters.purchaseOnly === "all"
              ? undefined
              : lineFilters.purchaseOnly === "true",
          HasWarnings:
            lineFilters.hasWarnings === "all"
              ? undefined
              : lineFilters.hasWarnings === "true",
          ManualPlanning:
            lineFilters.manualPlanning === "all"
              ? undefined
              : lineFilters.manualPlanning === "true",
          PageNumber: lineFilters.page,
          PageSize: lineFilters.pageSize,
        },
      );
      if (isLatestLinesRequest(requestId)) {
        setLineData(response.data);
      }
    } catch (loadError) {
      if (isLatestLinesRequest(requestId)) {
        setLinesError(loadError);
      }
    } finally {
      if (isLatestLinesRequest(requestId)) {
        setLinesLoading(false);
      }
    }
  }, [beginLinesRequest, isLatestLinesRequest, lineFilters, run]);

  useEffect(() => {
    beginRunsRequest();
    const timeout = window.setTimeout(() => void loadRuns(), 250);
    return () => window.clearTimeout(timeout);
  }, [beginRunsRequest, loadRuns]);

  useEffect(() => {
    if (!run) return undefined;
    beginLinesRequest();
    const timeout = window.setTimeout(() => void loadLines(), 250);
    return () => window.clearTimeout(timeout);
  }, [beginLinesRequest, loadLines, run]);

  const openRun = async (summary) => {
    const requestId = beginDetailRequest();
    setDetailLoading(true);
    setFinalizeError("");
    try {
      const response = await planningService.getRun(
        getRecordId(summary, ["planningRunId"]),
      );
      if (isLatestDetailRequest(requestId)) {
        setRun(response.data);
        setLineFilters({
          hasWarnings: "all",
          manualPlanning: "all",
          page: 1,
          pageSize: 20,
          purchaseOnly: "all",
          search: "",
        });
      }
    } catch (openError) {
      if (!isLatestDetailRequest(requestId)) return;
      if (getApiStatus(openError) === 404) {
        toast.error("This planning run no longer exists.");
      } else {
        toast.error(getProcurementError(openError, "Unable to open this run."));
      }
    } finally {
      if (isLatestDetailRequest(requestId)) setDetailLoading(false);
    }
  };

  const refreshCurrentRun = async () => {
    if (!run) return;
    const requestId = beginDetailRequest();
    try {
      const response = await planningService.getRun(
        getRecordId(run, ["planningRunId"]),
      );
      if (isLatestDetailRequest(requestId)) {
        setRun(response.data);
        await loadLines();
        await loadRuns();
      }
    } catch (refreshError) {
      if (isLatestDetailRequest(requestId)) {
        toast.error(getProcurementError(refreshError, "Unable to refresh the run."));
      }
    }
  };

  const updateLineFilters = (patch) => {
    setLineFilters((current) => ({
      ...current,
      ...patch,
      page: Object.hasOwn(patch, "page") ? patch.page : 1,
    }));
  };

  const finalize = async () => {
    if (!run) return;
    setFinalizing(true);
    setFinalizeError("");
    try {
      const response = await planningService.finalize(
        getRecordId(run, ["planningRunId"]),
      );
      toast.success(response.message || "Planning run finalized.");
      setFinalizeOpen(false);
      await refreshCurrentRun();
    } catch (finalizeRequestError) {
      const message = getProcurementError(
        finalizeRequestError,
        "Unable to finalize this planning run.",
      );
      setFinalizeError(message);
      if (getApiStatus(finalizeRequestError) !== 409) {
        toast.error(message);
      }
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={<><History className="h-3.5 w-3.5" />Procurement Planning</>}
        title="Planning History"
        description="Open retained plan snapshots, make traceable draft adjustments, finalize for immutability, and export the approved result."
      />
      {detailLoading ? (
        <ProcurementSectionCard title="Opening snapshot">
          <ProcurementLoadingRows columns={5} rows={6} />
        </ProcurementSectionCard>
      ) : run ? (
        <RunDetail
          canApprove={capabilities.canApprove}
          canEdit={capabilities.canEdit}
          canExport={capabilities.canExport}
          finalizeError={finalizeError}
          finalizing={finalizing}
          lineFilters={lineFilters}
          linesData={lineData}
          linesError={linesError}
          linesLoading={linesLoading}
          run={run}
          onBack={() => {
            beginDetailRequest();
            beginLinesRequest();
            setRun(null);
            setLineData(null);
            setFinalizeError("");
          }}
          onFinalize={() => {
            setFinalizeError("");
            setFinalizeOpen(true);
          }}
          onLoadLines={loadLines}
          onOpenAdjustment={setAdjustLine}
          onUpdateLineFilters={updateLineFilters}
        />
      ) : (
        <RunList
          data={data}
          error={error}
          filters={filters}
          loading={loading}
          page={page}
          pageSize={pageSize}
          onChangeFilters={(patch) => {
            setFilters((current) => ({ ...current, ...patch }));
            setPage(1);
          }}
          onOpen={openRun}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(Number(value));
            setPage(1);
          }}
          onRetry={loadRuns}
        />
      )}
      <AdjustmentModal
        key={getRecordId(adjustLine, ["planningLineId"]) ?? "new-adjustment"}
        line={adjustLine}
        runId={getRecordId(run, ["planningRunId"])}
        onClose={() => setAdjustLine(null)}
        onSaved={refreshCurrentRun}
      />
      <AppModal
        isOpen={finalizeOpen}
        title="Finalize planning run?"
        onClose={() => !finalizing && setFinalizeOpen(false)}
      >
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-sm font-semibold">This action is immutable</p>
            <p className="mt-0.5 text-xs leading-5">
              Finalizing locks every snapshot value and disables all line adjustments. This module records a procurement plan; it does not create a purchase order.
            </p>
          </div>
        </div>
        <ProcurementInlineError message={finalizeError} title="Run conflict" />
        <div className="mt-5 flex justify-end gap-2">
          <AppButton variant="secondary" onClick={() => setFinalizeOpen(false)}>Keep draft</AppButton>
          <AppButton isLoading={finalizing} loadingText="Finalizing…" onClick={finalize}>
            <ShieldCheck className="h-4 w-4" />Finalize snapshot
          </AppButton>
        </div>
      </AppModal>
    </section>
  );
};

export default PlanningHistoryPage;
