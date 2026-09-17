import { AlertTriangle, ArrowLeft, History, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import {
  PLANNING_ROUNDING_RULE_OPTIONS,
  PlanningRoundingRule,
} from "../../../constants/procurementEnums";
import { procurementSettingService } from "../../../services/procurement/procurementSettingService";
import LeadTimeHistoryModal from "./LeadTimeHistoryModal";
import {
  ProcurementErrorState,
  ProcurementInlineError,
  ProcurementLoadingRows,
  ProcurementPill,
  ProcurementToggle,
} from "../ProcurementShared";
import {
  formatProcurementDecimal,
  getApiStatus,
  getFieldErrorMap,
  getItemCode,
  getItemName,
  getProcurementBoolean,
  getProcurementError,
  getRecordId,
  hasDecimalPrecision,
  toNumberOrNull,
} from "../procurementHelpers";
import useProcurementCapabilities from "../useProcurementCapabilities";

const getSettingItem = (setting) =>
  setting?.item ?? {
    itemCode: setting?.itemCode,
    itemId: setting?.itemId,
    itemName: setting?.itemName,
    unitName: setting?.unitName,
  };

const toSettingForm = (setting, item) => ({
  automaticCalculationEnabled: getProcurementBoolean(setting?.automaticCalculationEnabled, true),
  configuredLeadTimeDays: String(setting?.configuredLeadTimeDays ?? setting?.leadTimeDays ?? ""),
  historyAverageLeadTimeDays: setting?.historyAverageLeadTimeDays ?? setting?.averageLeadTimeDays ?? null,
  isActive: getProcurementBoolean(setting?.isActive, true),
  item: item ?? getSettingItem(setting),
  leadTimeOverrideDays: String(setting?.leadTimeOverrideDays ?? ""),
  minimumOrderQuantity: String(setting?.minimumOrderQuantity ?? ""),
  orderMultiple: String(setting?.orderMultiple ?? ""),
  roundingRule: setting?.roundingRule ?? PlanningRoundingRule.None,
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
            <p className="text-lg font-semibold tabular-nums text-slate-900">{formatProcurementDecimal(effective.value)} days</p>
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
          onChange={(event) => setForm((current) => ({ ...current, configuredLeadTimeDays: event.target.value }))}
        />
        <AppInput
          label="Override days"
          min="0"
          placeholder="Optional"
          step="any"
          type="number"
          value={form.leadTimeOverrideDays}
          onChange={(event) => setForm((current) => ({ ...current, leadTimeOverrideDays: event.target.value }))}
        />
        <AppInput
          disabled
          label="History average"
          value={form.historyAverageLeadTimeDays === null ? "No received orders" : `${formatProcurementDecimal(form.historyAverageLeadTimeDays)} days`}
        />
      </div>
    </div>
  );
};

const ProcurementSettingFormPage = () => {
  const { itemId: routeItemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const row = location.state?.row ?? null;
  const capabilities = useProcurementCapabilities({ label: "ProcurementPlanning.Settings", resource: "ProcurementPlanning.Settings", route: "/procurement/settings" });
  const canSave = capabilities.canCreate || capabilities.canEdit;

  const [form, setForm] = useState(() => toSettingForm(row, getSettingItem(row)));
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    let active = true;

    void Promise.resolve().then(async () => {
      const item = getSettingItem(row) ?? { itemId: routeItemId };
      const itemId = getRecordId(item, ["itemId"]) || routeItemId;

      setLoading(true);
      setErrors({});
      setLoadError(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const backRoute = "/procurement/setup?tab=settings";

  const submit = async () => {
    if (!canSave) {
      toast.error("You don't have permission to save procurement settings.");
      return;
    }

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
      validation.minimumOrderQuantity = "Minimum order qty must be greater than zero when set.";
    }
    if (orderMultiple !== null && !(orderMultiple > 0)) {
      validation.orderMultiple = "Order multiple must be greater than zero when set.";
    }
    if (!form.manualPlanning && effective === null) {
      validation.configuredLeadTimeDays = "An effective lead time is required unless manual planning is enabled.";
    }
    ["configuredLeadTimeDays", "leadTimeOverrideDays", "safetyFactor", "minimumOrderQuantity", "orderMultiple"].forEach((key) => {
      if (!hasDecimalPrecision(form[key])) validation[key] = "Use no more than 6 decimal places.";
    });

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    const itemId = getRecordId(form.item, ["itemId"]) || routeItemId;
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
      navigate(backRoute);
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

  const title = existing ? "Edit procurement setting" : "Configure procurement setting";

  return (
    <section className="space-y-6">
      <PageHeader
        badge={<>Procurement Planning</>}
        title={title}
        description="Make lead-time sourcing, planning mode, safety stock, minimum order quantities, and rounding explicit for this material."
        actions={
          <>
            <AppButton variant="secondary" onClick={() => navigate(backRoute)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </AppButton>
            {canSave && !loadError && (
              <AppButton disabled={loading} isLoading={saving} loadingText="Saving…" onClick={submit}>
                <Save className="h-4 w-4" /> Save setting
              </AppButton>
            )}
          </>
        }
      />

      {loading ? (
        <ProcurementLoadingRows columns={3} rows={5} />
      ) : loadError ? (
        <ProcurementErrorState error={loadError} onRetry={() => window.location.reload()} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{getItemCode(form.item)} · {getItemName(form.item)}</p>
              <p className="mt-0.5 text-xs text-slate-500">{form.item?.unitName ?? "Material planning setting"}</p>
            </div>
            <AppButton variant="secondary" onClick={() => setHistoryOpen(true)}>
              <History className="h-4 w-4" /> Lead-time history
            </AppButton>
          </div>

          <LeadTimePanel form={form} setForm={setForm} />
          {(errors.configuredLeadTimeDays || errors.leadTimeOverrideDays) && (
            <p className="text-xs font-medium text-red-600">{errors.configuredLeadTimeDays || errors.leadTimeOverrideDays}</p>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <AppInput error={errors.safetyFactor} label="Safety factor" min="0" step="any" type="number" value={form.safetyFactor} onChange={(event) => setForm((current) => ({ ...current, safetyFactor: event.target.value }))} />
              <AppInput error={errors.minimumOrderQuantity} label="Minimum order qty" min="0" placeholder="Optional" step="any" type="number" value={form.minimumOrderQuantity} onChange={(event) => setForm((current) => ({ ...current, minimumOrderQuantity: event.target.value }))} />
              <AppInput error={errors.orderMultiple} label="Order multiple" min="0" placeholder="Optional" step="any" type="number" value={form.orderMultiple} onChange={(event) => setForm((current) => ({ ...current, orderMultiple: event.target.value }))} />
              <AppSelect error={errors.roundingRule} label="Rounding rule" options={PLANNING_ROUNDING_RULE_OPTIONS} value={form.roundingRule} onChange={(roundingRule) => setForm((current) => ({ ...current, roundingRule }))} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <ProcurementToggle
                checked={form.automaticCalculationEnabled}
                label="Automatic calculation"
                description="Use demand, lead time, safety stock, and inventory to calculate a system suggestion."
                onChange={(checked) => setForm((current) => ({ ...current, automaticCalculationEnabled: checked, manualPlanning: checked ? false : current.manualPlanning }))}
              />
              <ProcurementToggle
                checked={form.manualPlanning}
                label="Manual planning"
                description="Forces the automatic plan result to zero so a planner must enter a quantity deliberately."
                onChange={(checked) => setForm((current) => ({ ...current, manualPlanning: checked, automaticCalculationEnabled: checked ? false : current.automaticCalculationEnabled }))}
              />
            </div>
            {!form.automaticCalculationEnabled && !form.manualPlanning && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-xs leading-5">
                  <strong>Both modes are off.</strong> The item will not receive an automatic suggestion, but it is not explicitly flagged for manual planning. Choose the intended mode before saving.
                </p>
              </div>
            )}
            <div className="mt-4">
              <ProcurementToggle checked={form.isActive} label="Setting is active" description="Inactive settings are excluded from automatic procurement planning." onChange={(isActive) => setForm((current) => ({ ...current, isActive }))} />
            </div>
            <div className="mt-4">
              <ProcurementInlineError message={errors.form} title="Setting could not be saved" />
            </div>
          </section>
        </div>
      )}

      {!loading && !loadError && canSave && (
        <div className="sticky bottom-4 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:flex-row sm:justify-end">
          <AppButton variant="secondary" disabled={saving} onClick={() => navigate(backRoute)}>
            Cancel
          </AppButton>
          <AppButton isLoading={saving} loadingText="Saving…" onClick={submit}>
            Save setting
          </AppButton>
        </div>
      )}

      <LeadTimeHistoryModal canManage={canSave} isOpen={historyOpen} item={form.item} onClose={() => setHistoryOpen(false)} />
    </section>
  );
};

export default ProcurementSettingFormPage;
