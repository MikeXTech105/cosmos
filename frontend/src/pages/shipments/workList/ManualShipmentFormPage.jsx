import { ArrowLeft, Ban, Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import AppLookup from "../../../components/common/AppLookup";
import { lookupPage } from "../../../utils/lookupPage";
import AppTooltip from "../../../components/common/AppTooltip";
import PageHeader from "../../../components/common/PageHeader";
import {
  SHIPMENT_DISPATCH_MODE,
  SHIPMENT_DISPATCH_MODE_LABELS,
  SHIPMENT_PRIORITY,
  SHIPMENT_PRIORITY_LABELS,
  toShipmentOptions,
} from "../../../constants/shipmentEnums";
import itemService from "../../../services/manufacturing/productionOrderService";
import { shipmentService, shipmentTransporterService } from "../../../services/shipments";
import { supplyChainPackagingProfileService } from "../../../services/supplyChain/packagingProfileService";
import { supplyChainWarehouseService } from "../../../services/supplyChain/warehouseService";
import { getApiErrorMessage, getApiFieldErrors, isConflictError } from "../../../utils/apiError";
import { SupplyChainInlineError } from "../../supplyChain/SupplyChainShared";
import useSupplyChainChannels from "../../supplyChain/useSupplyChainChannels";
import { ShipmentConflict } from "../ShipmentShared";
import { getShipmentMutationMessage } from "../shipmentDisplay";
import { getShipmentSchemaErrors, manualShipmentSchema } from "../shipmentSchemas";
import useShipmentCapabilities from "../useShipmentCapabilities";
import { MasterDataNotice, NotesField } from "./ShipmentFormShared";
import { getItems, today } from "./shipmentFormUtils";

const emptyManualForm = () => ({
  channelId: "",
  dispatchMode: SHIPMENT_DISPATCH_MODE.Road,
  expectedDeliveryDate: "",
  externalShipmentReference: "",
  invoiceNumber: "",
  items: [{ itemId: "", notes: "", packagingProfileId: "", plannedQuantity: "" }],
  manualReason: "",
  marketplaceReference: "",
  notes: "",
  priority: SHIPMENT_PRIORITY.Normal,
  shipmentDate: today(),
  stoNumber: "",
  transporterPartyId: "",
  warehouseId: "",
});

const ManualShipmentFormPage = () => {
  const navigate = useNavigate();
  const capabilities = useShipmentCapabilities();
  const { channels, error: channelError } = useSupplyChainChannels();
  const [form, setForm] = useState(emptyManualForm);
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let current = true;

    const load = async () => {
      setLoadingMasters(true);
      try {
        const transporterResponse = await shipmentTransporterService.list();

        if (!current) return;
        setTransporters(Array.isArray(transporterResponse.data) ? transporterResponse.data : getItems(transporterResponse));
      } catch (error) {
        if (!current) return;
        setErrors((existing) => ({ ...existing, masters: getApiErrorMessage(error, "Unable to load items and packaging profiles.") }));
      } finally {
        if (current) setLoadingMasters(false);
      }
    };

    void load();
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    if (!form.channelId) {
      setWarehouses([]);
      return undefined;
    }

    let current = true;
    const load = async () => {
      try {
        const response = await supplyChainWarehouseService.dropdown({ channelId: form.channelId });

        if (!current) return;
        setWarehouses(Array.isArray(response.data) ? response.data : getItems(response));
      } catch (error) {
        if (!current) return;
        setWarehouses([]);
        setErrors((existing) => ({ ...existing, warehouseId: getApiErrorMessage(error, "Unable to load warehouses.") }));
      }
    };

    void load();
    return () => {
      current = false;
    };
  }, [form.channelId]);

  const setField = (field, value) => {
    setForm((current) => {
      if (field !== "channelId") return { ...current, [field]: value };

      return {
        ...current,
        channelId: value,
        items: [{ itemId: "", notes: "", packagingProfileId: "", plannedQuantity: "" }],
        warehouseId: "",
      };
    });
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };

  const setItem = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...(field === "itemId" ? { packagingProfileId: "" } : {}), [field]: value } : item)),
    }));
    setErrors((current) => ({ ...current, [`items.${index}.${field}`]: "", form: "" }));
  };

  const addItem = () =>
    setForm((current) => ({
      ...current,
      items: [...current.items, { itemId: "", notes: "", packagingProfileId: "", plannedQuantity: "" }],
    }));

  const removeItem = (index) =>
    setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));

  const saveDisabledReason = capabilities.canCreate ? "" : "You need create permission for shipments.";

  const submit = async () => {
    if (saveDisabledReason) {
      toast.error(saveDisabledReason);
      return;
    }

    const parsed = manualShipmentSchema.safeParse(form);

    if (!parsed.success) {
      setErrors(getShipmentSchemaErrors(parsed));
      return;
    }

    setSaving(true);
    setErrors({});
    setConflict(null);

    try {
      const response = await shipmentService.createManual(parsed.data);
      const created = response.data;

      if (created?.id) {
        await shipmentService.getById(created.id);
      }

      toast.success(response.message || "Manual shipment created.");
      navigate(created?.id ? `/shipments/work-list/${created.id}` : "/shipments/work-list");
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);
      const message = getShipmentMutationMessage(error, "Unable to create the shipment.");

      setErrors({ ...fieldErrors, form: Object.keys(fieldErrors).length > 0 ? "" : message });
      if (isConflictError(error)) setConflict(error);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader
        badge="Shipment Operations"
        title="New manual shipment"
        description="Create a shipment directly from existing masters. This does not move or reserve stock."
        actions={
          <>
            <AppButton variant="secondary" onClick={() => navigate("/shipments/work-list")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </AppButton>
            <AppButton isLoading={saving} loadingText="Creating…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined} onClick={submit}>
              <Save className="h-4 w-4" /> Create shipment
            </AppButton>
          </>
        }
      />

      <SupplyChainInlineError message={channelError} title="Channels unavailable" />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AppSelect
            disabled={saving}
            error={errors.channelId}
            label="Channel"
            options={channels.map((channel) => ({ label: `${channel.code} — ${channel.name}`, value: channel.id }))}
            required
            value={form.channelId}
            onChange={(value) => setField("channelId", value)}
          />
          <AppSelect
            disabled={!form.channelId || saving}
            error={errors.warehouseId}
            label="Warehouse"
            options={warehouses.map((warehouse) => ({ label: `${warehouse.warehouseCode} — ${warehouse.warehouseName}`, value: warehouse.id }))}
            required
            value={form.warehouseId}
            onChange={(value) => setField("warehouseId", value)}
          />
          <AppInput disabled={saving} error={errors.shipmentDate} label="Shipment date" required type="date" value={form.shipmentDate} onChange={(event) => setField("shipmentDate", event.target.value)} />
          <AppInput disabled={saving} error={errors.expectedDeliveryDate} label="Expected delivery" min={form.shipmentDate} type="date" value={form.expectedDeliveryDate} onChange={(event) => setField("expectedDeliveryDate", event.target.value)} />
          <AppSelect disabled={saving} error={errors.dispatchMode} label="Dispatch mode" options={toShipmentOptions(SHIPMENT_DISPATCH_MODE_LABELS)} required value={form.dispatchMode} onChange={(value) => setField("dispatchMode", value)} />
          <AppSelect disabled={saving} error={errors.priority} label="Priority" options={toShipmentOptions(SHIPMENT_PRIORITY_LABELS)} required value={form.priority} onChange={(value) => setField("priority", value)} />
          <AppSelect
            disabled={saving}
            error={errors.transporterPartyId}
            label="Transporter"
            options={[
              { label: "Not assigned", value: "" },
              ...transporters.filter((party) => party.isTransporter).map((party) => ({ label: `${party.partyCode} — ${party.partyName}`, value: String(party.partyId) })),
            ]}
            value={form.transporterPartyId}
            onChange={(value) => setField("transporterPartyId", String(value))}
          />
          <AppInput disabled={saving} error={errors.invoiceNumber} label="Invoice number" value={form.invoiceNumber} onChange={(event) => setField("invoiceNumber", event.target.value)} />
          <AppInput disabled={saving} error={errors.stoNumber} label="STO number" value={form.stoNumber} onChange={(event) => setField("stoNumber", event.target.value)} />
          <AppInput disabled={saving} error={errors.marketplaceReference} label="Marketplace reference" value={form.marketplaceReference} onChange={(event) => setField("marketplaceReference", event.target.value)} />
          <AppInput disabled={saving} error={errors.externalShipmentReference} label="External shipment reference" value={form.externalShipmentReference} onChange={(event) => setField("externalShipmentReference", event.target.value)} />
          <AppInput disabled={saving} error={errors.manualReason} label="Manual reason" required value={form.manualReason} onChange={(event) => setField("manualReason", event.target.value)} />
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Shipment items</h3>
              <p className="mt-0.5 text-xs text-slate-500">Add at least one active item with a positive planned quantity.</p>
            </div>
            <AppButton disabled={saving || loadingMasters} variant="secondary" onClick={addItem}>
              <Plus className="h-4 w-4" /> Add item
            </AppButton>
          </div>
          <div className="mt-4 space-y-3">
            {form.items.map((line, index) => (
              <div className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[minmax(220px,1.5fr)_160px_minmax(200px,1fr)_auto]" key={index}>
                <AppLookup
                  disabled={saving || loadingMasters}
                  error={errors[`items.${index}.itemId`]}
                  label="Item"
                  loadPage={async ({ search, page, pageSize }) => lookupPage(await itemService.items({ IsActive: true, PageNumber: page, PageSize: pageSize, Search: search }), page, pageSize)}
                  loadById={async id => (await itemService.item(id)).data}
                  getOptionLabel={item => `${item.itemCode ?? ""} — ${item.name ?? ""}`}
                  required
                  value={line.itemId}
                  onChange={(value) => setItem(index, "itemId", value)}
                />
                <AppInput
                  disabled={saving}
                  error={errors[`items.${index}.plannedQuantity`]}
                  label="Planned quantity"
                  min="0"
                  required
                  step="any"
                  type="number"
                  value={line.plannedQuantity}
                  onChange={(event) => setItem(index, "plannedQuantity", event.target.value)}
                />
                <AppLookup
                  disabled={saving || !line.itemId}
                  error={errors[`items.${index}.packagingProfileId`]}
                  label="Packaging profile"
                  scopeKey={`${line.itemId}:${form.channelId}`}
                  placeholder="Use server default or search"
                  loadPage={async ({ search, page, pageSize }) => lookupPage(await supplyChainPackagingProfileService.list({ IsActive: true, ItemId: line.itemId, Search: search, PageNumber: page, PageSize: pageSize }), page, pageSize)}
                  loadById={async id => (await supplyChainPackagingProfileService.getById(id)).data}
                  getOptionLabel={profile => `${profile.packagingCode ?? ""} — ${profile.packagingName ?? ""}`}
                  value={line.packagingProfileId}
                  onChange={(value) => setItem(index, "packagingProfileId", value)}
                />
                <div className="flex items-end">
                  {form.items.length === 1 ? (
                    <AppTooltip label="A shipment requires at least one item.">
                      <AppButton className="px-3" disabled variant="ghost">
                        <Ban className="h-4 w-4" />
                      </AppButton>
                    </AppTooltip>
                  ) : (
                    <AppButton aria-label={`Remove item ${index + 1}`} className="px-3" variant="ghost" onClick={() => removeItem(index)}>
                      <Ban className="h-4 w-4" />
                    </AppButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <NotesField disabled={saving} error={errors.notes} id="manual-shipment-notes" label="Notes" value={form.notes} onChange={(value) => setField("notes", value)} />
        </div>
        <div className="mt-4">
          <MasterDataNotice>
            Creating this shipment does not move stock. Channel, warehouse, item, packaging and transporter records are reused from their existing masters.
          </MasterDataNotice>
        </div>
        {errors.masters || errors.form ? (
          <div className="mt-4">
            <SupplyChainInlineError message={errors.masters || errors.form} title="Cannot create shipment" />
          </div>
        ) : null}
        <div className="mt-4">
          <ShipmentConflict error={conflict} onRefresh={() => { setConflict(null); setErrors((current) => ({ ...current, form: "" })); }} />
        </div>
      </section>

      <div className="sticky bottom-4 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:flex-row sm:justify-end">
        <AppButton disabled={saving} variant="secondary" onClick={() => navigate("/shipments/work-list")}>
          Cancel
        </AppButton>
        <AppButton isLoading={saving} loadingText="Creating…" disabled={Boolean(saveDisabledReason)} title={saveDisabledReason || undefined} onClick={submit}>
          Create shipment
        </AppButton>
      </div>
    </section>
  );
};

export default ManualShipmentFormPage;
