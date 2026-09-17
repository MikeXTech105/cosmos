import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import {
  DISPATCH_ROUNDING_MODE_HELP,
  DISPATCH_ROUNDING_MODE_LABELS,
  DISPATCH_ROUNDING_MODES,
  DISPATCH_TIER_LABELS,
  DISPATCH_TIERS,
  toDispatchOptions,
} from "../../../constants/dispatchEnums";
import { dispatchSettingService } from "../../../services/dispatch";
import { supplyChainPackagingProfileService } from "../../../services/supplyChain/packagingProfileService";
import { getApiFieldErrors, getApiStatus, isConflictError } from "../../../utils/apiError";
import { ProcurementItemAutocomplete, ProcurementToggle } from "../../procurement/ProcurementShared";
import { SupplyChainInlineError } from "../../supplyChain/SupplyChainShared";
import useSupplyChainChannels from "../../supplyChain/useSupplyChainChannels";
import { getDispatchError } from "../dispatchDisplay";
import { dispatchSettingSchema, getDispatchSchemaErrors } from "../dispatchSchemas";
import useDispatchCapabilities from "../useDispatchCapabilities";

const getItemId = (item) => item?.id ?? item?.itemId ?? "";

const emptyForm = () => ({
  allocationPriority: 0,
  allowLooseQuantity: false,
  channelId: "",
  effectiveFrom: "",
  effectiveTo: "",
  isActive: true,
  item: null,
  minimumDispatchQuantity: 0,
  packagingProfileId: "",
  recurringDemandFactor: 1,
  roundingMode: DISPATCH_ROUNDING_MODES.Exact,
  safetyStockFactor: 1,
  tier: DISPATCH_TIERS.Tier1,
});

const toForm = (record) => ({
  allocationPriority: record?.allocationPriority ?? 0,
  allowLooseQuantity: record?.allowLooseQuantity ?? false,
  channelId: record?.channelId ?? "",
  effectiveFrom: record?.effectiveFrom?.slice?.(0, 10) ?? "",
  effectiveTo: record?.effectiveTo?.slice?.(0, 10) ?? "",
  isActive: record?.isActive ?? true,
  item: record?.itemId
    ? { id: record.itemId, itemCode: record.itemCode, name: record.itemName }
    : null,
  minimumDispatchQuantity: record?.minimumDispatchQuantity ?? 0,
  packagingProfileId: record?.packagingProfileId ?? "",
  recurringDemandFactor: record?.recurringDemandFactor ?? 1,
  roundingMode: record?.roundingMode ?? DISPATCH_ROUNDING_MODES.Exact,
  safetyStockFactor: record?.safetyStockFactor ?? 1,
  tier: record?.tier ?? DISPATCH_TIERS.Tier1,
});

const DispatchSettingFormPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const readOnly = isEdit && searchParams.get("mode") === "view";
  const navigate = useNavigate();
  const capabilities = useDispatchCapabilities({ label: "DispatchPlanning.SkuSettings", route: "/dispatch/settings" });
  const { channels, error: channelError } = useSupplyChainChannels();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [packaging, setPackaging] = useState([]);
  const [packagingLoading, setPackagingLoading] = useState(false);
  const [finishedProductsOnly, setFinishedProductsOnly] = useState(true);
  const [detail, setDetail] = useState({ error: null, loading: isEdit });

  useEffect(() => {
    if (!isEdit) {
      return undefined;
    }

    const controller = new AbortController();

    void Promise.resolve().then(() => {
      if (controller.signal.aborted) {
        return undefined;
      }

      setDetail({ error: null, loading: true });

      return dispatchSettingService
        .getById(id)
        .then((response) => {
          const data = response?.data ?? response;

          setForm(toForm(data));
          setDetail({ error: null, loading: false });
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }

          if (getApiStatus(error) === 404) {
            toast.error("This setting no longer exists.");
            navigate("/dispatch/settings", { replace: true });
            return;
          }

          setDetail({ error: getDispatchError(error, "Unable to load this setting."), loading: false });
        });
    });

    return () => controller.abort();
  }, [id, isEdit, navigate]);

  useEffect(() => {
    const itemId = getItemId(form.item);

    if (!itemId) {
      setPackaging([]);
      return undefined;
    }

    let current = true;
    const timeout = window.setTimeout(async () => {
      setPackagingLoading(true);
      try {
        const response = await supplyChainPackagingProfileService.list({
          IsActive: true,
          ItemId: itemId,
          PageNumber: 1,
          PageSize: 200,
        });

        if (current) {
          setPackaging(Array.isArray(response.data?.items) ? response.data.items : []);
        }
      } catch (error) {
        if (current) {
          setPackaging([]);
          setErrors((existing) => ({ ...existing, packagingProfileId: getDispatchError(error, "Unable to load packaging profiles.") }));
        }
      } finally {
        if (current) setPackagingLoading(false);
      }
    }, 200);

    return () => {
      current = false;
      window.clearTimeout(timeout);
    };
  }, [form.item]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };

  const saveDisabledReason = (isEdit ? capabilities.canUpdate : capabilities.canCreate)
    ? ""
    : `You need ${isEdit ? "edit" : "create"} permission for SKU settings.`;

  const submit = async () => {
    if (readOnly) {
      return;
    }

    if (saveDisabledReason) {
      toast.error(saveDisabledReason);
      return;
    }

    const result = dispatchSettingSchema.safeParse({ ...form, itemId: getItemId(form.item) });

    if (!result.success) {
      setErrors(getDispatchSchemaErrors(result));
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const response = isEdit
        ? await dispatchSettingService.update(id, result.data)
        : await dispatchSettingService.create(result.data);

      toast.success(response.message || `Dispatch setting ${isEdit ? "updated" : "created"}.`);
      navigate("/dispatch/settings");
    } catch (error) {
      if (isEdit && getApiStatus(error) === 404) {
        toast.error("This setting no longer exists.");
        navigate("/dispatch/settings", { replace: true });
        return;
      }

      const fields = getApiFieldErrors(error);
      const message = getDispatchError(error, "Unable to save the setting.");
      const overlapMessage = isConflictError(error) ? message : "";

      setErrors({
        ...fields,
        ...(overlapMessage ? { effectiveFrom: fields.effectiveFrom || overlapMessage, effectiveTo: fields.effectiveTo || overlapMessage } : {}),
        form: Object.keys(fields).length > 0 || overlapMessage ? "" : message,
      });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const numeric = (field, label, min = "0") => (
    <AppInput
      disabled={readOnly || saving}
      error={errors[field]}
      label={label}
      min={min}
      step="any"
      type="number"
      value={form[field]}
      onChange={(event) => setField(field, event.target.value)}
    />
  );

  const title = readOnly ? "Dispatch setting details" : isEdit ? "Edit dispatch setting" : "New dispatch setting";

  if (isEdit && detail.error) {
    return (
      <div className="space-y-5">
        <PageHeader badge="Dispatch Planning" title={title} />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{detail.error}</div>
        <AppButton variant="secondary" onClick={() => navigate("/dispatch/settings")}>
          <ArrowLeft className="h-4 w-4" /> Back to SKU settings
        </AppButton>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        badge="Dispatch Planning"
        title={title}
        description="Define global and channel-specific SKU policies used by dispatch calculations."
        actions={
          <>
            <AppButton variant="secondary" onClick={() => navigate("/dispatch/settings")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </AppButton>
            {!readOnly && (
              <AppButton isLoading={saving} loadingText="Saving…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined} onClick={submit}>
                <Save className="h-4 w-4" /> Save setting
              </AppButton>
            )}
          </>
        }
      />

      <SupplyChainInlineError message={channelError} title="Channels unavailable" />

      {isEdit && detail.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <ProcurementItemAutocomplete
                disabled={readOnly || saving}
                error={errors.itemId}
                label="Existing Item"
                mode={finishedProductsOnly ? "finished" : "any"}
                required
                value={form.item}
                onChange={(item) => {
                  setField("item", item);
                  setField("packagingProfileId", "");
                }}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <ProcurementToggle
                checked={finishedProductsOnly}
                description="Uses ProcurementClassification = 1. Turn this off when legacy Item classifications are incomplete."
                disabled={readOnly || saving}
                label="Finished products only"
                onChange={(checked) => {
                  setFinishedProductsOnly(checked);
                  setField("item", null);
                  setField("packagingProfileId", "");
                }}
              />
            </div>
            <AppSelect
              disabled={readOnly || saving}
              error={errors.channelId}
              label="Scope"
              options={[
                { label: "All channels (global)", value: "" },
                ...channels.map((channel) => ({ label: `${channel.code} — ${channel.name}`, value: channel.id })),
              ]}
              value={form.channelId}
              onChange={(value) => setField("channelId", value)}
            />
            <AppSelect
              disabled={readOnly || saving || packagingLoading}
              error={errors.packagingProfileId}
              label="Packaging profile"
              options={[
                { label: "Use precedence defaults", value: "" },
                ...packaging.map((profile) => ({ label: `${profile.packagingCode} — ${profile.packagingName}`, value: profile.id })),
              ]}
              value={form.packagingProfileId}
              onChange={(value) => setField("packagingProfileId", value)}
            />
            <AppSelect
              disabled={readOnly || saving}
              error={errors.tier}
              label="Tier"
              options={toDispatchOptions(DISPATCH_TIER_LABELS)}
              value={form.tier}
              onChange={(value) => setField("tier", value)}
            />
            {numeric("safetyStockFactor", "Safety stock factor", "0.000001")}
            {numeric("recurringDemandFactor", "Recurring demand factor", "0.000001")}
            {numeric("minimumDispatchQuantity", "Minimum dispatch quantity")}
            <div className={form.allowLooseQuantity ? "opacity-60" : ""}>
              <AppSelect
                disabled={readOnly || saving}
                error={errors.roundingMode}
                label="Rounding mode"
                options={toDispatchOptions(DISPATCH_ROUNDING_MODE_LABELS)}
                value={form.roundingMode}
                onChange={(value) => setField("roundingMode", value)}
              />
              <p className="mt-1 text-xs leading-5 text-slate-500">{DISPATCH_ROUNDING_MODE_HELP[form.roundingMode]}</p>
            </div>
            {numeric("allocationPriority", "Allocation priority")}
            <AppInput
              disabled={readOnly || saving}
              error={errors.effectiveFrom}
              label="Effective from"
              type="date"
              value={form.effectiveFrom}
              onChange={(event) => setField("effectiveFrom", event.target.value)}
            />
            <AppInput
              disabled={readOnly || saving}
              error={errors.effectiveTo}
              label="Effective to"
              min={form.effectiveFrom || undefined}
              type="date"
              value={form.effectiveTo}
              onChange={(event) => setField("effectiveTo", event.target.value)}
            />
            <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-700">
              <input checked={form.allowLooseQuantity} className="h-4 w-4 rounded border-slate-300 accent-brand" disabled={readOnly || saving} type="checkbox" onChange={(event) => setField("allowLooseQuantity", event.target.checked)} />
              Allow loose quantity
            </label>
            <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-700">
              <input checked={form.isActive} className="h-4 w-4 rounded border-slate-300 accent-brand" disabled={readOnly || saving} type="checkbox" onChange={(event) => setField("isActive", event.target.checked)} />
              Setting is active
            </label>
          </div>
          {form.allowLooseQuantity ? (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Loose quantity is allowed, so box rounding may be bypassed by the backend policy.
            </p>
          ) : null}
          <div className="mt-4">
            <SupplyChainInlineError message={errors.form} title="Setting conflict" />
          </div>
        </section>
      )}

      {!readOnly && (
        <div className="sticky bottom-4 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:flex-row sm:justify-end">
          <AppButton variant="secondary" disabled={saving} onClick={() => navigate("/dispatch/settings")}>
            Cancel
          </AppButton>
          <AppButton isLoading={saving} loadingText="Saving…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined} onClick={submit}>
            Save setting
          </AppButton>
        </div>
      )}
    </section>
  );
};

export default DispatchSettingFormPage;
