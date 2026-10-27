import { compareDecimal, subtractDecimal } from "../../../utils/productionValues";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileClock,
  FileCheck2,
  History,
  Info,
  Pencil,
  Plus,
  RotateCw,
  Save,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import PageHeader from "../../../components/common/PageHeader";
import {
  isCancelledPlanningRunStatus,
  isFinalizedPlanningRunStatus,
  PLANNING_RUN_STATUS_LABELS,
  PLANNING_RUN_STATUS_OPTIONS,
} from "../../../constants/procurementEnums";
import { planningService } from "../../../services/procurement/planningService";
import {
  InventoryBasisNote,
  ProcurementDateRangeFields,
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
  formatProcurementQuantity,
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
import { ProcurementPurchasePanel } from "../../manufacturing/integrations/ProcurementPurchasePanel";
import ProcurementStatCards from "../ProcurementStatCards";
import ProcurementTable, {
  PROCUREMENT_ROW_ACTION_CLASS,
  PROCUREMENT_TABLE_HEADER_CLASS,
} from "../ProcurementTable";

const getRunStatus = (run) => run?.status ?? run?.planningRunStatus;

const isFinalizedRun = (run) => {
  const status = getRunStatus(run);

  return (
    isFinalizedPlanningRunStatus(status) ||
    String(status).toLowerCase() === "finalized"
  );
};

const isCancelledRun = (run) => {
  const status = getRunStatus(run);

  return (
    isCancelledPlanningRunStatus(status) ||
    String(run?.statusName ?? status).toLowerCase() === "cancelled" ||
    Boolean(run?.cancelledAtUtc ?? run?.cancelledAt)
  );
};

const runStatusMeta = (run) => {
  const finalized = isFinalizedRun(run);
  const cancelled = isCancelledRun(run);

  return {
    label:
      run?.statusName ??
      PLANNING_RUN_STATUS_LABELS[getRunStatus(run)] ??
      (cancelled ? "Cancelled" : finalized ? "Finalized" : "Draft"),
    tone: cancelled ? "red" : finalized ? "emerald" : "amber",
  };
};

const getRunLines = (payload) => getCollection(payload, ["planningLines", "lines"]);

const RunList = ({
  canCancel,
  data,
  error,
  filters,
  loading,
  onChangeFilters,
  onCancel,
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
  const defaultRange = useMemo(() => getDefaultProcurementRange(), []);
  const activeFilterCount = [
    filters.fromDate !== defaultRange.fromDate ||
      filters.toDate !== defaultRange.toDate,
    Boolean(filters.status),
  ].filter(Boolean).length;

  return (
    <ProcurementSectionCard
      title="Saved plans"
      description="Each saved plan is a versioned snapshot. Opening one never recalculates its material values."
    >
      <div className="m-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <ProcurementDateRangeFields
          fromDate={filters.fromDate}
          toDate={filters.toDate}
          error={rangeError}
          onChange={(patch) => onChangeFilters(patch)}
        />
        <AppSelect
          label="Plan status"
          options={[{ label: "All statuses", value: "" }, ...PLANNING_RUN_STATUS_OPTIONS]}
          value={filters.status}
          onChange={(status) => onChangeFilters({ status })}
        />
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500">{activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}</p>
          {activeFilterCount > 0 && <AppButton variant="ghost" onClick={() => onChangeFilters({ ...defaultRange, status: "" })}>Clear</AppButton>}
        </div>
      </div>
      {error ? (
        <ProcurementErrorState error={error} onRetry={onRetry} />
      ) : (
        <ProcurementTable
          columnCount={9}
          emptyIcon={FileClock}
          emptyHint="Saved draft, finalized, and cancelled plan snapshots will appear here."
          emptyTitle={!loading && runs.length === 0 ? "No plans yet" : undefined}
          head={<><th className={PROCUREMENT_TABLE_HEADER_CLASS}>#</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Plan</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Demand range</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Days</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Lines</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Purchase lines</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Calculated</th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Status</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Action</th></>}
          loading={loading}
          minWidth="min-w-[1000px]"
        >
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
                        <AppTooltip label="Open plan">
                          <button type="button" aria-label="Open plan" className={PROCUREMENT_ROW_ACTION_CLASS} onClick={() => onOpen(run)}>
                            <Eye className="h-4 w-4" />
                          </button>
                        </AppTooltip>
                        {canCancel && !isFinalizedRun(run) && !isCancelledRun(run) ? (
                          <AppTooltip label="Cancel plan">
                            <button
                              type="button"
                              aria-label="Cancel plan"
                              className={`${PROCUREMENT_ROW_ACTION_CLASS} hover:bg-red-50 hover:text-red-600`}
                              onClick={() => onCancel(run)}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </AppTooltip>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
        </ProcurementTable>
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

  const calculated = line?.calculatedSuggestedQuantity ?? "0";
  const final = toNumberOrNull(finalQuantity);
  const differs = final !== null && compareDecimal(finalQuantity, calculated) !== 0;
  const delta = final === null ? null : subtractDecimal(finalQuantity, calculated);

  const submit = async () => {
    const validation = {};
    if (final === null || final < 0) {
      validation.finalQuantity = "To order must be zero or greater.";
    } else if (!hasDecimalPrecision(finalQuantity)) {
      validation.finalQuantity = "Use no more than 6 decimal places.";
    }
    if (differs && !reason.trim()) {
      validation.adjustmentReason =
        "Explain why To order differs from the system suggestion.";
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
          finalQuantity,
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
            "This plan was finalized and can no longer be adjusted.",
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
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">System suggestion</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {formatProcurementQuantity(calculated)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">To order</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {formatProcurementQuantity(finalQuantity)}
              </p>
            </div>
            <div className={`rounded-xl border p-3 ${differs ? "border-amber-200 bg-amber-50" : "border-slate-200"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Delta</p>
              <p className={`mt-1 text-lg font-semibold tabular-nums ${delta && delta !== 0 ? "text-amber-800" : "text-slate-900"}`}>
                {delta === null ? "-" : formatProcurementQuantity(delta)}
              </p>
            </div>
          </div>
          <AppInput
            error={errors.finalQuantity}
            label="To order"
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
                  ? "Required whenever To order differs"
                  : "Cleared automatically when To order matches the system suggestion"
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
  canCancel,
  canEdit,
  linesData,
  linesError,
  linesLoading,
  onBack,
  onCancel,
  onFinalize,
  onLoadLines,
  onOpenAdjustment,
  onUpdateLineFilters,
  run,
  lineFilters,
  finalizeError,
  finalizing,
}) => {
  const finalized = isFinalizedRun(run);
  const cancelled = isCancelledRun(run);
  const immutable = finalized || cancelled;
  const runStatus = runStatusMeta(run);
  const lines = getRunLines(linesData);
  const pagination = getPagination(linesData, lines.length);
  const days =
    Number(run.numberOfDays) || getInclusiveDayCount(run.fromDate, run.toDate);
  const activeLineFilterCount = [
    Boolean(lineFilters.search.trim()),
    lineFilters.purchaseOnly !== "all",
    lineFilters.hasWarnings !== "all",
    lineFilters.manualPlanning !== "all",
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AppButton variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />All plans
        </AppButton>
        <div className="flex flex-wrap gap-2">
          {canCancel && !immutable ? (
            <AppButton variant="danger" onClick={onCancel}>
              <XCircle className="h-4 w-4" />Cancel plan
            </AppButton>
          ) : null}
          {canApprove && !immutable && (
            <AppButton isLoading={finalizing} loadingText="Finalizing…" onClick={onFinalize}>
              <ShieldCheck className="h-4 w-4" />Finalize plan
            </AppButton>
          )}
        </div>
      </div>
      <ProcurementInlineError message={finalizeError} title="Plan conflict" />
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
            ["Generated", formatProcurementDateTime(run.calculatedAt ?? run.createdAt)],
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
        {immutable && (
          <div className="flex items-start gap-3 border-t border-emerald-100 bg-emerald-50 px-5 py-3 text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs leading-5"><strong>This plan is {cancelled ? "cancelled" : "finalized"}.</strong> Its snapshot and every line are immutable.</p>
          </div>
        )}
      </ProcurementSectionCard>
      {finalized && !linesLoading && !linesError && <ProcurementPurchasePanel key={run.id} run={run} lines={lines} onSaved={onLoadLines} />}
      <ProcurementSectionCard title="Snapshot lines" description="Values below are preserved from this plan and are never recalculated in history.">
        <div className="m-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
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
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">{activeLineFilterCount} active filter{activeLineFilterCount === 1 ? "" : "s"}</p>
            {activeLineFilterCount > 0 && <AppButton variant="ghost" onClick={() => onUpdateLineFilters({ hasWarnings: "all", manualPlanning: "all", page: 1, purchaseOnly: "all", search: "" })}>Clear</AppButton>}
          </div>
        </div>
        {linesError ? <ProcurementErrorState error={linesError} onRetry={onLoadLines} /> : (
          <ProcurementTable
            columnCount={10}
            emptyHint="Clear line filters or open another saved plan."
            emptyTitle={!linesLoading && lines.length === 0 ? "No snapshot lines match the filters" : undefined}
            head={<><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} sticky left-0 z-20 min-w-64 border-r bg-slate-50`}>Material</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>System suggestion</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>To order</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Delta</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Shortfall</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}><span className="inline-flex items-center gap-1">Physical stock<AppTooltip label="Global Items.CurrentStock supplied by the saved planning snapshot."><button type="button" className="text-slate-400 hover:text-slate-700"><Info className="h-3.5 w-3.5" /></button></AppTooltip></span></th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Inbound</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}><span className="inline-flex items-center gap-1">Projected available<AppTooltip label="Global stock + latest valid inbound snapshot. Not warehouse-level allocation."><button type="button" className="text-slate-400 hover:text-slate-700"><Info className="h-3.5 w-3.5" /></button></AppTooltip></span></th><th className={PROCUREMENT_TABLE_HEADER_CLASS}>Warnings / flags</th><th className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Action</th></>}
            headClassName="sticky top-0 z-10"
            loading={linesLoading}
            minWidth="min-w-[1460px]"
            scrollerClassName="max-h-[60vh]"
            rows={5}
          >
            {lines.map((line, index) => { const suggested = line.calculatedSuggestedQuantity ?? "0"; const final = line.finalQuantity ?? suggested; const delta = subtractDecimal(final, suggested); const warnings = Array.isArray(line.warnings) ? line.warnings : []; const manual = getProcurementBoolean(line.manualPlanning); return <tr key={getRecordId(line, ["planningLineId"]) ?? index} className="group"><td className="sticky left-0 z-10 border-r bg-white group-hover:bg-slate-50"><p className="font-semibold text-slate-900">{getItemCode(line.item) || line.itemCode || line.materialCode}</p><p className="mt-0.5 text-xs text-slate-500">{getItemName(line.item) || line.itemName || line.materialName} · {line.unitName ?? line.unitCode ?? "-"}</p></td><td className="text-right font-medium tabular-nums">{formatProcurementQuantity(suggested)}</td><td className="text-right font-semibold tabular-nums text-slate-900">{formatProcurementQuantity(final)}</td><td className={`text-right font-semibold tabular-nums ${delta === "0" ? "text-slate-500" : "text-amber-700"}`}>{formatProcurementQuantity(delta)}</td><td className={`text-right tabular-nums ${Number(line.shortage) > 0 ? "bg-red-50 font-semibold text-red-700" : ""}`}>{formatProcurementQuantity(line.shortage)}</td><td className="text-right tabular-nums">{formatProcurementQuantity(line.physicalStock)}</td><td className="text-right tabular-nums">{formatProcurementQuantity(line.inboundStock)}</td><td className="text-right font-medium tabular-nums text-slate-900">{formatProcurementQuantity(line.projectedAvailableStock)}</td><td><div className="flex max-w-64 flex-wrap gap-1">{warnings.length > 0 && <ProcurementPill tone="amber"><AlertTriangle className="h-3 w-3" />{warnings.length} warning{warnings.length === 1 ? "" : "s"}</ProcurementPill>}{manual && <ProcurementPill tone="violet">Manual</ProcurementPill>}{final > 0 && <ProcurementPill tone="emerald">Purchase needed</ProcurementPill>}</div>{line.adjustmentReason && <p className="mt-1 max-w-52 truncate text-xs text-slate-500" title={line.adjustmentReason}>Reason: {line.adjustmentReason}</p>}</td><td><div className="flex items-center justify-end gap-0.5">{canEdit && !immutable ? <AppTooltip label="Adjust plan line"><button type="button" aria-label="Adjust plan line" className={PROCUREMENT_ROW_ACTION_CLASS} onClick={() => onOpenAdjustment(line)}><Pencil className="h-4 w-4" /></button></AppTooltip> : <span className="text-xs text-slate-400">{immutable ? "Locked" : "Read only"}</span>}</div></td></tr>; })}
          </ProcurementTable>
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
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
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
  const listedRuns = getCollection(data, ["runs", "planningRuns"]);
  const totalPlans = Number(data?.totalCount) || listedRuns.length;
  const draftPlans =
    data?.draftCount ??
    data?.summary?.draftCount ??
    listedRuns.filter(
      (listedRun) =>
        !isFinalizedRun(listedRun) && !isCancelledRun(listedRun),
    ).length;
  const finalizedPlans =
    data?.finalizedCount ??
    data?.summary?.finalizedCount ??
    listedRuns.filter(isFinalizedRun).length;

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
    if (!run) return false;
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
        return true;
      }
      return false;
    } catch (loadError) {
      if (isLatestLinesRequest(requestId)) {
        setLinesError(loadError);
      }
      return false;
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
        toast.error("This saved plan no longer exists.");
      } else {
        toast.error(getProcurementError(openError, "Unable to open this plan."));
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
        toast.error(getProcurementError(refreshError, "Unable to refresh the plan."));
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
      toast.success(response.message || "Plan finalized.");
      setFinalizeOpen(false);
      await refreshCurrentRun();
    } catch (finalizeRequestError) {
      const message = getProcurementError(
        finalizeRequestError,
        "Unable to finalize this plan.",
      );
      setFinalizeError(message);
      if (getApiStatus(finalizeRequestError) !== 409) {
        toast.error(message);
      }
    } finally {
      setFinalizing(false);
    }
  };

  const cancelPlan = async () => {
    const reason = cancelReason.trim();

    if (!cancelTarget || !reason) {
      setCancelError("A cancellation reason is required.");
      return;
    }

    setCancelling(true);
    setCancelError("");

    try {
      const response = await planningService.cancel(
        getRecordId(cancelTarget, ["planningRunId"]),
        reason,
      );
      toast.success(response.message || "Plan cancelled.");
      const cancelledCurrentRun =
        String(getRecordId(run, ["planningRunId"])) ===
        String(getRecordId(cancelTarget, ["planningRunId"]));
      setCancelTarget(null);
      setCancelReason("");

      if (cancelledCurrentRun) {
        await refreshCurrentRun();
      } else {
        await loadRuns();
      }
    } catch (error) {
      const message = getProcurementError(
        error,
        "Unable to cancel this plan.",
      );
      setCancelError(message);
      toast.error(message);
    } finally {
      setCancelling(false);
    }
  };

  const exportCurrentPlan = async () => {
    if (!run) return;
    setExporting(true);
    setExportError("");
    try {
      await planningService.exportRun(
        getRecordId(run, ["planningRunId"]),
      );
    } catch (error) {
      const message = getProcurementError(
        error,
        "Unable to export this plan.",
      );
      setExportError(message);
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };
  const exportButton = (
    <AppButton
      disabled={!run}
      isLoading={exporting}
      loadingText="Exporting…"
      variant="secondary"
      onClick={exportCurrentPlan}
    >
      <Download className="h-4 w-4" />
      Export
    </AppButton>
  );

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={<><History className="h-3.5 w-3.5" />Procurement Planning</>}
        title="Plans"
        description="Open saved plan snapshots, make traceable draft adjustments, finalize for immutability, and export the approved result."
        actions={
          <>
            <AppButton
              disabled={run ? detailLoading || linesLoading : loading}
              variant="secondary"
              onClick={() => run ? void refreshCurrentRun() : void loadRuns()}
            >
              <RotateCw className={`h-4 w-4 ${run ? detailLoading || linesLoading ? "animate-spin" : "" : loading ? "animate-spin" : ""}`} />
              Refresh
            </AppButton>
            {capabilities.canExport && (
              run
                ? exportButton
                : (
                    <AppTooltip label="Open a plan to enable export">
                      {exportButton}
                    </AppTooltip>
                  )
            )}
            <Link to="/procurement/generate-plan"><AppButton><Plus className="h-4 w-4" />New plan</AppButton></Link>
          </>
        }
      />
      <ProcurementStatCards
        cards={[
          loading || data !== null
            ? { icon: History, label: "Total plans", value: totalPlans }
            : null,
          loading || data !== null
            ? { icon: FileClock, label: "Drafts", value: draftPlans, hint: data?.draftCount === undefined ? "On this page" : undefined }
            : null,
          loading || data !== null
            ? { icon: FileCheck2, label: "Finalized", value: finalizedPlans, hint: data?.finalizedCount === undefined ? "On this page" : undefined }
            : null,
        ]}
        loading={loading && data === null}
      />
      <ProcurementInlineError message={exportError} title="Export could not be downloaded" />
      {detailLoading ? (
        <ProcurementSectionCard title="Opening snapshot">
          <ProcurementLoadingRows columns={5} rows={6} />
        </ProcurementSectionCard>
      ) : run ? (
        <RunDetail
          canApprove={capabilities.canApprove}
          canCancel={capabilities.canDelete}
          canEdit={capabilities.canEdit}
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
          onCancel={() => {
            setCancelError("");
            setCancelReason("");
            setCancelTarget(run);
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
          canCancel={capabilities.canDelete}
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
          onCancel={(target) => {
            setCancelError("");
            setCancelReason("");
            setCancelTarget(target);
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
        title="Finalize plan?"
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
        <ProcurementInlineError message={finalizeError} title="Plan conflict" />
        <div className="mt-5 flex justify-end gap-2">
          <AppButton variant="secondary" onClick={() => setFinalizeOpen(false)}>Keep draft</AppButton>
          <AppButton isLoading={finalizing} loadingText="Finalizing…" onClick={finalize}>
            <ShieldCheck className="h-4 w-4" />Finalize snapshot
          </AppButton>
        </div>
      </AppModal>
      <AppModal
        isBusy={cancelling}
        isOpen={Boolean(cancelTarget)}
        title="Cancel plan"
        onClose={cancelling ? undefined : () => setCancelTarget(null)}
      >
        <p className="text-sm leading-6 text-slate-600">
          This records an auditable cancellation. It does not delete the plan.
        </p>
        <div className="mt-4">
          <AppInput
            error={cancelError}
            label="Cancellation reason"
            required
            value={cancelReason}
            onChange={(event) => {
              setCancelReason(event.target.value);
              setCancelError("");
            }}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <AppButton
            variant="secondary"
            onClick={() => setCancelTarget(null)}
          >
            Keep plan
          </AppButton>
          {!cancelReason.trim() ? (
            <AppTooltip label="Enter a cancellation reason to continue.">
              <AppButton disabled variant="danger">
                Cancel plan
              </AppButton>
            </AppTooltip>
          ) : (
            <AppButton
              isLoading={cancelling}
              loadingText="Cancelling…"
              variant="danger"
              onClick={cancelPlan}
            >
              <XCircle className="h-4 w-4" />
              Cancel plan
            </AppButton>
          )}
        </div>
      </AppModal>
    </section>
  );
};

export default PlanningHistoryPage;
