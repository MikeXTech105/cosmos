import {
  AlertTriangle,
  CheckCircle2,
  History,
  Plus,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import {
  PlanningRoundingRule,
  PLANNING_ROUNDING_RULE_OPTIONS,
} from "../../../constants/procurementEnums";
import { procurementSettingService } from "../../../services/procurement/procurementSettingService";
import {
  ProcurementEmptyState,
  ProcurementErrorState,
  ProcurementInlineError,
  ProcurementLoadingRows,
  ProcurementPagination,
  ProcurementPill,
  ProcurementSectionCard,
  ProcurementToggle,
} from "../ProcurementShared";
import {
  formatProcurementDate,
  formatProcurementDecimal,
  getApiStatus,
  getCollection,
  getFieldErrorMap,
  getItemCode,
  getItemLabel,
  getItemName,
  getPagination,
  getProcurementBoolean,
  getProcurementError,
  getRecordId,
  hasDecimalPrecision,
  toIsoDate,
  toNumberOrNull,
} from "../procurementHelpers";
import useProcurementCapabilities from "../useProcurementCapabilities";
import useLatestRequest from "../useLatestRequest";

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

const toSettingForm = (setting, item) => ({
  automaticCalculationEnabled: getProcurementBoolean(
    setting?.automaticCalculationEnabled,
    true,
  ),
  configuredLeadTimeDays: String(
    setting?.configuredLeadTimeDays ?? setting?.leadTimeDays ?? "",
  ),
  historyAverageLeadTimeDays:
    setting?.historyAverageLeadTimeDays ?? setting?.averageLeadTimeDays ?? null,
  isActive: getProcurementBoolean(setting?.isActive, true),
  item: item ?? getSettingItem(setting),
  leadTimeOverrideDays: String(setting?.leadTimeOverrideDays ?? ""),
  minimumOrderQuantity: String(setting?.minimumOrderQuantity ?? ""),
  orderMultiple: String(setting?.orderMultiple ?? ""),
  roundingRule:
    setting?.roundingRule ?? PlanningRoundingRule.None,
  safetyFactor: String(setting?.safetyFactor ?? ""),
  manualPlanning: getProcurementBoolean(setting?.manualPlanning, false),
});

const getLeadTimeMeta = (form) => {
  const override = toNumberOrNull(form.leadTimeOverrideDays);
  const history = toNumberOrNull(form.historyAverageLeadTimeDays);
  const configured = toNumberOrNull(form.configuredLeadTimeDays);

  if (override !== null) return { source: "Override", tone: "violet", value: override };
  if (history !== null) return { source: "History average", tone: "brand", value: history };
  return { source: "Configured", tone: "slate", value: configured };
};

const LeadTimePanel = ({ form, setForm }) => {
  const effective = getLeadTimeMeta(form);

  return (
    <div className="rounded-2xl border border-brand/20 bg-brand-light/40 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Lead time decision</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-600">
            Override wins first, then history average, then configured lead time.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Effective</p>
            <p className="text-lg font-semibold tabular-nums text-slate-900">
              {formatProcurementDecimal(effective.value)} days
            </p>
          </div>
          <ProcurementPill tone={effective.tone}>{effective.source}</ProcurementPill>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <AppInput
          label="Configured days"
          min="0"
          step="any"
          type="number"
          value={form.configuredLeadTimeDays}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              configuredLeadTimeDays: event.target.value,
            }))
          }
        />
        <AppInput
          label="Override days"
          min="0"
          placeholder="Optional"
          step="any"
          type="number"
          value={form.leadTimeOverrideDays}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              leadTimeOverrideDays: event.target.value,
            }))
          }
        />
        <AppInput
          disabled
          label="History average"
          value={
            form.historyAverageLeadTimeDays === null
              ? "No received orders"
              : `${formatProcurementDecimal(form.historyAverageLeadTimeDays)} days`
          }
        />
      </div>
    </div>
  );
};

