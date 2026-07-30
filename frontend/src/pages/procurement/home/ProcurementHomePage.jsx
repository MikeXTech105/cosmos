import {
  CalendarRange,
  ChevronDown,
  ChevronRight,
  Download,
  Info,
  RefreshCw,
  Save,
  Settings2,
  ShoppingBasket,
  X,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppModal from "../../../components/common/AppModal";
import AppTooltip from "../../../components/common/AppTooltip";
import PageHeader from "../../../components/common/PageHeader";
import procurementMessages from "../../../i18n/locales/en/procurement.json";
import { planningService } from "../../../services/procurement/planningService";
import {
  EMPTY_VALUE,
  formatDateRange,
} from "../../../utils/format";
import ProcurementCalculationStrip from "../ProcurementCalculationStrip";
import {
  ProcurementDateRangeFields,
  ProcurementEmptyState,
  ProcurementErrorState,
  ProcurementLoadingRows,
  ProcurementPill,
  ProcurementSectionCard,
  ProcurementSuccessBanner,
} from "../ProcurementShared";
import {
  formatProcurementDecimal,
  formatProcurementQuantity,
  getCollection,
  getDefaultProcurementRange,
  getProcurementError,
  getRecordId,
  validateDateRange,
} from "../procurementHelpers";
import useProcurementCapabilities from "../useProcurementCapabilities";
import {
  getPlanningLineCover,
  getPlanningCsvRows,
  getPlanningLineInboundStock,
  getPlanningLineProjectedAvailableStock,
  getPlanningLineReorderPoint,
  getPlanningLineStatus,
  getPlanningLineStock,
  getPlanningLineToOrder,
  getOrderSummary,
  sortPlanningLines,
} from "./procurementHomeHelpers";

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

const downloadPlanningCsv = (lines, range) => {
  const header = [
    "Material code",
    "Material name",
    "Unit",
    "Physical stock",
    "Inbound stock",
    "Projected available stock",
    "Reorder point",
    "To order",
    "Cover days",
    "Status",
  ];
  const rows = getPlanningCsvRows(lines);
  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `procurement-buy-list-${range.fromDate}-${range.toDate}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
};

const AssumptionsModal = ({
  draftRange,
  error,
  isOpen,
  onApply,
  onChange,
  onClose,
  previewLines,
}) => {
  const assumptions = useMemo(() => {
    const unique = (key) =>
      [...new Set(previewLines.map((line) => line?.[key]).filter((value) => value !== null && value !== undefined && value !== ""))];

    return {
      leadTimeSources: unique("leadTimeSource"),
      roundingRules: unique("roundingRule"),
      safetyFactors: unique("safetyFactor"),
    };
  }, [previewLines]);

  return (
    <AppModal isOpen={isOpen} maxWidth="max-w-3xl" title="Adjust assumptions" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-slate-800">Demand window</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Recalculate the live preview with a different sales range.
          </p>
          <div className="mt-3">
            <ProcurementDateRangeFields
              error={error}
              fromDate={draftRange.fromDate}
              toDate={draftRange.toDate}
              onChange={onChange}
            />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Current server assumptions</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            These are returned by the preview per material. Configure saved
            material defaults in Setup.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {assumptions.leadTimeSources.map((value) => (
              <ProcurementPill key={`lead-${value}`} tone="brand">
                Lead time: {value}
              </ProcurementPill>
            ))}
            {assumptions.safetyFactors.map((value) => (
              <ProcurementPill key={`safety-${value}`} tone="slate">
                Safety factor {formatProcurementDecimal(value)}
              </ProcurementPill>
            ))}
            {assumptions.roundingRules.map((value) => (
              <ProcurementPill key={`round-${value}`} tone="slate">
                Rounding rule {value}
              </ProcurementPill>
            ))}
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-xs leading-5">
            The current planning contract accepts only the demand range and notes
            for preview. Safety, lead-time, and rounding overrides therefore remain
            material defaults managed in Setup.
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Link to="/procurement/setup?tab=settings">
          <AppButton variant="secondary">
            <Settings2 className="h-4 w-4" />Manage saved defaults
          </AppButton>
        </Link>
        <AppButton
          disabled={Boolean(error)}
          disabledReason={error || undefined}
          onClick={onApply}
        >
          <RefreshCw className="h-4 w-4" />Recalculate
        </AppButton>
      </div>
    </AppModal>
  );
};

const BuyList = ({ lines }) => {
  const [expanded, setExpanded] = useState(new Set());

  if (lines.length === 0) {
    return (
      <ProcurementEmptyState
        title="Nothing to order"
        description="The server preview returned no materials for this section."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1260px] w-full text-left">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">#</th>
            <th className="px-4 py-3" colSpan={2}>Material</th>
            <th className="px-4 py-3">Unit</th>
            <th className="px-4 py-3 text-right">
              <span className="inline-flex items-center gap-1">
                Physical stock
                <AppTooltip label="Global Items.CurrentStock supplied by the planning preview.">
                  <button type="button" className="rounded text-slate-400 hover:text-slate-700">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </AppTooltip>
              </span>
            </th>
            <th className="px-4 py-3 text-right">Inbound</th>
            <th className="px-4 py-3 text-right">
              <span className="inline-flex items-center gap-1">
                Projected available
                <AppTooltip label="Global stock + latest valid inbound snapshot. Not warehouse-level allocation.">
                  <button type="button" className="rounded text-slate-400 hover:text-slate-700">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </AppTooltip>
              </span>
            </th>
            <th className="px-4 py-3 text-right">Reorder point</th>
            <th className="bg-brand-light px-4 py-3 text-right text-brand">To order</th>
            <th className="px-4 py-3 text-right">Cover</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lines.map((line, index) => {
            const id = getRecordId(line, ["planningLineId", "itemId"]) ?? index;
            const isExpanded = expanded.has(id);
            const status = getPlanningLineStatus(line);
            const cover = getPlanningLineCover(line);
            return (
              <Fragment key={id}>
                <tr className="group text-sm hover:bg-slate-50/70">
                  <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3" colSpan={2}>
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        aria-label={isExpanded ? "Hide calculation" : "Show calculation"}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        onClick={() =>
                          setExpanded((current) => {
                            const next = new Set(current);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return next;
                          })
                        }
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <div className="min-w-0">
                        <p className="max-w-72 truncate font-semibold text-slate-900">
                          {line.materialItemName ?? EMPTY_VALUE}
                        </p>
                        <p className="mt-0.5 max-w-72 truncate text-xs text-slate-500">
                          {line.materialItemCode ?? EMPTY_VALUE}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{line.unitShortName ?? line.unitName ?? EMPTY_VALUE}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatProcurementQuantity(getPlanningLineStock(line))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatProcurementQuantity(getPlanningLineInboundStock(line))}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">{formatProcurementQuantity(getPlanningLineProjectedAvailableStock(line))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatProcurementQuantity(getPlanningLineReorderPoint(line))}</td>
                  <td className="bg-brand-light/40 px-4 py-3 text-right text-base font-bold tabular-nums text-slate-950">{formatProcurementQuantity(getPlanningLineToOrder(line), "0")}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{cover === null || cover === undefined || cover === "" ? EMPTY_VALUE : `${formatProcurementQuantity(cover)} days`}</td>
                  <td className="px-4 py-3"><ProcurementPill tone={status.tone}>{status.label}</ProcurementPill></td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={11} className="bg-white p-3">
                      <ProcurementCalculationStrip line={line} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const ProcurementHomePage = () => {
  const initialRange = useMemo(() => getDefaultProcurementRange(), []);
  const [range, setRange] = useState(initialRange);
  const [draftRange, setDraftRange] = useState(initialRange);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedRun, setSavedRun] = useState(null);
  const [showZero, setShowZero] = useState(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const capabilities = useProcurementCapabilities({
    label: "ProcurementPlanning.GeneratePlan",
    resource: "ProcurementPlanning.GeneratePlan",
    route: "/procurement/generate-plan",
  });

  const loadPreview = useCallback(async (nextRange) => {
    const rangeError = validateDateRange(nextRange.fromDate, nextRange.toDate);
    if (rangeError) return;

    setLoading(true);
    setError("");
    setSavedRun(null);
    try {
      const response = await planningService.preview({
        fromDate: nextRange.fromDate,
        toDate: nextRange.toDate,
        notes: null,
      });
      setPreview(response.data);
    } catch (previewError) {
      setError(getProcurementError(previewError, "Unable to load today's procurement preview."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadPreview(initialRange), 0);
    return () => window.clearTimeout(timeout);
  }, [initialRange, loadPreview]);

  const allLines = useMemo(
    () => sortPlanningLines(getCollection(preview, ["planningLines", "previewLines"])),
    [preview],
  );
  const actionableLines = allLines.filter((line) => getPlanningLineToOrder(line) > 0);
  const zeroLines = allLines.filter((line) => getPlanningLineToOrder(line) <= 0);
  const rangeError = validateDateRange(draftRange.fromDate, draftRange.toDate);
  const rangeChanged =
    range.fromDate !== initialRange.fromDate || range.toDate !== initialRange.toDate;
  const orderSummary = getOrderSummary(
    actionableLines.length,
    procurementMessages.home,
  );
  const saveDisabled =
    loading || Boolean(savedRun) || actionableLines.length === 0;
  const saveDisabledReason = loading
    ? "Wait for the buy list to finish loading"
    : savedRun
      ? "This draft is already saved"
      : "Nothing to save";
  const saveUnavailableReason = !capabilities.canCreate
    ? "Saving a draft requires Procurement Planning create permission"
    : saveDisabled
      ? saveDisabledReason
      : undefined;
  const exportDisabledReason = !capabilities.canExport
    ? "Exporting requires Procurement Planning export permission"
    : loading
      ? "Wait for the buy list to finish loading"
      : allLines.length === 0
        ? "There are no rows to export"
        : undefined;

  const saveDraft = async () => {
    if (!capabilities.canCreate || loading || actionableLines.length === 0) return;
    setSaving(true);
    try {
      const response = await planningService.saveRun({
        fromDate: range.fromDate,
        toDate: range.toDate,
        notes: null,
      });
      setSavedRun(response.data);
      toast.success(response.message || "Draft procurement plan saved.");
    } catch (saveError) {
      toast.error(getProcurementError(saveError, "Unable to save the draft plan."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={<><ShoppingBasket className="h-3.5 w-3.5" />Procurement Planning</>}
        title="Procurement"
        description="A decision-ready view of what needs ordering from the latest server calculation."
      />

      <div className="overflow-hidden rounded-2xl bg-brand p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-white/75">What to buy today</p>
            <div className="mt-2 flex items-end gap-3">
              {loading ? (
                <span className="text-5xl font-black tabular-nums">{EMPTY_VALUE}</span>
              ) : orderSummary.showCount ? (
                <span className="text-5xl font-black tabular-nums">
                  {orderSummary.count}
                </span>
              ) : null}
              <span
                className={
                  loading || orderSummary.showCount
                    ? "pb-1 text-base font-semibold text-white/85"
                    : "text-2xl font-bold text-white"
                }
              >
                {loading
                  ? "Calculating order needs"
                  : error
                    ? "Buy list unavailable"
                    : orderSummary.text}
              </span>
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-white/70">
              <CalendarRange className="h-4 w-4" />
              Sales from {formatDateRange(range.fromDate, range.toDate)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AppButton className="border-white/20 bg-white text-brand hover:bg-brand-light" variant="secondary" onClick={() => { setDraftRange(range); setAssumptionsOpen(true); }}>
              <Settings2 className="h-4 w-4" />Adjust assumptions
            </AppButton>
            <AppButton
              className="border-white/25 bg-white/10 text-white hover:bg-white/20 disabled:opacity-90"
              disabled={Boolean(exportDisabledReason)}
              disabledReason={exportDisabledReason}
              variant="secondary"
              onClick={() => downloadPlanningCsv(allLines, range)}
            >
              <Download className="h-4 w-4" />Export CSV
            </AppButton>
            <AppButton
              className="bg-white text-brand hover:bg-white/90 disabled:opacity-80"
              disabled={Boolean(saveUnavailableReason)}
              disabledReason={saveUnavailableReason}
              isLoading={saving}
              loadingText="Saving…"
              variant="secondary"
              onClick={saveDraft}
            >
              <Save className="h-4 w-4" />Save draft
            </AppButton>
          </div>
        </div>
      </div>

      {rangeChanged && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Active adjustments</span>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand"
            onClick={() => {
              setRange(initialRange);
              setDraftRange(initialRange);
              void loadPreview(initialRange);
            }}
          >
            Range: {formatDateRange(range.fromDate, range.toDate)}
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {savedRun && (
        <ProcurementSuccessBanner title="Draft plan saved">
          <Link className="font-semibold underline underline-offset-2" to="/procurement/planning-history">
            Open the saved plan
          </Link>
        </ProcurementSuccessBanner>
      )}

      <ProcurementSectionCard
        title="Buy list"
        description="Ordered by urgency and server-reported shortfall. Expand a row to see why."
        actions={
          <div className="flex items-center gap-2">
            <AppButton
              variant="secondary"
              disabled={loading}
              disabledReason="The buy list is already refreshing"
              onClick={() => void loadPreview(range)}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
            </AppButton>
            <Link to="/procurement/generate-plan">
              <AppButton variant="secondary">Full step-by-step flow</AppButton>
            </Link>
          </div>
        }
      >
        {loading ? (
          <ProcurementLoadingRows columns={11} rows={5} />
        ) : error ? (
          <ProcurementErrorState
            error={error}
            onRetry={() => void loadPreview(range)}
          />
        ) : actionableLines.length === 0 ? (
          <ProcurementEmptyState
            title="Nothing needs ordering"
            description="The planning preview returned no positive to-order quantities for this range."
          />
        ) : (
          <BuyList lines={actionableLines} />
        )}
        {!loading && zeroLines.length > 0 && (
          <div className="border-t border-slate-100">
            <button
              type="button"
              className="flex w-full items-center justify-between px-5 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50"
              onClick={() => setShowZero((current) => !current)}
            >
              <span>
                {zeroLines.length} material{zeroLines.length === 1 ? "" : "s"} with nothing to order
              </span>
              {showZero ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {showZero && <BuyList lines={zeroLines} />}
          </div>
        )}
      </ProcurementSectionCard>

      <AssumptionsModal
        draftRange={draftRange}
        error={rangeError}
        isOpen={assumptionsOpen}
        previewLines={allLines}
        onApply={() => {
          if (rangeError) return;
          setRange(draftRange);
          setAssumptionsOpen(false);
          void loadPreview(draftRange);
        }}
        onChange={(patch) => setDraftRange((current) => ({ ...current, ...patch }))}
        onClose={() => setAssumptionsOpen(false)}
      />
    </section>
  );
};

export default ProcurementHomePage;
