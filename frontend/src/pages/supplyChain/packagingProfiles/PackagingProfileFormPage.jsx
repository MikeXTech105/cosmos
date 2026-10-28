import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import {
  SUPPLY_CHAIN_DIMENSION_UNITS,
  SUPPLY_CHAIN_WEIGHT_UNITS,
} from "../../../constants/supplyChainEnums";
import { supplyChainPackagingProfileService } from "../../../services/supplyChain/packagingProfileService";
import { getApiErrorMessage, getApiFieldErrors } from "../../../utils/apiError";
import { ProcurementItemAutocomplete } from "../../procurement/ProcurementShared";
import { getSchemaErrors, packagingProfileSchema } from "../supplyChainSchemas";
import { SupplyChainInlineError } from "../SupplyChainShared";
import useSupplyChainCapabilities from "../useSupplyChainCapabilities";
import useSupplyChainChannels from "../useSupplyChainChannels";
import PackagingConversionPanel from "../../manufacturing/configuration/PackagingConversionPanel";

const getItemId = (item) => item?.id ?? item?.itemId ?? "";

const emptyForm = () => ({
  channelId: "",
  dimensionUnit: "CM",
  effectiveFrom: "",
  effectiveTo: "",
  grossWeight: "",
  height: "",
  isActive: true,
  isDefault: false,
  item: null,
  length: "",
  netWeight: "",
  packagingCode: "",
  packagingName: "",
  unitsPerBox: 1,
  volumetricDivisor: "",
  weightUnit: "KG",
  width: "",
});

const toForm = (record) => ({
  channelId: record?.channelId ?? "",
  dimensionUnit: record?.dimensionUnit ?? "CM",
  effectiveFrom: record?.effectiveFrom?.slice?.(0, 10) ?? "",
  effectiveTo: record?.effectiveTo?.slice?.(0, 10) ?? "",
  grossWeight: record?.grossWeight ?? "",
  height: record?.height ?? "",
  isActive: record?.isActive ?? true,
  isDefault: record?.isDefault ?? false,
  item: record?.itemId
    ? { id: record.itemId, itemCode: record.itemCode, name: record.itemName }
    : null,
  length: record?.length ?? "",
  netWeight: record?.netWeight ?? "",
  packagingCode: record?.packagingCode ?? "",
  packagingName: record?.packagingName ?? "",
  unitsPerBox: record?.unitsPerBox ?? 1,
  volumetricDivisor: record?.volumetricDivisor ?? "",
  weightUnit: record?.weightUnit ?? "KG",
  width: record?.width ?? "",
});

const PackagingProfileFormPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const readOnly = isEdit && searchParams.get("mode") === "view";
  const navigate = useNavigate();
  const capabilities = useSupplyChainCapabilities({
    label: "SupplyChain.PackagingProfiles",
    resource: "SupplyChain.PackagingProfiles",
    route: "/supply-chain/packaging-profiles",
  });
  const { channels, error: channelError } = useSupplyChainChannels();
  const profileReadOnly = readOnly || !(isEdit ? capabilities.canEdit : capabilities.canCreate);

  const [record, setRecord] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
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

      return supplyChainPackagingProfileService
        .getById(id)
        .then((response) => {
          const data = response?.data ?? response;

          setRecord(data);
          setForm(toForm(data));
          setDetail({ error: null, loading: false });
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }

          setDetail({ error: getApiErrorMessage(error, "Unable to load this packaging profile."), loading: false });
        });
    });

    return () => controller.abort();
  }, [id, isEdit]);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const saveDisabledReason = (isEdit ? capabilities.canEdit : capabilities.canCreate)
    ? ""
    : `You need ${isEdit ? "edit" : "create"} permission for packaging profiles.`;

  const submit = async () => {
    if (readOnly) {
      return;
    }

    if (saveDisabledReason) {
      toast.error(saveDisabledReason);
      return;
    }

    const result = packagingProfileSchema.safeParse({ ...form, itemId: getItemId(form.item) });

    if (!result.success) {
      setErrors(getSchemaErrors(result));
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const response = isEdit
        ? await supplyChainPackagingProfileService.update(id, result.data)
        : await supplyChainPackagingProfileService.create(result.data);

      toast.success(response.message || `Packaging profile ${isEdit ? "updated" : "created"}.`);
      const savedId = response?.data?.id ?? (isEdit ? id : null);
      if (!savedId) {
        setErrors({ form: "The profile was saved but its identity was not returned. Open the profile list and verify its conversion before using it." });
        return;
      }
      navigate(`/supply-chain/packaging-profiles/${savedId}/edit?step=conversion`);
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);
      const message = getApiErrorMessage(error, "Unable to save the packaging profile.");

      setErrors(Object.keys(fieldErrors).length > 0 ? fieldErrors : { form: message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const numericField = (key, label, { min = "0", ...props } = {}) => (
    <AppInput
      {...props}
      disabled={profileReadOnly || saving}
      error={errors[key]}
      label={label}
      min={min}
      step="any"
      type="number"
      value={form[key]}
      onChange={(event) => setField(key, event.target.value)}
    />
  );

  const title = readOnly ? "Packaging profile details" : isEdit ? "Edit packaging profile" : "New packaging profile";

  if (isEdit && detail.error) {
    return (
      <div className="space-y-5">
        <PageHeader badge="Supply Chain" title={title} />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{detail.error}</div>
        <AppButton variant="secondary" onClick={() => navigate("/supply-chain/packaging-profiles")}>
          <ArrowLeft className="h-4 w-4" /> Back to packaging profiles
        </AppButton>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        badge="Supply Chain"
        title={title}
        description="Maintain channel-aware packaging data while keeping API-calculated volumetric weight authoritative."
        actions={
          <>
            <AppButton variant="secondary" onClick={() => navigate("/supply-chain/packaging-profiles")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </AppButton>
            {!readOnly && (
              <AppButton isLoading={saving} loadingText="Saving…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined} onClick={submit}>
                <Save className="h-4 w-4" /> Save profile
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
                disabled={profileReadOnly || saving}
                error={errors.itemId}
                label="Existing Item"
                required
                value={form.item}
                onChange={(item) => setField("item", item)}
              />
            </div>
            <AppSelect
              disabled={profileReadOnly || saving}
              error={errors.channelId}
              label="Channel"
              options={[
                { label: "All channels", value: "" },
                ...channels.map((channel) => ({ label: `${channel.code} — ${channel.name}`, value: channel.id })),
              ]}
              value={form.channelId}
              onChange={(value) => setField("channelId", value)}
            />
            <AppInput
              disabled={profileReadOnly || saving}
              error={errors.packagingCode}
              label="Packaging code"
              required
              value={form.packagingCode}
              onChange={(event) => setField("packagingCode", event.target.value)}
            />
            <AppInput
              disabled={profileReadOnly || saving}
              error={errors.packagingName}
              label="Packaging name"
              value={form.packagingName}
              onChange={(event) => setField("packagingName", event.target.value)}
            />
            {numericField("unitsPerBox", "Units per box", { min: "0", required: true, step: "any" })}
            <p className="sm:col-span-2 lg:col-span-3 text-sm text-slate-600">Example: 1 box contains {form.unitsPerBox || "?"} Item base units. Verify the actual source-to-base relationship after saving; a dimension or a mould cavity does not establish this conversion.</p>
            <details className="sm:col-span-2 lg:col-span-3 rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-semibold">Advanced dimensions, weight and volumetric policy</summary><p className="my-3 text-xs text-slate-500">Volumetric weight uses length × width × height ÷ the configured divisor. Gross weight and calculated volumetric weight remain separate; use the actual carrier unit basis.</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {numericField("length", "Length")}
            {numericField("width", "Width")}
            {numericField("height", "Height")}
            <AppSelect
              disabled={profileReadOnly || saving}
              error={errors.dimensionUnit}
              label="Dimension unit"
              options={SUPPLY_CHAIN_DIMENSION_UNITS}
              value={form.dimensionUnit}
              onChange={(value) => setField("dimensionUnit", value)}
            />
            {numericField("grossWeight", "Gross weight")}
            {numericField("netWeight", "Net weight")}
            <AppSelect
              disabled={profileReadOnly || saving}
              error={errors.weightUnit}
              label="Weight unit"
              options={SUPPLY_CHAIN_WEIGHT_UNITS}
              value={form.weightUnit}
              onChange={(value) => setField("weightUnit", value)}
            />
            {numericField("volumetricDivisor", "Volumetric divisor", { min: "0.000001" })}
            <AppInput
              disabled
              helperText={
                form.volumetricDivisor
                  ? `Calculated by the API using divisor ${form.volumetricDivisor}.`
                  : "Calculated by the API after save."
              }
              label="Calculated volumetric weight"
              value={
                record?.calculatedVolumetricWeight === null || record?.calculatedVolumetricWeight === undefined
                  ? ""
                  : record.calculatedVolumetricWeight
              }
            />
            </div></details>
            <AppInput
              disabled={profileReadOnly || saving}
              error={errors.effectiveFrom}
              label="Effective from"
              type="date"
              value={form.effectiveFrom}
              onChange={(event) => setField("effectiveFrom", event.target.value)}
            />
            <AppInput
              disabled={profileReadOnly || saving}
              error={errors.effectiveTo}
              label="Effective to"
              min={form.effectiveFrom || undefined}
              type="date"
              value={form.effectiveTo}
              onChange={(event) => setField("effectiveTo", event.target.value)}
            />
            <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-700">
              <input checked={form.isDefault} className="h-4 w-4 rounded border-slate-300 accent-brand" disabled={profileReadOnly || saving} type="checkbox" onChange={(event) => setField("isDefault", event.target.checked)} />
              Default profile
            </label>
            <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-700">
              <input checked={form.isActive} className="h-4 w-4 rounded border-slate-300 accent-brand" disabled={profileReadOnly || saving} type="checkbox" onChange={(event) => setField("isActive", event.target.checked)} />
              Profile is active
            </label>
          </div>
          <div className="mt-4">
            <SupplyChainInlineError message={errors.form} />
          </div>
        </section>
      )}

      {isEdit && record && <div id="packaging-conversion"><p className="mb-3 rounded-xl border border-brand/20 bg-brand/5 p-4 text-sm text-slate-700">Next: verify the source and base units below. Saving the profile alone does not approve its conversion. A colleague with Packaging Profiles approval can complete this step.</p><PackagingConversionPanel profileId={id} readOnly={readOnly} /></div>}

      {!readOnly && (
        <div className="sticky bottom-4 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:flex-row sm:justify-end">
          <AppButton variant="secondary" disabled={saving} onClick={() => navigate("/supply-chain/packaging-profiles")}>
            Cancel
          </AppButton>
          <AppButton isLoading={saving} loadingText="Saving…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined} onClick={submit}>
            Save & verify conversion
          </AppButton>
        </div>
      )}
    </section>
  );
};

export default PackagingProfileFormPage;
