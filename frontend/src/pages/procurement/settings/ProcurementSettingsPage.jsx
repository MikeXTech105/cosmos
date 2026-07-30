import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock3,
  History,
  Plus,
  RotateCw,
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
import AppTooltip from "../../../components/common/AppTooltip";
import MobileFilterSheet from "../../../components/common/MobileFilterSheet";
import PageHeader from "../../../components/common/PageHeader";
import {
  PlanningRoundingRule,
  PLANNING_ROUNDING_RULE_OPTIONS,
} from "../../../constants/procurementEnums";
import { procurementSettingService } from "../../../services/procurement/procurementSettingService";
import {
  ProcurementErrorState,
  ProcurementInlineError,
  ProcurementLoadingRows,
  ProcurementPagination,
  ProcurementPill,
  ProcurementSectionCard,
  ProcurementTabs,
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
        "Minimum order qty must be greater than zero when set.";
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
    <AppModal isBusy={saving} isOpen={isOpen} maxWidth="max-w-5xl" title={existing ? "Edit procurement setting" : "Configure procurement setting"} onClose={saving ? undefined : onClose}>
      {loading ? <ProcurementLoadingRows columns={3} rows={5} /> : loadError ? (
        <ProcurementErrorState
          error={loadError}
          onRetry={() => setReloadKey((current) => current + 1)}
        />
      ) : (
        <div className="max-h-[76vh] space-y-5 overflow-y-auto pr-1">
          <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-semibold text-slate-900">{getItemCode(form.item)} · {getItemName(form.item)}</p><p className="mt-0.5 text-xs text-slate-500">{form.item?.unitName ?? "Material planning setting"}</p></div>
            <AppButton variant="secondary" onClick={() => onHistory(form.item)}><History aria-hidden="true" className="h-4 w-4" />Lead-time history</AppButton>
          </div>
          <LeadTimePanel form={form} setForm={setForm} />
          {(errors.configuredLeadTimeDays || errors.leadTimeOverrideDays) && <p className="text-xs font-medium text-red-600">{errors.configuredLeadTimeDays || errors.leadTimeOverrideDays}</p>}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AppInput error={errors.safetyFactor} label="Safety factor" min="0" step="any" type="number" value={form.safetyFactor} onChange={(event) => setForm((current) => ({ ...current, safetyFactor: event.target.value }))} />
            <AppInput error={errors.minimumOrderQuantity} label="Minimum order qty" min="0" placeholder="Optional" step="any" type="number" value={form.minimumOrderQuantity} onChange={(event) => setForm((current) => ({ ...current, minimumOrderQuantity: event.target.value }))} />
            <AppInput error={errors.orderMultiple} label="Order multiple" min="0" placeholder="Optional" step="any" type="number" value={form.orderMultiple} onChange={(event) => setForm((current) => ({ ...current, orderMultiple: event.target.value }))} />
            <AppSelect error={errors.roundingRule} label="Rounding rule" options={PLANNING_ROUNDING_RULE_OPTIONS} value={form.roundingRule} onChange={(roundingRule) => setForm((current) => ({ ...current, roundingRule }))} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <ProcurementToggle checked={form.automaticCalculationEnabled} label="Automatic calculation" description="Use demand, lead time, safety stock, and inventory to calculate a system suggestion." onChange={(checked) => setForm((current) => ({ ...current, automaticCalculationEnabled: checked, manualPlanning: checked ? false : current.manualPlanning }))} />
            <ProcurementToggle checked={form.manualPlanning} label="Manual planning" description="Forces the automatic plan result to zero so a planner must enter a quantity deliberately." onChange={(checked) => setForm((current) => ({ ...current, manualPlanning: checked, automaticCalculationEnabled: checked ? false : current.automaticCalculationEnabled }))} />
          </div>
          {!form.automaticCalculationEnabled && !form.manualPlanning && <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800"><AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><p className="text-xs leading-5"><strong>Both modes are off.</strong> The item will not receive an automatic suggestion, but it is not explicitly flagged for manual planning. Choose the intended mode before saving.</p></div>}
          <ProcurementToggle checked={form.isActive} label="Setting is active" description="Inactive settings are excluded from automatic procurement planning." onChange={(isActive) => setForm((current) => ({ ...current, isActive }))} />
          <ProcurementInlineError message={errors.form} title="Setting could not be saved" />
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2"><AppButton variant="secondary" onClick={onClose}>Cancel</AppButton>{canSave && !loadError && <AppButton disabled={loading} isLoading={saving} loadingText="Saving…" onClick={submit}><Settings2 aria-hidden="true" className="h-4 w-4" />Save setting</AppButton>}</div>
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
    <AppModal isBusy={adding} isOpen={isOpen} maxWidth="max-w-5xl" title={`Lead-time history · ${getItemLabel(item)}`} onClose={adding ? undefined : onClose}>
      <div className="max-h-[76vh] space-y-5 overflow-y-auto pr-1">
        <div className="grid gap-3 rounded-xl border border-brand/20 bg-brand-light/40 p-4 md:grid-cols-[160px_minmax(0,1fr)]"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Computed average</p><p className="mt-1 text-xl font-semibold text-slate-900">{formatProcurementDecimal(average)} days</p></div><p className="self-center text-xs leading-5 text-slate-600">Completed order receipts feed the history-average lead-time source used by automatic planning.</p></div>
        {canManage && <ProcurementSectionCard title="Add received order" description="Received date must be on or after the ordered date."><div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4"><AppInput error={formErrors.reference} label="Reference" required value={form.reference} onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))} /><AppInput error={formErrors.orderedDate} label="Ordered date" required type="date" max={form.receivedDate || toIsoDate(new Date())} value={form.orderedDate} onChange={(event) => setForm((current) => ({ ...current, orderedDate: event.target.value }))} /><AppInput error={formErrors.receivedDate} label="Received date" required type="date" min={form.orderedDate} max={toIsoDate(new Date())} value={form.receivedDate} onChange={(event) => setForm((current) => ({ ...current, receivedDate: event.target.value }))} /><AppInput error={formErrors.notes} label="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></div><div className="flex items-center justify-between gap-3 px-4 pb-4"><ProcurementInlineError message={formErrors.form} /><AppButton isLoading={adding} loadingText="Adding…" onClick={submit}><Plus aria-hidden="true" className="h-4 w-4" />Add record</AppButton></div></ProcurementSectionCard>}
        <ProcurementSectionCard title="Received-order history">
          {error ? <ProcurementErrorState error={error} onRetry={load} /> : (
            <ProcurementTable
              columnCount={5}
              mobileConfig={{
                fields: [1, 2, 3, 4],
                serial: "generated",
                title: 0,
              }}
              emptyContext="Received-order history improves the lead-time average used by automatic planning."
              emptyHint="Add a completed receipt to begin calculating historical lead time."
              emptyTitle={!loading && rows.length === 0 ? "No lead-time history yet" : undefined}
              emptyVariant="empty"
              head={<><th scope="col" className={PROCUREMENT_TABLE_HEADER_CLASS}>Reference</th><th scope="col" className={PROCUREMENT_TABLE_HEADER_CLASS}>Ordered</th><th scope="col" className={PROCUREMENT_TABLE_HEADER_CLASS}>Received</th><th scope="col" className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Lead time</th><th scope="col" className={PROCUREMENT_TABLE_HEADER_CLASS}>Notes</th></>}
              loading={loading}
              minWidth="min-w-[760px]"
              rows={4}
            >
              {rows.map((record, index) => <tr key={getRecordId(record, ["leadTimeHistoryId"]) ?? index}><td className="font-semibold text-slate-800">{record.reference}</td><td>{formatProcurementDate(record.orderedDate)}</td><td>{formatProcurementDate(record.receivedDate)}</td><td className="text-right font-semibold tabular-nums">{formatProcurementDecimal(record.leadTimeDays ?? record.numberOfDays)}</td><td>{record.notes ?? "-"}</td></tr>)}
            </ProcurementTable>
          )}
        </ProcurementSectionCard>
      </div>
    </AppModal>
  );
};

const ProcurementSettingsPage = ({ embedded = false, moduleTabs = null }) => {
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
  const clearFilters = () => {
    setSearch("");
    setMode("all");
    setPage(1);
  };
  const settingsTab = mode === "missing" ? "missing" : "items";
  const tabs = [
    { id: "items", label: "Items", icon: Boxes },
    { id: "missing", label: "Missing", icon: Wrench, count: missingCount },
  ];

  return (
    <section className="min-w-0 space-y-5">
      {!embedded && <PageHeader badge={<><SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />Procurement Planning</>} title="Procurement settings" description="Make lead-time sourcing, planning mode, safety stock, minimum order quantities, and rounding explicit for every purchased material." actions={<AppButton variant="secondary" disabled={loading} onClick={load}><RotateCw aria-hidden="true" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</AppButton>} />}
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
        id="procurement-settings-tabs"
        tabs={tabs}
        onChange={(tab) => {
          setMode(tab === "missing" ? "missing" : "all");
          setPage(1);
        }}
      />
      <div
        id={`procurement-settings-tabs-panel-${settingsTab}`}
        role="tabpanel"
        aria-labelledby={`procurement-settings-tabs-tab-${settingsTab}`}
        className="space-y-6"
      >
      {missingCount > 0 && <button type="button" className="flex w-full items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-amber-800" onClick={() => { setMode("missing"); setPage(1); }}><span className="flex items-start gap-3"><AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span><span className="block text-sm font-semibold">{missingCount} material{missingCount === 1 ? "" : "s"} need configuration</span><span className="mt-0.5 block text-xs leading-5">Configure these before validating a complete automatic plan.</span></span></span><ProcurementPill tone="amber">Open queue</ProcurementPill></button>}
      <ProcurementSectionCard>
        <MobileFilterSheet activeCount={activeFilterCount} onClear={clearFilters}>
          <div className="m-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between"><div className="w-full max-w-md"><AppInput label="Search materials" placeholder="Item code or name" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div><div className="flex flex-wrap gap-2">{QUICK_FILTERS.map((filter) => <button key={filter.id} type="button" className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${mode === filter.id ? "border-brand bg-brand-light text-brand" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`} onClick={() => { setMode(filter.id); setPage(1); }}>{filter.label}{filter.id === "missing" && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-700">{missingCount}</span>}</button>)}</div></div><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><p className="text-xs text-slate-500">{activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}</p>{activeFilterCount > 0 && <AppButton variant="ghost" onClick={clearFilters}>Clear</AppButton>}</div></div>
        </MobileFilterSheet>
        {error ? <ProcurementErrorState error={error} onRetry={load} /> : (
          <ProcurementTable
            columnCount={8}
            mobileConfig={{
              actions: 7,
              fields: [2, 3, 4, 5],
              serial: 0,
              status: 6,
              title: 1,
            }}
            emptyAction={activeFilterCount > 0 ? <AppButton variant="secondary" onClick={clearFilters}>Clear filters</AppButton> : undefined}
            emptyContext="Procurement settings define planning mode, lead time, safety stock and rounding for purchased materials."
            emptyIcon={mode === "missing" ? CheckCircle2 : Wrench}
            emptyHint={activeFilterCount > 0 ? "Clear the current filters to see other purchased materials." : "Configure an eligible purchased material to establish its planning policy."}
            emptyTitle={!loading && rows.length === 0 ? activeFilterCount > 0 ? mode === "missing" ? "No missing settings match these filters" : "No materials match these filters" : "No procurement settings yet" : undefined}
            emptyVariant={activeFilterCount > 0 ? "filtered" : "empty"}
            head={<><th scope="col" aria-label="Row number" className={PROCUREMENT_TABLE_HEADER_CLASS}><span aria-hidden="true">#</span></th><th scope="col" className={PROCUREMENT_TABLE_HEADER_CLASS}>Material</th><th scope="col" className={PROCUREMENT_TABLE_HEADER_CLASS}>Effective lead time</th><th scope="col" className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Safety factor</th><th scope="col" className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Minimum order qty</th><th scope="col" className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Order multiple</th><th scope="col" className={PROCUREMENT_TABLE_HEADER_CLASS}>Mode</th><th scope="col" className={`${PROCUREMENT_TABLE_HEADER_CLASS} text-right`}>Action</th></>}
            loading={loading}
            minWidth="min-w-[1120px]"
          >
            {rows.map((row, index) => { const item = getSettingItem(row); const manual = getProcurementBoolean(row.manualPlanning); const automatic = getProcurementBoolean(row.automaticCalculationEnabled); const active = getProcurementBoolean(row.isActive, true); return <tr key={getRecordId(item, ["itemId"]) ?? index}><td className="text-xs font-semibold tabular-nums text-slate-500">{(page - 1) * pageSize + index + 1}</td><td><p className="font-semibold text-slate-800">{getItemCode(item)}</p><p className="text-xs text-slate-500">{getItemName(item)} · {row.unitName ?? item.unitName ?? "-"}</p></td><td><div className="flex items-center gap-2"><span className="font-semibold tabular-nums">{formatProcurementDecimal(row.effectiveLeadTimeDays)} days</span><ProcurementPill tone="brand">{row.leadTimeSource ?? row.effectiveLeadTimeSource ?? "Configured"}</ProcurementPill></div></td><td className="text-right tabular-nums">{formatProcurementDecimal(row.safetyFactor)}</td><td className="text-right tabular-nums">{formatProcurementDecimal(row.minimumOrderQuantity)}</td><td className="text-right tabular-nums">{formatProcurementDecimal(row.orderMultiple)}</td><td><div className="flex flex-wrap gap-1"><ProcurementPill tone={manual ? "violet" : automatic ? "emerald" : "amber"}>{manual ? "Manual" : automatic ? "Automatic" : "No mode"}</ProcurementPill>{!active && <ProcurementPill tone="slate">Inactive</ProcurementPill>}</div></td><td><div className="flex items-center justify-end gap-0.5"><AppTooltip label="Lead-time history"><button type="button" aria-label="Lead-time history" className={PROCUREMENT_ROW_ACTION_CLASS} onClick={() => setHistoryItem(item)}><History aria-hidden="true" className="h-4 w-4" /></button></AppTooltip><AppTooltip label={capabilities.canCreate || capabilities.canEdit ? "Configure material" : "Requires procurement configuration permission"}><button type="button" aria-label="Configure material" className={PROCUREMENT_ROW_ACTION_CLASS} disabled={!capabilities.canCreate && !capabilities.canEdit} onClick={() => setEditor({ open: true, row })}><Settings2 aria-hidden="true" className="h-4 w-4" /></button></AppTooltip></div></td></tr>; })}
          </ProcurementTable>
        )}
        <ProcurementPagination disabled={loading} {...pagination} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(Number(value)); setPage(1); }} />
      </ProcurementSectionCard>
      </div>
      <SettingEditor canSave={capabilities.canCreate || capabilities.canEdit} isOpen={editor.open} row={editor.row} onClose={() => setEditor({ open: false, row: null })} onSaved={load} onHistory={(item) => setHistoryItem(item)} />
      <LeadTimeHistoryModal canManage={capabilities.canCreate || capabilities.canEdit} item={historyItem} isOpen={Boolean(historyItem)} onClose={() => setHistoryItem(null)} />
    </section>
  );
};

export default ProcurementSettingsPage;
