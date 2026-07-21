import {
  AlertTriangle,
  Calculator,
  Check,
  ChevronDown,
  ChevronRight,
  Columns3,
  Eye,
  Save,
  ShieldCheck,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppModal from "../../../components/common/AppModal";
import PageHeader from "../../../components/common/PageHeader";
import {
  PlanningMessageSeverity,
  PLANNING_ROUNDING_RULE_LABELS,
} from "../../../constants/procurementEnums";
import { planningService } from "../../../services/procurement/planningService";
import {
  InventoryBasisNote,
  ProcurementDateRangeFields,
  ProcurementEmptyState,
  ProcurementInlineError,
  ProcurementLoadingRows,
  ProcurementMessageGroup,
  ProcurementPill,
  ProcurementSectionCard,
  ProcurementSuccessBanner,
} from "../ProcurementShared";
import {
  formatProcurementDecimal,
  getApiStatus,
  getCollection,
  getDefaultProcurementRange,
  getFieldErrorMap,
  getInclusiveDayCount,
  getItemCode,
  getItemName,
  getMessageSeverity,
  getPlanningFixRoute,
  getPlanningMessages,
  getProcurementBoolean,
  getProcurementError,
  getRecordId,
  validateDateRange,
} from "../procurementHelpers";
import useProcurementCapabilities from "../useProcurementCapabilities";
import useLatestRequest from "../../../hooks/useLatestRequest";

const DEFAULT_COLUMNS = {
  averageDailyUsage: true,
  calculatedSuggestedQuantity: true,
  leadTimeDays: true,
  materialRequirement: true,
  physicalStock: true,
  reorderPoint: true,
  shortage: true,
};

const COLUMN_OPTIONS = [
  ["materialRequirement", "Requirement"],
  ["averageDailyUsage", "Average daily usage"],
  ["leadTimeDays", "Lead time"],
  ["reorderPoint", "Reorder point"],
  ["physicalStock", "Physical stock"],
  ["shortage", "Shortage"],
  ["calculatedSuggestedQuantity", "Suggested quantity"],
];

const steps = [
  { id: "range", label: "Range", icon: Calculator },
  { id: "validate", label: "Validate", icon: ShieldCheck },
  { id: "preview", label: "Preview", icon: Eye },
  { id: "save", label: "Save Draft", icon: Save },
];

const FlowSteps = ({ current }) => {
  const currentIndex = steps.findIndex((step) => step.id === current);

  return (
    <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-4">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const complete = index < currentIndex;
        const active = index === currentIndex;
        return (
          <div
            key={step.id}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
              active
                ? "bg-brand text-white"
                : complete
                  ? "bg-brand-light text-brand"
                  : "text-slate-400"
            }`}
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${active ? "bg-brand-dark" : complete ? "bg-white" : "bg-slate-100"}`}>
              {complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </span>
            <span className="text-xs font-semibold">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const MessageGroups = ({ messages }) => {
  const grouped = {
    blocking: [],
    information: [],
    warning: [],
  };

  messages.forEach((message) => {
    const severity = getMessageSeverity(message);
    const route = getPlanningFixRoute(message);
    const enhanced = {
      ...message,
      action: route ? (
        <Link
          className="mt-2 inline-flex text-xs font-semibold underline underline-offset-2"
          to={route}
        >
          Open the fixing screen
        </Link>
      ) : null,
    };
    if (severity === PlanningMessageSeverity.BlockingError) {
      grouped.blocking.push(enhanced);
    } else if (severity === PlanningMessageSeverity.Warning) {
      grouped.warning.push(enhanced);
    } else {
      grouped.information.push(enhanced);
    }
  });

  return (
    <div className="space-y-3">
      <ProcurementMessageGroup messages={grouped.blocking} severity="blocking" />
      <ProcurementMessageGroup messages={grouped.warning} severity="warning" />
      <ProcurementMessageGroup messages={grouped.information} severity="information" />
      {messages.length === 0 && (
        <ProcurementSuccessBanner title="Validation passed">
          No blocking errors or warnings were returned for this range.
        </ProcurementSuccessBanner>
      )}
    </div>
  );
};

const Derivation = ({ line }) => (
  <div className="grid gap-4 rounded-xl bg-slate-50 p-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(120px,1fr))]">
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Calculation explanation</p>
      <p className="mt-2 whitespace-pre-line text-xs leading-6 text-slate-700">
        {line.calculationExplanation ?? "No explanation was supplied for this line."}
      </p>
      {Array.isArray(line.warnings) && line.warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {line.warnings.map((warning, index) => (
            <div key={warning.code ?? index} className="flex items-start gap-2 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{warning.message ?? warning.description ?? String(warning)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
    {[
      ["Lead-time demand", line.leadTimeDemand],
      ["Safety factor", line.safetyFactor],
      ["Safety stock", line.safetyStock],
      ["Minimum order quantity", line.minimumOrderQuantity],
      ["Order multiple", line.orderMultiple],
      ["Rounding rule", PLANNING_ROUNDING_RULE_LABELS[line.roundingRule] ?? line.roundingRule],
      ["Final quantity", line.finalQuantity],
      ["Unit", line.unitName ?? line.unitCode],
      ["Automatic", getProcurementBoolean(line.automaticCalculationEnabled) ? "Enabled" : "Disabled"],
      ["Manual planning", getProcurementBoolean(line.manualPlanning) ? "Yes" : "No"],
      ["Lead-time source", line.leadTimeSource ?? "-"],
      ["Purchase needed", Number(line.finalQuantity ?? line.calculatedSuggestedQuantity) > 0 ? "Yes" : "No"],
    ].map(([label, value]) => (
      <div key={label}>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-sm font-semibold tabular-nums text-slate-800">
          {typeof value === "number" ? formatProcurementDecimal(value) : (value ?? "-")}
        </p>
      </div>
    ))}
  </div>
);

const PreviewTable = ({ columns, lines }) => {
  const [expanded, setExpanded] = useState(new Set());
  const visibleColumnCount =
    Object.values(columns).filter(Boolean).length + 3;

  if (lines.length === 0) {
    return (
      <ProcurementEmptyState
        title="No planning lines"
        description="The preview did not return any material requirement lines for this range."
      />
    );
  }

  return (
    <div className="max-h-[68vh] overflow-auto">
      <table className="min-w-max w-full border-separate border-spacing-0 text-left">
        <thead className="sticky top-0 z-20 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="sticky left-0 z-30 w-10 border-b border-r border-slate-200 bg-slate-50 px-2 py-3" />
            <th className="sticky left-10 z-30 min-w-64 border-b border-r border-slate-200 bg-slate-50 px-4 py-3">Material</th>
            {columns.materialRequirement && <th className="min-w-32 border-b border-slate-200 px-4 py-3 text-right">Requirement</th>}
            {columns.averageDailyUsage && <th className="min-w-28 border-b border-slate-200 px-4 py-3 text-right">ADU</th>}
            {columns.leadTimeDays && <th className="min-w-36 border-b border-slate-200 px-4 py-3 text-right">Lead time</th>}
            {columns.reorderPoint && <th className="min-w-32 border-b border-slate-200 px-4 py-3 text-right">Reorder point</th>}
            {columns.physicalStock && <th className="min-w-28 border-b border-slate-200 px-4 py-3 text-right">Stock</th>}
            {columns.shortage && <th className="min-w-28 border-b border-slate-200 px-4 py-3 text-right">Shortage</th>}
            {columns.calculatedSuggestedQuantity && <th className="min-w-36 border-b border-slate-200 bg-brand-light px-4 py-3 text-right text-brand">Suggested qty</th>}
            <th className="min-w-40 border-b border-slate-200 px-4 py-3">Flags</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const id = getRecordId(line, ["planningLineId", "itemId"]) ?? index;
            const isExpanded = expanded.has(id);
            const shortage = Number(line.shortage) || 0;
            const warnings = Array.isArray(line.warnings) ? line.warnings : [];
            const manual = getProcurementBoolean(line.manualPlanning);
            const purchaseNeeded = Number(line.finalQuantity ?? line.calculatedSuggestedQuantity) > 0;
            return (
              <Fragment key={id}>
                <tr key={id} className="group">
                  <td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-2 py-3 group-hover:bg-slate-50">
                    <button type="button" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })}>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="sticky left-10 z-10 border-b border-r border-slate-100 bg-white px-4 py-3 group-hover:bg-slate-50"><p className="text-sm font-semibold text-slate-900">{getItemCode(line.item) || line.itemCode || line.materialCode}</p><p className="mt-0.5 max-w-52 truncate text-xs text-slate-500">{getItemName(line.item) || line.itemName || line.materialName} · {line.unitName ?? line.unitCode ?? "-"}</p></td>
                  {columns.materialRequirement && <td className="border-b border-slate-100 px-4 py-3 text-right text-sm tabular-nums">{formatProcurementDecimal(line.materialRequirement)}</td>}
                  {columns.averageDailyUsage && <td className="border-b border-slate-100 px-4 py-3 text-right text-sm tabular-nums">{formatProcurementDecimal(line.averageDailyUsage)}</td>}
                  {columns.leadTimeDays && <td className="border-b border-slate-100 px-4 py-3 text-right"><p className="text-sm font-semibold tabular-nums">{formatProcurementDecimal(line.leadTimeDays)} days</p><ProcurementPill tone="brand">{line.leadTimeSource ?? "-"}</ProcurementPill></td>}
                  {columns.reorderPoint && <td className="border-b border-slate-100 px-4 py-3 text-right text-sm tabular-nums">{formatProcurementDecimal(line.reorderPoint)}</td>}
                  {columns.physicalStock && <td className="border-b border-slate-100 px-4 py-3 text-right text-sm tabular-nums">{formatProcurementDecimal(line.physicalStock)}</td>}
                  {columns.shortage && <td className={`border-b border-slate-100 px-4 py-3 text-right text-sm font-semibold tabular-nums ${shortage > 0 ? "bg-red-50 text-red-700" : "text-slate-600"}`}>{formatProcurementDecimal(line.shortage)}</td>}
                  {columns.calculatedSuggestedQuantity && <td className="border-b border-slate-100 bg-brand-light/40 px-4 py-3 text-right text-sm font-semibold tabular-nums text-slate-900">{formatProcurementDecimal(line.calculatedSuggestedQuantity)}</td>}
                  <td className="border-b border-slate-100 px-4 py-3"><div className="flex flex-wrap gap-1">{warnings.length > 0 && <ProcurementPill tone="amber">{warnings.length} warning{warnings.length === 1 ? "" : "s"}</ProcurementPill>}{manual && <ProcurementPill tone="violet">Manual</ProcurementPill>}{purchaseNeeded && <ProcurementPill tone="emerald">Purchase needed</ProcurementPill>}</div></td>
                </tr>
                {isExpanded && <tr><td colSpan={visibleColumnCount} className="border-b border-slate-200 bg-white p-3"><Derivation line={line} /></td></tr>}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const GeneratePlanPage = () => {
  const initialRange = useMemo(() => getDefaultProcurementRange(), []);
  const [form, setForm] = useState({ ...initialRange, notes: "" });
  const [validation, setValidation] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveConflict, setSaveConflict] = useState(false);
  const [savedRun, setSavedRun] = useState(null);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const {
    beginRequest: beginValidationRequest,
    isLatestRequest: isLatestValidationRequest,
  } = useLatestRequest();
  const {
    beginRequest: beginPreviewRequest,
    isLatestRequest: isLatestPreviewRequest,
  } = useLatestRequest();
  const {
    beginRequest: beginSaveRequest,
    isLatestRequest: isLatestSaveRequest,
  } = useLatestRequest();
  const capabilities = useProcurementCapabilities({ label: "ProcurementPlanning.GeneratePlan", resource: "ProcurementPlanning.GeneratePlan", route: "/procurement/generate-plan" });
  const rangeError = validateDateRange(form.fromDate, form.toDate);
  const displayedRangeError =
    formErrors.fromDate || formErrors.toDate || rangeError;
  const messages = getPlanningMessages(validation);
  const hasBlocking = messages.some((message) => getMessageSeverity(message) === PlanningMessageSeverity.BlockingError);
  const lines = getCollection(preview, ["planningLines", "previewLines"]);
  const currentStep = savedRun ? "save" : preview ? "save" : validation ? (hasBlocking ? "validate" : "preview") : "range";

  const payload = { fromDate: form.fromDate, toDate: form.toDate, notes: form.notes.trim() || null };

  const validate = async () => {
    if (rangeError) return;
    const requestId = beginValidationRequest();
    setValidationLoading(true); setValidationError(""); setFormErrors({}); setPreview(null); setPreviewError(""); setSaveError(""); setSaveConflict(false); setSavedRun(null);
    try {
      const response = await planningService.validate(payload);
      if (isLatestValidationRequest(requestId)) setValidation(response.data);
    }
    catch (error) {
      if (isLatestValidationRequest(requestId)) {
        if ([400, 422].includes(getApiStatus(error))) {
          setFormErrors(getFieldErrorMap(error));
        }
        setValidationError(getProcurementError(error, "Unable to validate this planning range."));
      }
    }
    finally { if (isLatestValidationRequest(requestId)) setValidationLoading(false); }
  };

  const loadPreview = async () => {
    if (!validation || hasBlocking) return;
    const requestId = beginPreviewRequest();
    setPreviewLoading(true); setPreviewError(""); setSaveError(""); setSaveConflict(false);
    try {
      const response = await planningService.preview(payload);
      if (isLatestPreviewRequest(requestId)) setPreview(response.data);
    }
    catch (error) {
      if (isLatestPreviewRequest(requestId)) {
        if ([400, 422].includes(getApiStatus(error))) {
          setFormErrors(getFieldErrorMap(error));
        }
        setPreviewError(getProcurementError(error, "Unable to calculate the plan preview."));
      }
    }
    finally { if (isLatestPreviewRequest(requestId)) setPreviewLoading(false); }
  };

  const saveDraft = async () => {
    if (!preview || hasBlocking || !capabilities.canCreate) return;
    const requestId = beginSaveRequest();
    setSaving(true); setSaveError(""); setSaveConflict(false);
    try {
      const response = await planningService.saveRun(payload);
      if (isLatestSaveRequest(requestId)) {
        setSavedRun(response.data);
        toast.success(response.message || "Draft procurement plan saved.");
      }
    }
    catch (error) {
      if (isLatestSaveRequest(requestId)) {
        const message = getProcurementError(error, "Unable to save the draft plan.");
        if ([400, 422].includes(getApiStatus(error))) {
          setFormErrors(getFieldErrorMap(error));
        }
        setSaveError(message);
        setSaveConflict(getApiStatus(error) === 409);
        if (getApiStatus(error) !== 409) toast.error(message);
      }
    }
    finally { if (isLatestSaveRequest(requestId)) setSaving(false); }
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader badge={<><Calculator className="h-3.5 w-3.5" />Procurement Planning</>} title="Generate Plan" description="A guided validation-first flow that exposes every material calculation before a draft is saved." />
      <FlowSteps current={currentStep} />
      <InventoryBasisNote />
      <ProcurementSectionCard title="1. Choose the demand range" description="The default covers the last 30 calendar days including today.">
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,620px)_minmax(260px,1fr)]">
          <ProcurementDateRangeFields fromDate={form.fromDate} toDate={form.toDate} error={displayedRangeError} onChange={(patch) => { beginValidationRequest(); beginPreviewRequest(); beginSaveRequest(); setValidationLoading(false); setPreviewLoading(false); setSaving(false); setFormErrors({}); setForm((current) => ({ ...current, ...patch })); setValidation(null); setPreview(null); setSavedRun(null); }} />
          <div><label className="text-xs font-semibold text-slate-700" htmlFor="plan-notes">Planning notes</label><textarea id="plan-notes" rows={3} className={`mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 ${formErrors.notes ? "border-red-400" : "border-slate-200"}`} placeholder="Context retained with the draft run" value={form.notes} onChange={(event) => { setFormErrors((current) => ({ ...current, notes: "" })); setForm((current) => ({ ...current, notes: event.target.value })); }} />{formErrors.notes && <p className="mt-1 text-xs font-medium text-red-600">{formErrors.notes}</p>}<p className="mt-1 text-xs text-slate-500">{getInclusiveDayCount(form.fromDate, form.toDate)} calendar days of demand.</p></div>
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-4"><AppButton disabled={Boolean(rangeError) || previewLoading || saving} isLoading={validationLoading} loadingText="Validating…" onClick={validate}><ShieldCheck className="h-4 w-4" />Validate prerequisites</AppButton></div>
      </ProcurementSectionCard>
      <ProcurementInlineError message={validationError} title="Validation could not run" />

      {(validation || validationLoading) && <ProcurementSectionCard title="2. Resolve validation messages" description="Blocking errors must be fixed. Warnings are visible but do not prevent a preview or draft.">
        <div className="space-y-3 p-5">{validationLoading ? <ProcurementLoadingRows columns={2} rows={4} /> : <MessageGroups messages={messages} />}</div>
        {!validationLoading && <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4"><p className="text-xs text-slate-500">{hasBlocking ? "Fix blocking prerequisites, then validate again." : "Validation is clear enough to calculate the preview."}</p><AppButton disabled={hasBlocking} isLoading={previewLoading} loadingText="Generating…" onClick={loadPreview}><Eye className="h-4 w-4" />Calculate preview</AppButton></div>}
      </ProcurementSectionCard>}
      <ProcurementInlineError message={previewError} title="Preview could not be calculated" />

      {(preview || previewLoading) && <ProcurementSectionCard title="3. Review the calculated plan" description="Decision-critical columns stay visible; expand any row for its complete derivation and explanation." actions={<AppButton variant="secondary" onClick={() => setColumnsOpen(true)}><Columns3 className="h-4 w-4" />Columns</AppButton>}>
        <div className="border-b border-slate-100 p-4"><InventoryBasisNote message={preview?.inventoryBasis || undefined} /></div>
        {previewLoading ? <ProcurementLoadingRows columns={8} rows={8} /> : <PreviewTable columns={columns} lines={lines} />}
        {!previewLoading && <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Saving preserves these values as a draft snapshot. Warnings do not block saving.</p>{capabilities.canCreate && <AppButton disabled={hasBlocking || lines.length === 0 || Boolean(savedRun)} isLoading={saving} loadingText="Saving…" onClick={saveDraft}><Save className="h-4 w-4" />Save Draft</AppButton>}</div>}
      </ProcurementSectionCard>}
      <ProcurementInlineError message={saveError} title={saveConflict ? "Planning prerequisites changed" : "Draft could not be saved"} />
      {savedRun && <ProcurementSuccessBanner title="Draft plan saved"><div className="flex flex-wrap items-center gap-3"><span>{savedRun.runNumber ? `Run ${savedRun.runNumber} is ready in Planning History.` : "The snapshot is ready in Planning History."}</span><Link className="font-semibold underline underline-offset-2" to="/procurement/planning-history">Open Planning History</Link></div></ProcurementSuccessBanner>}

      <AppModal isOpen={columnsOpen} title="Visible decision columns" onClose={() => setColumnsOpen(false)}>
        <p className="text-sm leading-6 text-slate-600">Material and flags are always visible. Choose which calculation columns stay in the main grid; all values remain available in expanded rows.</p>
        <div className="mt-4 space-y-2">{COLUMN_OPTIONS.map(([key, label]) => <label key={key} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"><span>{label}</span><input type="checkbox" className="h-4 w-4 accent-brand" checked={columns[key]} onChange={(event) => setColumns((current) => ({ ...current, [key]: event.target.checked }))} /></label>)}</div>
        <div className="mt-5 flex justify-end"><AppButton onClick={() => setColumnsOpen(false)}>Done</AppButton></div>
      </AppModal>
    </section>
  );
};

export default GeneratePlanPage;
