import { Box, PackagePlus, RefreshCw, Scale } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import AppLookup from "../../../components/common/AppLookup";
import { lookupPage } from "../../../utils/lookupPage";
import AppTooltip from "../../../components/common/AppTooltip";
import { shipmentPackingService } from "../../../services/shipments";
import { supplyChainPackagingProfileService } from "../../../services/supplyChain/packagingProfileService";
import { isConflictError } from "../../../utils/apiError";
import {
  getPackingReconciliation,
  isMixedPackageAllocation,
} from "../../../utils/shipmentOperations";
import {
  DisabledShipmentAction,
  InventoryEffectNotice,
  ShipmentConflict,
} from "../ShipmentShared";
import {
  formatShipmentNumber,
  getShipmentMutationMessage,
} from "../shipmentDisplay";
import {
  getShipmentSchemaErrors,
  shipmentPackageSchema,
} from "../shipmentSchemas";

const emptyPackage = (shipment) => ({
  barcode: "",
  dimensionUnit: "cm",
  grossWeight: "",
  height: "",
  isMixedPackage: false,
  items: (shipment.items ?? []).map((item) => ({
    quantity: "",
    shipmentItemId: item.id,
  })),
  length: "",
  netWeight: "",
  notes: "",
  packageNumber: "",
  packageType: "",
  packagingProfileId: "",
  sealNumber: "",
  trackingLabel: "",
  volumetricDivisor: "",
  weightUnit: "kg",
  width: "",
});