const SettingEditor = ({
  canSave,
  isOpen,
  onClose,
  onHistory,
  onSaved,
  row,
}) => {
  const [form, setForm] = useState(toSettingForm(null, null));
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState(false);

  useEffect(() => {
    if (!isOpen || !row) return undefined;
    let active = true;

    void Promise.resolve().then(async () => {
      const item = getSettingItem(row);
      const itemId = getRecordId(item, ["itemId"]);
      setLoading(true);
      setErrors({});
      setLoadError(null);
      setExisting(Boolean(row.settingId ?? row.procurementSettingId));
      try {
        const response = await procurementSettingService.getByItem(itemId);
        if (!active) return;
        setForm(toSettingForm(response.data, item));
        setExisting(true);
      } catch (error) {
        if (!active) return;
        if (getApiStatus(error) === 404) {
          setForm(toSettingForm(row, item));
          setExisting(false);
        } else {
          setLoadError(error);
        }
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [isOpen, reloadKey, row]);

  const submit = async () => {
    const validation = {};
    const configured = toNumberOrNull(form.configuredLeadTimeDays);
    const override = toNumberOrNull(form.leadTimeOverrideDays);
    const safetyFactor = toNumberOrNull(form.safetyFactor);
    const minimumOrderQuantity = toNumberOrNull(form.minimumOrderQuantity);
    const orderMultiple = toNumberOrNull(form.orderMultiple);
    const effective = getLeadTimeMeta(form).value;

    [
      ["configuredLeadTimeDays", configured],
      ["leadTimeOverrideDays", override],
      ["safetyFactor", safetyFactor],
      ["minimumOrderQuantity", minimumOrderQuantity],
    ].forEach(([key, value]) => {
      if (value !== null && value < 0) validation[key] = "Value cannot be negative.";
    });
    if (minimumOrderQuantity !== null && !(minimumOrderQuantity > 0)) {
      validation.minimumOrderQuantity =
        "Minimum order quantity must be greater than zero when set.";
    }
    if (orderMultiple !== null && !(orderMultiple > 0)) {
      validation.orderMultiple = "Order multiple must be greater than zero when set.";
    }
    if (!form.manualPlanning && effective === null) {
      validation.configuredLeadTimeDays =
        "An effective lead time is required unless manual planning is enabled.";
    }
    ["configuredLeadTimeDays", "leadTimeOverrideDays", "safetyFactor", "minimumOrderQuantity", "orderMultiple"].forEach((key) => {
      if (!hasDecimalPrecision(form[key])) validation[key] = "Use no more than 6 decimal places.";
    });

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    const itemId = getRecordId(form.item, ["itemId"]);
    const payload = {
      itemId,
      configuredLeadTimeDays: configured,
      leadTimeOverrideDays: override,
      safetyFactor: safetyFactor ?? 0,
      minimumOrderQuantity,
      orderMultiple,
      roundingRule: Number(form.roundingRule),
      automaticCalculationEnabled: form.automaticCalculationEnabled,
      manualPlanning: form.manualPlanning,
      isActive: form.isActive,
    };
    setSaving(true);
    setErrors({});
    try {
      const response = await procurementSettingService.saveByItem(itemId, payload);
      toast.success(response.message || "Procurement setting saved.");
      await onSaved();
      onClose();
    } catch (error) {
      if ([400, 422].includes(getApiStatus(error))) {
        setErrors({ ...getFieldErrorMap(error), form: getProcurementError(error) });
      } else {
        setErrors({ form: getProcurementError(error, "Unable to save the setting.") });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal isOpen={isOpen} maxWidth="max-w-5xl" title={existing ? "Edit procurement setting" : "Configure procurement setting"} onClose={saving ? undefined : onClose}>
      {loading ? <ProcurementLoadingRows columns={3} rows={5} /> : loadError ? (
        <ProcurementErrorState
          error={loadError}
          onRetry={() => setReloadKey((current) => current + 1)}
        />
      ) : (
        <div className="max-h-[76vh] space-y-5 overflow-y-auto pr-1">
          <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-semibold text-slate-900">{getItemCode(form.item)} · {getItemName(form.item)}</p><p className="mt-0.5 text-xs text-slate-500">{form.item?.unitName ?? "Material planning setting"}</p></div>
            <AppButton variant="secondary" onClick={() => onHistory(form.item)}><History className="h-4 w-4" />Lead-time history</AppButton>
          </div>
          <LeadTimePanel form={form} setForm={setForm} />
          {(errors.configuredLeadTimeDays || errors.leadTimeOverrideDays) && <p className="text-xs font-medium text-red-600">{errors.configuredLeadTimeDays || errors.leadTimeOverrideDays}</p>}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AppInput error={errors.safetyFactor} label="Safety factor" min="0" step="any" type="number" value={form.safetyFactor} onChange={(event) => setForm((current) => ({ ...current, safetyFactor: event.target.value }))} />
            <AppInput error={errors.minimumOrderQuantity} label="Minimum order quantity" min="0" placeholder="Optional" step="any" type="number" value={form.minimumOrderQuantity} onChange={(event) => setForm((current) => ({ ...current, minimumOrderQuantity: event.target.value }))} />
            <AppInput error={errors.orderMultiple} label="Order multiple" min="0" placeholder="Optional" step="any" type="number" value={form.orderMultiple} onChange={(event) => setForm((current) => ({ ...current, orderMultiple: event.target.value }))} />
            <AppSelect error={errors.roundingRule} label="Rounding rule" options={PLANNING_ROUNDING_RULE_OPTIONS} value={form.roundingRule} onChange={(roundingRule) => setForm((current) => ({ ...current, roundingRule }))} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <ProcurementToggle checked={form.automaticCalculationEnabled} label="Automatic calculation" description="Use demand, lead time, safety stock, and inventory to calculate a suggested quantity." onChange={(checked) => setForm((current) => ({ ...current, automaticCalculationEnabled: checked, manualPlanning: checked ? false : current.manualPlanning }))} />
            <ProcurementToggle checked={form.manualPlanning} label="Manual planning" description="Forces the automatic plan result to zero so a planner must enter a quantity deliberately." onChange={(checked) => setForm((current) => ({ ...current, manualPlanning: checked, automaticCalculationEnabled: checked ? false : current.automaticCalculationEnabled }))} />
          </div>
          {!form.automaticCalculationEnabled && !form.manualPlanning && <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p className="text-xs leading-5"><strong>Both modes are off.</strong> The item will not receive an automatic suggestion, but it is not explicitly flagged for manual planning. Choose the intended mode before saving.</p></div>}
          <ProcurementToggle checked={form.isActive} label="Setting is active" description="Inactive settings are excluded from automatic procurement planning." onChange={(isActive) => setForm((current) => ({ ...current, isActive }))} />
          <ProcurementInlineError message={errors.form} title="Setting could not be saved" />
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2"><AppButton variant="secondary" onClick={onClose}>Cancel</AppButton>{canSave && !loadError && <AppButton disabled={loading} isLoading={saving} onClick={submit}><Settings2 className="h-4 w-4" />Save setting</AppButton>}</div>
    </AppModal>
  );
};

const LeadTimeHistoryModal = ({ canManage, item, isOpen, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ notes: "", orderedDate: "", receivedDate: "", reference: "" });
  const [formErrors, setFormErrors] = useState({});
  const { beginRequest, isLatestRequest } = useLatestRequest();

  const load = useCallback(async () => {
    if (!item) return;
    const requestId = beginRequest();
    setLoading(true); setError(null);
    try {
      const response = await procurementSettingService.getLeadTimeHistory(getRecordId(item, ["itemId"]), { PageNumber: 1, PageSize: 200 });
      if (isLatestRequest(requestId)) setData(response.data);
    }
    catch (loadError) { if (isLatestRequest(requestId)) setError(loadError); }
    finally { if (isLatestRequest(requestId)) setLoading(false); }
  }, [beginRequest, isLatestRequest, item]);

  useEffect(() => {
    beginRequest();
    if (isOpen) {
      const timeout = window.setTimeout(() => {
        setData(null);
        setError(null);
        setForm({ notes: "", orderedDate: "", receivedDate: "", reference: "" });
        setFormErrors({});
        void load();
      }, 0);

      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [beginRequest, isOpen, load]);
  const rows = getCollection(data, ["history", "leadTimeHistory"]);
  const average = data?.averageLeadTimeDays ?? data?.historyAverageLeadTimeDays;

  const submit = async () => {
    const validation = {};
    if (!form.reference.trim()) validation.reference = "Reference is required.";
    if (!form.orderedDate) validation.orderedDate = "Ordered date is required.";
    if (!form.receivedDate) validation.receivedDate = "Received date is required.";
    if (form.orderedDate && form.receivedDate && form.receivedDate < form.orderedDate) validation.receivedDate = "Received date must be on or after ordered date.";
    if (Object.keys(validation).length) { setFormErrors(validation); return; }
    setAdding(true); setFormErrors({});
    try { await procurementSettingService.addLeadTimeHistory({ itemId: getRecordId(item, ["itemId"]), reference: form.reference.trim(), orderedDate: form.orderedDate, receivedDate: form.receivedDate, notes: form.notes.trim() || null }); toast.success("Lead-time record added."); setForm({ notes: "", orderedDate: "", receivedDate: "", reference: "" }); await load(); }
    catch (addError) { setFormErrors({ ...getFieldErrorMap(addError), form: getProcurementError(addError, "Unable to add the record.") }); }
    finally { setAdding(false); }
  };

  return (
    <AppModal isOpen={isOpen} maxWidth="max-w-5xl" title={`Lead-time history · ${getItemLabel(item)}`} onClose={adding ? undefined : onClose}>
      <div className="max-h-[76vh] space-y-5 overflow-y-auto pr-1">
        <div className="grid gap-3 rounded-xl border border-brand/20 bg-brand-light/40 p-4 md:grid-cols-[160px_minmax(0,1fr)]"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Computed average</p><p className="mt-1 text-xl font-semibold text-slate-900">{formatProcurementDecimal(average)} days</p></div><p className="self-center text-xs leading-5 text-slate-600">Completed order receipts feed the history-average lead-time source used by automatic planning.</p></div>
        {canManage && <ProcurementSectionCard title="Add received order" description="Received date must be on or after the ordered date."><div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4"><AppInput error={formErrors.reference} label="Reference" required value={form.reference} onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))} /><AppInput error={formErrors.orderedDate} label="Ordered date" required type="date" max={form.receivedDate || toIsoDate(new Date())} value={form.orderedDate} onChange={(event) => setForm((current) => ({ ...current, orderedDate: event.target.value }))} /><AppInput error={formErrors.receivedDate} label="Received date" required type="date" min={form.orderedDate} max={toIsoDate(new Date())} value={form.receivedDate} onChange={(event) => setForm((current) => ({ ...current, receivedDate: event.target.value }))} /><AppInput error={formErrors.notes} label="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></div><div className="flex items-center justify-between gap-3 px-4 pb-4"><ProcurementInlineError message={formErrors.form} /><AppButton isLoading={adding} onClick={submit}><Plus className="h-4 w-4" />Add record</AppButton></div></ProcurementSectionCard>}
        <ProcurementSectionCard title="Received-order history">{loading ? <ProcurementLoadingRows columns={5} rows={4} /> : error ? <ProcurementErrorState error={error} onRetry={load} /> : rows.length === 0 ? <ProcurementEmptyState title="No lead-time history" /> : <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Ordered</th><th className="px-4 py-3">Received</th><th className="px-4 py-3 text-right">Lead time</th><th className="px-4 py-3">Notes</th></tr></thead><tbody className="divide-y divide-slate-100 text-sm">{rows.map((record, index) => <tr key={getRecordId(record, ["leadTimeHistoryId"]) ?? index}><td className="px-4 py-3 font-semibold text-slate-800">{record.reference}</td><td className="px-4 py-3 text-slate-600">{formatProcurementDate(record.orderedDate)}</td><td className="px-4 py-3 text-slate-600">{formatProcurementDate(record.receivedDate)}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{formatProcurementDecimal(record.leadTimeDays ?? record.numberOfDays)}</td><td className="px-4 py-3 text-slate-600">{record.notes ?? "-"}</td></tr>)}</tbody></table></div>}</ProcurementSectionCard>
      </div>
    </AppModal>
  );
};

const ProcurementSettingsPage = () => {
  const [mode, setMode] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState(null);
  const [missingData, setMissingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editor, setEditor] = useState({ open: false, row: null });
  const [historyItem, setHistoryItem] = useState(null);
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

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader badge={<><SlidersHorizontal className="h-3.5 w-3.5" />Procurement Planning</>} title="Procurement Settings" description="Make lead-time sourcing, planning mode, safety stock, MOQ, and order rounding explicit for every purchased material." actions={<AppButton variant="secondary" disabled={loading} onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</AppButton>} />
      {missingCount > 0 && <button type="button" className="flex w-full items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-amber-800" onClick={() => { setMode("missing"); setPage(1); }}><span className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span><span className="block text-sm font-semibold">{missingCount} material{missingCount === 1 ? "" : "s"} need configuration</span><span className="mt-0.5 block text-xs leading-5">Configure these before validating a complete automatic plan.</span></span></span><ProcurementPill tone="amber">Open queue</ProcurementPill></button>}
      <ProcurementSectionCard>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-end xl:justify-between"><div className="w-full max-w-md"><AppInput label="Search materials" placeholder="Item code or name" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div><div className="flex flex-wrap gap-2">{QUICK_FILTERS.map((filter) => <button key={filter.id} type="button" className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${mode === filter.id ? "border-brand bg-brand-light text-brand" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`} onClick={() => { setMode(filter.id); setPage(1); }}>{filter.label}{filter.id === "missing" && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-700">{missingCount}</span>}</button>)}</div></div>
        {loading ? <ProcurementLoadingRows columns={7} /> : error ? <ProcurementErrorState error={error} onRetry={load} /> : rows.length === 0 ? <ProcurementEmptyState icon={mode === "missing" ? CheckCircle2 : Wrench} title={mode === "missing" ? "Configuration queue is clear" : "No materials match these filters"} /> : <div className="overflow-x-auto"><table className="min-w-[1120px] w-full text-left"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Material</th><th className="px-4 py-3">Effective lead time</th><th className="px-4 py-3 text-right">Safety factor</th><th className="px-4 py-3 text-right">MOQ</th><th className="px-4 py-3 text-right">Order multiple</th><th className="px-4 py-3">Mode</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100 text-sm">{rows.map((row, index) => { const item = getSettingItem(row); const manual = getProcurementBoolean(row.manualPlanning); const automatic = getProcurementBoolean(row.automaticCalculationEnabled); const active = getProcurementBoolean(row.isActive, true); return <tr key={getRecordId(item, ["itemId"]) ?? index}><td className="px-4 py-3"><p className="font-semibold text-slate-800">{getItemCode(item)}</p><p className="text-xs text-slate-500">{getItemName(item)} · {row.unitName ?? item.unitName ?? "-"}</p></td><td className="px-4 py-3"><div className="flex items-center gap-2"><span className="font-semibold tabular-nums">{formatProcurementDecimal(row.effectiveLeadTimeDays)} days</span><ProcurementPill tone="brand">{row.leadTimeSource ?? row.effectiveLeadTimeSource ?? "Configured"}</ProcurementPill></div></td><td className="px-4 py-3 text-right tabular-nums">{formatProcurementDecimal(row.safetyFactor)}</td><td className="px-4 py-3 text-right tabular-nums">{formatProcurementDecimal(row.minimumOrderQuantity)}</td><td className="px-4 py-3 text-right tabular-nums">{formatProcurementDecimal(row.orderMultiple)}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-1"><ProcurementPill tone={manual ? "violet" : automatic ? "emerald" : "amber"}>{manual ? "Manual" : automatic ? "Automatic" : "No mode"}</ProcurementPill>{!active && <ProcurementPill tone="slate">Inactive</ProcurementPill>}</div></td><td className="px-4 py-3"><div className="flex justify-end gap-2"><AppButton className="h-8 px-3" variant="secondary" onClick={() => setHistoryItem(item)}><History className="h-4 w-4" />History</AppButton><AppButton className="h-8 px-3" disabled={!capabilities.canCreate && !capabilities.canEdit} onClick={() => setEditor({ open: true, row })}><Settings2 className="h-4 w-4" />Configure</AppButton></div></td></tr>; })}</tbody></table></div>}
        <ProcurementPagination disabled={loading} {...pagination} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(Number(value)); setPage(1); }} />
      </ProcurementSectionCard>
      <SettingEditor canSave={capabilities.canCreate || capabilities.canEdit} isOpen={editor.open} row={editor.row} onClose={() => setEditor({ open: false, row: null })} onSaved={load} onHistory={(item) => setHistoryItem(item)} />
      <LeadTimeHistoryModal canManage={capabilities.canCreate || capabilities.canEdit} item={historyItem} isOpen={Boolean(historyItem)} onClose={() => setHistoryItem(null)} />
    </section>
  );
};

export default ProcurementSettingsPage;