const PackageBuilderModal = ({
  action,
  isOpen,
  onClose,
  onSaved,
  packagingProfiles,
  shipment,
}) => {
  const [form, setForm] = useState(() => emptyPackage(shipment));
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timeout = window.setTimeout(() => {
      setForm(emptyPackage(shipment));
      setErrors({});
      setConflict(null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isOpen, shipment]);

  const mixed = isMixedPackageAllocation(form.items);
  const reconciliation = useMemo(
    () =>
      getPackingReconciliation(
        shipment.items,
        shipment.packages,
        form.items,
      ),
    [form.items, shipment.items, shipment.packages],
  );
  const overAllocated = reconciliation.some((item) => item.isOverAllocated);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };

  const setQuantity = (index, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, quantity: value } : item,
      ),
    }));
    setErrors((current) => ({
      ...current,
      [`items.${index}.quantity`]: "",
      form: "",
    }));
  };

  const submit = async () => {
    const parsed = shipmentPackageSchema.safeParse({
      ...form,
      isMixedPackage: mixed || form.isMixedPackage,
    });
    if (!parsed.success) {
      setErrors(getShipmentSchemaErrors(parsed));
      return;
    }
    if (overAllocated) {
      setErrors({
        form: "Package allocations cannot exceed planned quantities.",
      });
      return;
    }

    setSaving(true);
    setErrors({});
    setConflict(null);
    try {
      const response = await shipmentPackingService.savePackage(
        shipment.id,
        {
          ...parsed.data,
          items: parsed.data.items.filter((item) => item.quantity > 0),
        },
      );
      toast.success(response.message || "Package saved.");
      await onSaved();
      onClose();
    } catch (error) {
      const message = getShipmentMutationMessage(
        error,
        "Unable to save this package.",
      );
      setErrors((current) => ({ ...current, form: message }));
      if (isConflictError(error)) setConflict(error);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      isBusy={saving}
      isOpen={isOpen}
      maxWidth="max-w-5xl"
      title="Build shipment package"
      onClose={saving ? undefined : onClose}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AppInput
          disabled={saving}
          error={errors.packageNumber}
          label="Package number" required
          value={form.packageNumber}
          onChange={(event) => setField("packageNumber", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.packageType}
          label="Package type" required
          placeholder="Box, bag, pallet…"
          value={form.packageType}
          onChange={(event) => setField("packageType", event.target.value)}
        />
        <AppLookup
          disabled={saving}
          error={errors.packagingProfileId}
          label="Packaging profile"
          initialOptions={packagingProfiles}
          loadPage={async ({ search, page, pageSize }) => lookupPage(await supplyChainPackagingProfileService.list({ IsActive: true, Search: search, PageNumber: page, PageSize: pageSize }), page, pageSize)}
          loadById={async id => (await supplyChainPackagingProfileService.getById(id)).data}
          getOptionLabel={profile => `${profile.packagingCode ?? ""} — ${profile.packagingName ?? ""}`}
          value={form.packagingProfileId}
          onChange={(value) => setField("packagingProfileId", value)}
        />
        <AppSelect
          disabled={saving}
          error={errors.dimensionUnit}
          label="Dimension unit"
          options={[
            { label: "Centimetres", value: "cm" },
            { label: "Millimetres", value: "mm" },
            { label: "Metres", value: "m" },
            { label: "Inches", value: "in" },
          ]}
          value={form.dimensionUnit}
          onChange={(value) => setField("dimensionUnit", value)}
        />
        {[
          ["length", "Length"],
          ["width", "Width"],
          ["height", "Height"],
          ["grossWeight", "Gross weight"],
          ["netWeight", "Net weight"],
          ["volumetricDivisor", "Volumetric divisor"],
        ].map(([field, label]) => (
          <AppInput
            disabled={saving}
            error={errors[field]}
            key={field}
            label={label}
            min="0"
            step="any"
            type="number"
            value={form[field]}
            onChange={(event) => setField(field, event.target.value)}
          />
        ))}
        <AppSelect
          disabled={saving}
          error={errors.weightUnit}
          label="Weight unit"
          options={[
            { label: "Kilograms", value: "kg" },
            { label: "Grams", value: "g" },
            { label: "Pounds", value: "lb" },
          ]}
          value={form.weightUnit}
          onChange={(value) => setField("weightUnit", value)}
        />
        <AppInput
          disabled={saving}
          error={errors.trackingLabel}
          label="Tracking label"
          value={form.trackingLabel}
          onChange={(event) => setField("trackingLabel", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.barcode}
          label="Barcode"
          value={form.barcode}
          onChange={(event) => setField("barcode", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.sealNumber}
          label="Seal number"
          value={form.sealNumber}
          onChange={(event) => setField("sealNumber", event.target.value)}
        />
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Item allocation
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Under-allocation may be saved progressively. Over-allocation is
              blocked.
            </p>
          </div>
          {mixed ? (
            <AppTooltip label="More than one shipment item is allocated, so this package must be mixed.">
              <label className="flex cursor-not-allowed items-center gap-2 text-xs font-semibold text-slate-600">
                <input checked disabled type="checkbox" />
                Mixed package
              </label>
            </AppTooltip>
          ) : (
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                checked={form.isMixedPackage}
                disabled={saving}
                type="checkbox"
                onChange={(event) =>
                  setField("isMixedPackage", event.target.checked)
                }
              />
              Mixed package
            </label>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {(shipment.items ?? []).map((item, index) => {
            const result = reconciliation[index];

            return (
              <div
                className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_180px_220px]"
                key={item.id}
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {item.itemNameSnapshot}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.itemCodeSnapshot} · {item.channelSkuSnapshot || "No channel SKU"}
                  </p>
                </div>
                <AppInput
                  disabled={saving}
                  error={errors[`items.${index}.quantity`]}
                  label="Quantity in package"
                  min="0"
                  step="any"
                  type="number"
                  value={form.items[index]?.quantity ?? ""}
                  onChange={(event) => setQuantity(index, event.target.value)}
                />
                <div
                  className={[
                    "rounded-lg border px-3 py-2 text-xs",
                    result?.isOverAllocated
                      ? "border-red-200 bg-red-50 text-red-700"
                      : result?.isUnderAllocated
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700",
                  ].join(" ")}
                >
                  <p className="font-semibold">
                    Remaining {formatShipmentNumber(result?.remaining, "0")}
                  </p>
                  <p className="mt-0.5">
                    Planned {formatShipmentNumber(result?.planned, "0")} −
                    allocated {formatShipmentNumber(result?.allocated, "0")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <label
          className="mb-1.5 block text-[13px] font-medium text-slate-700"
          htmlFor="package-notes"
        >
          Notes
        </label>
        <textarea
          className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          disabled={saving}
          id="package-notes"
          value={form.notes}
          onChange={(event) => setField("notes", event.target.value)}
        />
      </div>
      <div className="mt-4">
        <InventoryEffectNotice />
      </div>
      {errors.form ? (
        <p className="mt-4 text-sm font-medium text-red-600">{errors.form}</p>
      ) : null}
      <div className="mt-4">
        <ShipmentConflict
          error={conflict}
          onRefresh={() => {
            setConflict(null);
            void onSaved();
          }}
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton disabled={saving} variant="secondary" onClick={onClose}>
          Back
        </AppButton>
        {overAllocated || !action.enabled ? (
          <DisabledShipmentAction
            reason={
              overAllocated
                ? "Reduce package quantities so no item exceeds its planned quantity."
                : action.reason
            }
          >
            <AppButton disabled>Save package</AppButton>
          </DisabledShipmentAction>
        ) : (
          <AppButton
            isLoading={saving}
            loadingText="Saving…"
            onClick={submit}
          >
            Save package
          </AppButton>
        )}
      </div>
    </AppModal>
  );
};

const Toggle = ({ checked, disabled, label, onChange }) => (
  <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
    <input
      checked={checked}
      className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/20"
      disabled={disabled}
      type="checkbox"
      onChange={(event) => onChange(event.target.checked)}
    />
    {label}
  </label>
);

const ShipmentPackingTab = ({ action, onWritten, shipment }) => {
  const [allowMixedPackages, setAllowMixedPackages] = useState(false);
  const [includeLoosePackage, setIncludeLoosePackage] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [packagingProfiles, setPackagingProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [removeReason, setRemoveReason] = useState("");
  const [removeIntent, setRemoveIntent] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const canRemove = action.canRepack ?? action.enabled;

  const removePackage = async () => {
    if (removeBusy || !removing || !canRemove) return;
    if (!removeReason.trim() || !shipment.version) {
      setRemoveError("Enter a reason and reload the current shipment version before removal.");
      return;
    }
    const intent = removeIntent ?? { version: shipment.version, commandKey: crypto.randomUUID(), reason: removeReason.trim() };
    setRemoveIntent(intent);
    setRemoveBusy(true);
    setRemoveError("");
    try {
      await shipmentPackingService.removePackage(shipment.id, removing.id, intent);
      // Keep the supported command identity if authoritative readback fails.
      await onWritten();
      await loadSuggestions();
      setRemoving(null);
      setRemoveIntent(null);
      toast.success("Draft package removed. Verify units and conversion, then build the replacement package. Stock is unchanged.");
    } catch (failure) {
      setRemoveError(getShipmentMutationMessage(failure, "Removal could not be confirmed. Retry the same removal, or reload before another change."));
    } finally { setRemoveBusy(false); }
  };

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await shipmentPackingService.getSuggestions(
        shipment.id,
        {
          AllowMixedPackages: allowMixedPackages,
          IncludeLoosePackage: includeLoosePackage,
        },
      );
      setSuggestions(
        Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.items)
            ? response.data.items
            : [],
      );
    } catch (requestError) {
      setSuggestions([]);
      setError(
        getShipmentMutationMessage(
          requestError,
          "Unable to load packing suggestions.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [allowMixedPackages, includeLoosePackage, shipment.id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadSuggestions(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadSuggestions]);

  useEffect(() => {
    let current = true;
    const load = async () => {
      try {
        const response = await supplyChainPackagingProfileService.list({
          IsActive: true,
          PageNumber: 1,
          PageSize: 200,
        });
        if (current) {
          setPackagingProfiles(
            Array.isArray(response.data?.items) ? response.data.items : [],
          );
        }
      } catch {
        if (current) setPackagingProfiles([]);
      }
    };
    void load();
    return () => {
      current = false;
    };
  }, []);

  const saved = async () => {
    await onWritten();
    await loadSuggestions();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <Toggle
            checked={allowMixedPackages}
            disabled={loading}
            label="Allow mixed packages"
            onChange={setAllowMixedPackages}
          />
          <Toggle
            checked={includeLoosePackage}
            disabled={loading}
            label="Include loose package"
            onChange={setIncludeLoosePackage}
          />
        </div>
        <div className="flex gap-2">
          <AppButton
            disabled={loading}
            variant="secondary"
            onClick={() => void loadSuggestions()}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh suggestions
          </AppButton>
          {action.enabled ? (
            <AppButton onClick={() => setBuilderOpen(true)}>
              <PackagePlus className="h-4 w-4" />
              Build package
            </AppButton>
          ) : (
            <DisabledShipmentAction reason={action.reason}>
              <AppButton disabled>
                <PackagePlus className="h-4 w-4" />
                Build package
              </AppButton>
            </DisabledShipmentAction>
          )}
        </div>
      </div>

      <InventoryEffectNotice />
      {error ? (
        <ShipmentConflict
          message={error}
          title="Packing suggestions unavailable"
          onRefresh={loadSuggestions}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Packing suggestions
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Server suggestions refetch whenever either packing option
              changes.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 3 }, (_, index) => (
                <div className="px-4 py-4" key={index}>
                  <div className="h-4 animate-pulse rounded bg-slate-100" />
                </div>
              ))
            ) : suggestions.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                No packing suggestions are available for this shipment.
              </p>
            ) : (
              suggestions.map((suggestion) => (
                <div className="px-4 py-3" key={suggestion.shipmentItemId}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {suggestion.itemName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {suggestion.itemCode}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-brand">
                      {formatShipmentNumber(suggestion.quantity, "0")} units
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
                    <span>
                      Units/box{" "}
                      <strong>
                        {formatShipmentNumber(suggestion.unitsPerBox, "0")}
                      </strong>
                    </span>
                    <span>
                      Packages{" "}
                      <strong>
                        {formatShipmentNumber(
                          suggestion.suggestedPackageCount,
                          "0",
                        )}
                      </strong>
                    </span>
                    <span>
                      Loose{" "}
                      <strong>
                        {formatShipmentNumber(
                          suggestion.suggestedLooseQuantity,
                          "0",
                        )}
                      </strong>
                    </span>
                    <span>
                      Size{" "}
                      <strong>
                        {formatShipmentNumber(suggestion.length, "0")} ×{" "}
                        {formatShipmentNumber(suggestion.width, "0")} ×{" "}
                        {formatShipmentNumber(suggestion.height, "0")}
                      </strong>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Packages built
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Volumetric and chargeable weights are server-calculated.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {(shipment.packages ?? []).length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                No packages have been recorded.
              </p>
            ) : (
              shipment.packages.map((shipmentPackage) => (
                <div className="px-4 py-3" key={shipmentPackage.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-light">
                        <Box className="h-4 w-4 text-brand" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {shipmentPackage.packageNumber ||
                            `Package ${shipmentPackage.id}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {shipmentPackage.packageType || "Package"} ·{" "}
                          {shipmentPackage.isMixedPackage
                            ? "Mixed"
                            : "Single item"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      {(shipmentPackage.items ?? []).length} lines
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5" />
                      Volumetric{" "}
                      <strong>
                        {formatShipmentNumber(
                          shipmentPackage.volumetricWeight,
                          "0",
                        )}
                      </strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5" />
                      Chargeable{" "}
                      <strong>
                        {formatShipmentNumber(
                          shipmentPackage.chargeableWeight,
                          "0",
                        )}
                      </strong>
                    </span>
                  </div>
                  {canRemove && <div className="mt-3 flex flex-wrap items-center gap-3">
                    <AppButton variant="secondary" disabled={!shipment.version} onClick={() => {
                      setRemoving(shipmentPackage); setRemoveReason(""); setRemoveError(""); setRemoveIntent(null);
                    }}>Remove / repack</AppButton>
                    <span className="text-xs text-slate-500">{shipment.version ? "Unpack this draft allocation, verify conversion, then review a replacement." : "Reload after the packing recovery database upgrade to enable removal."}</span>
                  </div>}
                  {!canRemove && action.repackReason && <p className="mt-2 text-xs text-amber-700">{action.repackReason}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <PackageBuilderModal
        action={action}
        isOpen={builderOpen}
        packagingProfiles={packagingProfiles}
        shipment={shipment}
        onClose={() => setBuilderOpen(false)}
        onSaved={saved}
      />
      <AppModal isOpen={Boolean(removing)} title={`Remove draft package ${removing?.packageNumber ?? ""}`} isBusy={removeBusy} onClose={removeBusy ? undefined : () => setRemoving(null)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">This removes the package from active packing and returns its allocations to unpacked quantities. Packed or ready shipments reopen for packing; the original completion remains in Timeline. Original package lines and the reason remain in history. Submitted or approved freight must be resolved first. Verify the invoice and unit conversion before rebuilding; no stock is posted.</p>
          <AppInput label="Reason for removal / repack" required maxLength={700} disabled={removeBusy || Boolean(removeIntent)} value={removeReason} onChange={event => setRemoveReason(event.target.value)} />
          {removeError && <p role="alert" className="text-sm text-red-700">{removeError}</p>}
          {removeIntent && <p className="text-xs text-amber-700">Retry uses the same reviewed removal. Reload the shipment before changing the reason or choosing another package.</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <AppButton variant="secondary" disabled={removeBusy} onClick={async () => {
              try { await onWritten(); setRemoving(null); setRemoveIntent(null); }
              catch (failure) { setRemoveError(getShipmentMutationMessage(failure, "Unable to reload shipment.")); }
            }}>Reload shipment</AppButton>
            <AppButton disabled={removeBusy || !removeReason.trim() || !shipment.version || !canRemove} onClick={removePackage}>{removeBusy ? "Removing…" : removeIntent ? "Retry same removal" : "Confirm removal"}</AppButton>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

export default ShipmentPackingTab;
