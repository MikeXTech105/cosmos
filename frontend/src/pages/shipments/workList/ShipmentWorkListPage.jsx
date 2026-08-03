import {
  Ban,
  Boxes,
  Eye,
  PackageCheck,
  Plus,
  RefreshCw,
  Route,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import DataTableShell, {
  DATA_TABLE_HEADER_CLASS,
  DATA_TABLE_ROW_ACTION_CLASS,
  DATA_TABLE_ROW_ACTION_DANGER_CLASS,
} from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import StatCards from "../../../components/common/StatCards";
import {
  SHIPMENT_DISPATCH_MODE,
  SHIPMENT_DISPATCH_MODE_LABELS,
  SHIPMENT_PRIORITY,
  SHIPMENT_PRIORITY_LABELS,
  SHIPMENT_SOURCE_TYPE_LABELS,
  SHIPMENT_STATUS_LABELS,
  toShipmentOptions,
} from "../../../constants/shipmentEnums";
import { DISPATCH_RUN_STATUS } from "../../../constants/dispatchEnums";
import { dispatchRunService } from "../../../services/dispatch";
import { itemService } from "../../../services/inventory/itemService";
import {
  shipmentReportService,
  shipmentService,
  shipmentTransporterService,
} from "../../../services/shipments";
import { supplyChainPackagingProfileService } from "../../../services/supplyChain/packagingProfileService";
import { supplyChainWarehouseService } from "../../../services/supplyChain/warehouseService";
import {
  fetchShipments,
  setShipmentFilters,
  setShipmentPage,
  setShipmentPageSize,
} from "../../../store/slices/shipments/shipmentSlice";
import {
  getApiErrorMessage,
  getApiFieldErrors,
  isConflictError,
} from "../../../utils/apiError";
import {
  SupplyChainFilterBar,
  SupplyChainInlineError,
  SupplyChainPagination,
} from "../../supplyChain/SupplyChainShared";
import useSupplyChainChannels from "../../supplyChain/useSupplyChainChannels";
import {
  ShipmentConflict,
  ShipmentPriorityPill,
  ShipmentSourcePill,
  ShipmentStatusPill,
} from "../ShipmentShared";
import {
  formatShipmentDate,
  formatShipmentNumber,
  getShipmentMutationMessage,
} from "../shipmentDisplay";
import {
  dispatchShipmentSchema,
  getShipmentSchemaErrors,
  manualShipmentSchema,
} from "../shipmentSchemas";
import { getShipmentActions } from "../shipmentStatus";
import useShipmentCapabilities from "../useShipmentCapabilities";

const today = () => {
  const current = new Date();
  const offset = current.getTimezoneOffset();
  return new Date(current.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10);
};

const getItems = (response) =>
  Array.isArray(response?.data?.items) ? response.data.items : [];

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

const emptyDispatchForm = () => ({
  allocations: [],
  dispatchPlanningRunId: "",
  expectedDeliveryDate: "",
  invoiceNumber: "",
  notes: "",
  shipmentDate: today(),
  stoNumber: "",
  transporterPartyId: "",
  warehouseId: "",
});

const NotesField = ({ disabled, error, id, label, onChange, value }) => (
  <div>
    <label
      className="mb-1.5 block text-[13px] font-medium text-slate-700"
      htmlFor={id}
    >
      {label}
    </label>
    <textarea
      className={[
        "min-h-24 w-full rounded-lg border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition",
        error
          ? "border-red-400 bg-red-50"
          : "border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20",
      ].join(" ")}
      disabled={disabled}
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
    {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
  </div>
);

const MasterDataNotice = ({ children }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
    {children}
  </div>
);

const ManualShipmentModal = ({
  channels,
  isOpen,
  onClose,
  onCreated,
  transporters,
}) => {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyManualForm);
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null);
  const [items, setItems] = useState([]);
  const [packagingProfiles, setPackagingProfiles] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timeout = window.setTimeout(() => {
      setForm(emptyManualForm());
      setErrors({});
      setConflict(null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let current = true;
    const controller = new AbortController();

    const load = async () => {
      setLoadingMasters(true);
      try {
        const [itemResponse, packagingResponse] = await Promise.all([
          itemService.getItems({
            IsActive: true,
            PageNumber: 1,
            PageSize: 200,
            Search: "",
          }),
          supplyChainPackagingProfileService.list({
            IsActive: true,
            PageNumber: 1,
            PageSize: 200,
          }),
        ]);
        if (!current) return;
        setItems(getItems(itemResponse));
        setPackagingProfiles(getItems(packagingResponse));
      } catch (error) {
        if (!current) return;
        setErrors((existing) => ({
          ...existing,
          masters: getApiErrorMessage(
            error,
            "Unable to load items and packaging profiles.",
          ),
        }));
      } finally {
        if (current) setLoadingMasters(false);
      }
    };

    void load();
    return () => {
      current = false;
      controller.abort();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !form.channelId) {
      setWarehouses([]);
      return undefined;
    }

    let current = true;
    const load = async () => {
      try {
        const response = await supplyChainWarehouseService.dropdown({
          channelId: form.channelId,
        });
        if (!current) return;
        setWarehouses(
          Array.isArray(response.data)
            ? response.data
            : getItems(response),
        );
      } catch (error) {
        if (!current) return;
        setWarehouses([]);
        setErrors((existing) => ({
          ...existing,
          warehouseId: getApiErrorMessage(
            error,
            "Unable to load warehouses.",
          ),
        }));
      }
    };

    void load();
    return () => {
      current = false;
    };
  }, [form.channelId, isOpen]);

  const setField = (field, value) => {
    setForm((current) => {
      if (field !== "channelId") return { ...current, [field]: value };

      return {
        ...current,
        channelId: value,
        items: [
          {
            itemId: "",
            notes: "",
            packagingProfileId: "",
            plannedQuantity: "",
          },
        ],
        warehouseId: "",
      };
    });
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };

  const setItem = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
    setErrors((current) => ({
      ...current,
      [`items.${index}.${field}`]: "",
      form: "",
    }));
  };

  const addItem = () =>
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          itemId: "",
          notes: "",
          packagingProfileId: "",
          plannedQuantity: "",
        },
      ],
    }));

  const removeItem = (index) =>
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));

  const submit = async () => {
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
      await onCreated();
      onClose();
      if (created?.id) navigate(`/shipments/work-list/${created.id}`);
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);
      const message = getShipmentMutationMessage(
        error,
        "Unable to create the shipment.",
      );
      setErrors({
        ...fieldErrors,
        form: Object.keys(fieldErrors).length > 0 ? "" : message,
      });
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
      title="New manual shipment"
      onClose={saving ? undefined : onClose}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AppSelect
          disabled={saving}
          error={errors.channelId}
          label="Channel"
          options={channels.map((channel) => ({
            label: `${channel.code} — ${channel.name}`,
            value: channel.id,
          }))}
          required
          value={form.channelId}
          onChange={(value) => setField("channelId", value)}
        />
        <AppSelect
          disabled={!form.channelId || saving}
          error={errors.warehouseId}
          label="Warehouse"
          options={warehouses.map((warehouse) => ({
            label: `${warehouse.warehouseCode} — ${warehouse.warehouseName}`,
            value: warehouse.id,
          }))}
          required
          value={form.warehouseId}
          onChange={(value) => setField("warehouseId", value)}
        />
        <AppInput
          disabled={saving}
          error={errors.shipmentDate}
          label="Shipment date"
          required
          type="date"
          value={form.shipmentDate}
          onChange={(event) => setField("shipmentDate", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.expectedDeliveryDate}
          label="Expected delivery"
          min={form.shipmentDate}
          type="date"
          value={form.expectedDeliveryDate}
          onChange={(event) =>
            setField("expectedDeliveryDate", event.target.value)
          }
        />
        <AppSelect
          disabled={saving}
          error={errors.dispatchMode}
          label="Dispatch mode"
          options={toShipmentOptions(SHIPMENT_DISPATCH_MODE_LABELS)}
          required
          value={form.dispatchMode}
          onChange={(value) => setField("dispatchMode", value)}
        />
        <AppSelect
          disabled={saving}
          error={errors.priority}
          label="Priority"
          options={toShipmentOptions(SHIPMENT_PRIORITY_LABELS)}
          required
          value={form.priority}
          onChange={(value) => setField("priority", value)}
        />
        <AppSelect
          disabled={saving}
          error={errors.transporterPartyId}
          label="Transporter"
          options={[
            { label: "Not assigned", value: "" },
            ...transporters
              .filter((party) => party.isTransporter)
              .map((party) => ({
                label: `${party.partyCode} — ${party.partyName}`,
                value: String(party.partyId),
              })),
          ]}
          value={form.transporterPartyId}
          onChange={(value) => setField("transporterPartyId", String(value))}
        />
        <AppInput
          disabled={saving}
          error={errors.invoiceNumber}
          label="Invoice number"
          value={form.invoiceNumber}
          onChange={(event) => setField("invoiceNumber", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.stoNumber}
          label="STO number"
          value={form.stoNumber}
          onChange={(event) => setField("stoNumber", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.marketplaceReference}
          label="Marketplace reference"
          value={form.marketplaceReference}
          onChange={(event) =>
            setField("marketplaceReference", event.target.value)
          }
        />
        <AppInput
          disabled={saving}
          error={errors.externalShipmentReference}
          label="External shipment reference"
          value={form.externalShipmentReference}
          onChange={(event) =>
            setField("externalShipmentReference", event.target.value)
          }
        />
        <AppInput
          disabled={saving}
          error={errors.manualReason}
          label="Manual reason"
          value={form.manualReason}
          onChange={(event) => setField("manualReason", event.target.value)}
        />
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Shipment items
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Add at least one active item with a positive planned quantity.
            </p>
          </div>
          <AppButton
            disabled={saving || loadingMasters}
            variant="secondary"
            onClick={addItem}
          >
            <Plus className="h-4 w-4" />
            Add item
          </AppButton>
        </div>
        <div className="mt-4 space-y-3">
          {form.items.map((line, index) => (
            <div
              className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[minmax(220px,1.5fr)_160px_minmax(200px,1fr)_auto]"
              key={index}
            >
              <AppSelect
                disabled={saving || loadingMasters}
                error={errors[`items.${index}.itemId`]}
                label="Item"
                options={items.map((item) => ({
                  label: `${item.itemCode} — ${item.name}`,
                  value: item.id,
                }))}
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
                onChange={(event) =>
                  setItem(index, "plannedQuantity", event.target.value)
                }
              />
              <AppSelect
                disabled={saving}
                error={errors[`items.${index}.packagingProfileId`]}
                label="Packaging profile"
                options={[
                  { label: "Use server default", value: "" },
                  ...packagingProfiles
                    .filter(
                      (profile) =>
                        !line.itemId ||
                        String(profile.itemId) === String(line.itemId),
                    )
                    .map((profile) => ({
                      label:
                        profile.profileName ||
                        `${profile.itemCode || "Item"} profile ${profile.id}`,
                      value: profile.id,
                    })),
                ]}
                value={line.packagingProfileId}
                onChange={(value) =>
                  setItem(index, "packagingProfileId", value)
                }
              />
              <div className="flex items-end">
                {form.items.length === 1 ? (
                  <AppTooltip label="A shipment requires at least one item.">
                    <AppButton className="px-3" disabled variant="ghost">
                      <Ban className="h-4 w-4" />
                    </AppButton>
                  </AppTooltip>
                ) : (
                  <AppButton
                    aria-label={`Remove item ${index + 1}`}
                    className="px-3"
                    variant="ghost"
                    onClick={() => removeItem(index)}
                  >
                    <Ban className="h-4 w-4" />
                  </AppButton>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <NotesField
          disabled={saving}
          error={errors.notes}
          id="manual-shipment-notes"
          label="Notes"
          value={form.notes}
          onChange={(value) => setField("notes", value)}
        />
      </div>
      <div className="mt-4">
        <MasterDataNotice>
          Creating this shipment does not move stock. Channel, warehouse, item,
          packaging and transporter records are reused from their existing
          masters.
        </MasterDataNotice>
      </div>
      {errors.masters || errors.form ? (
        <div className="mt-4">
          <SupplyChainInlineError
            message={errors.masters || errors.form}
            title="Cannot create shipment"
          />
        </div>
      ) : null}
      <div className="mt-4">
        <ShipmentConflict
          error={conflict}
          onRefresh={() => {
            setConflict(null);
            setErrors((current) => ({ ...current, form: "" }));
          }}
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton disabled={saving} variant="secondary" onClick={onClose}>
          Back
        </AppButton>
        <AppButton
          isLoading={saving}
          loadingText="Creating…"
          onClick={submit}
        >
          Create shipment
        </AppButton>
      </div>
    </AppModal>
  );
};

const DispatchPlanShipmentModal = ({
  isOpen,
  onClose,
  onCreated,
  transporters,
}) => {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyDispatchForm);
  const [runs, setRuns] = useState([]);
  const [run, setRun] = useState(null);
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const response = await dispatchRunService.list({
        PageNumber: 1,
        PageSize: 200,
        Status: DISPATCH_RUN_STATUS.Finalized,
      });
      setRuns(getItems(response));
      setErrors((current) => ({ ...current, runs: "" }));
    } catch (error) {
      setRuns([]);
      setErrors((current) => ({
        ...current,
        runs: getApiErrorMessage(
          error,
          "Unable to load finalized dispatch runs.",
        ),
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timeout = window.setTimeout(() => {
      setForm(emptyDispatchForm());
      setRun(null);
      setErrors({});
      setConflict(null);
      void loadRuns();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isOpen, loadRuns]);

  const selectRun = async (value) => {
    setForm((current) => ({
      ...current,
      allocations: [],
      dispatchPlanningRunId: value,
      warehouseId: "",
    }));
    setRun(null);
    setErrors((current) => ({
      ...current,
      dispatchPlanningRunId: "",
      run: "",
    }));
    if (!value) return;

    setLoading(true);
    try {
      const response = await dispatchRunService.getById(value);
      const detail = response.data;
      if (detail?.status !== DISPATCH_RUN_STATUS.Finalized) {
        throw new Error("Only finalized dispatch runs can create shipments.");
      }
      setRun(detail);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        run: getApiErrorMessage(error, "Unable to load this dispatch run."),
      }));
    } finally {
      setLoading(false);
    }
  };

  const recommendations = Array.isArray(run?.recommendations)
    ? run.recommendations
    : [];
  const warehouseOptions = Array.from(
    new Map(
      recommendations.map((recommendation) => [
        String(recommendation.warehouseId),
        {
          label: `${recommendation.warehouseCode} — ${recommendation.warehouseName}`,
          value: recommendation.warehouseId,
        },
      ]),
    ).values(),
  );
  const allocations = recommendations.filter(
    (recommendation) =>
      String(recommendation.warehouseId) === String(form.warehouseId) &&
      Number(recommendation.allocatedQuantity) > 0,
  );

  const chooseWarehouse = (value) => {
    setForm((current) => ({
      ...current,
      allocations: [],
      warehouseId: value,
    }));
    setErrors((current) => ({ ...current, warehouseId: "", allocations: "" }));
  };

  const toggleAllocation = (recommendation, checked) => {
    setForm((current) => {
      const without = current.allocations.filter(
        (allocation) =>
          String(allocation.dispatchPlanningAllocationId) !==
          String(recommendation.id),
      );

      if (!checked) return { ...current, allocations: without };

      return {
        ...current,
        allocations: [
          ...without,
          {
            // BACKEND: The finalized Dispatch DTO publishes recommendation.id,
            // while Shipment Operations names this foreign key
            // dispatchPlanningAllocationId. The integration contract provides
            // no separate allocation-list endpoint.
            dispatchPlanningAllocationId: recommendation.id,
            plannedQuantity: recommendation.allocatedQuantity,
          },
        ],
      };
    });
  };

  const setAllocationQuantity = (id, value) => {
    setForm((current) => ({
      ...current,
      allocations: current.allocations.map((allocation) =>
        String(allocation.dispatchPlanningAllocationId) === String(id)
          ? { ...allocation, plannedQuantity: value }
          : allocation,
      ),
    }));
  };

  const submit = async () => {
    const parsed = dispatchShipmentSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(getShipmentSchemaErrors(parsed));
      return;
    }

    setSaving(true);
    setErrors({});
    setConflict(null);
    try {
      const response =
        await shipmentService.createFromDispatchPlan(parsed.data);
      const created = response.data;

      if (created?.id) {
        await shipmentService.getById(created.id);
      }
      toast.success(response.message || "Shipment created from dispatch plan.");
      await onCreated();
      onClose();
      if (created?.id) navigate(`/shipments/work-list/${created.id}`);
    } catch (error) {
      const fieldErrors = getApiFieldErrors(error);
      const message = getShipmentMutationMessage(
        error,
        "Unable to create shipment from this dispatch run.",
      );
      setErrors({
        ...fieldErrors,
        form: Object.keys(fieldErrors).length > 0 ? "" : message,
      });
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
      title="Create from dispatch plan"
      onClose={saving ? undefined : onClose}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <AppSelect
            disabled={loading || saving}
            error={errors.dispatchPlanningRunId || errors.runs}
            label="Finalized dispatch run"
            options={runs.map((item) => ({
              label: `${item.runNumber} — ${item.channelCode}`,
              value: item.id,
            }))}
            required
            value={form.dispatchPlanningRunId}
            onChange={(value) => void selectRun(value)}
          />
        </div>
        <AppSelect
          disabled={!run || loading || saving}
          error={errors.warehouseId}
          label="Warehouse"
          options={warehouseOptions}
          required
          value={form.warehouseId}
          onChange={chooseWarehouse}
        />
        <AppInput
          disabled={saving}
          error={errors.shipmentDate}
          label="Shipment date"
          required
          type="date"
          value={form.shipmentDate}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              shipmentDate: event.target.value,
            }))
          }
        />
        <AppInput
          disabled={saving}
          error={errors.expectedDeliveryDate}
          label="Expected delivery"
          min={form.shipmentDate}
          type="date"
          value={form.expectedDeliveryDate}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              expectedDeliveryDate: event.target.value,
            }))
          }
        />
        <AppSelect
          disabled={saving}
          error={errors.transporterPartyId}
          label="Transporter"
          options={[
            { label: "Not assigned", value: "" },
            ...transporters
              .filter((party) => party.isTransporter)
              .map((party) => ({
                label: `${party.partyCode} — ${party.partyName}`,
                value: String(party.partyId),
              })),
          ]}
          value={form.transporterPartyId}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              transporterPartyId: String(value),
            }))
          }
        />
        <AppInput
          disabled={saving}
          error={errors.invoiceNumber}
          label="Invoice number"
          value={form.invoiceNumber}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              invoiceNumber: event.target.value,
            }))
          }
        />
        <AppInput
          disabled={saving}
          error={errors.stoNumber}
          label="STO number"
          value={form.stoNumber}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              stoNumber: event.target.value,
            }))
          }
        />
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Finalized allocations
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Select operational allocations. The server is the authority on
            whether any quantity has already been consumed.
          </p>
        </div>
        {!form.warehouseId ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            Select a finalized run and warehouse.
          </p>
        ) : allocations.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            This warehouse has no positive finalized allocations.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {allocations.map((recommendation) => {
              const selected = form.allocations.find(
                (allocation) =>
                  String(allocation.dispatchPlanningAllocationId) ===
                  String(recommendation.id),
              );

              return (
                <div
                  className="grid gap-3 px-4 py-3 md:grid-cols-[auto_minmax(0,1fr)_180px]"
                  key={recommendation.id}
                >
                  <label className="flex items-center">
                    <input
                      checked={Boolean(selected)}
                      className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/20"
                      disabled={saving}
                      type="checkbox"
                      onChange={(event) =>
                        toggleAllocation(
                          recommendation,
                          event.target.checked,
                        )
                      }
                    />
                  </label>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {recommendation.itemName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {recommendation.itemCode} · {recommendation.channelSku} ·
                      allocated {formatShipmentNumber(
                        recommendation.allocatedQuantity,
                        "0",
                      )}
                    </p>
                  </div>
                  <AppInput
                    disabled={!selected || saving}
                    error={
                      errors[
                        `allocations.${form.allocations.indexOf(selected)}.plannedQuantity`
                      ]
                    }
                    label="Planned quantity"
                    min="0"
                    step="any"
                    type="number"
                    value={selected?.plannedQuantity ?? ""}
                    onChange={(event) =>
                      setAllocationQuantity(
                        recommendation.id,
                        event.target.value,
                      )
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4">
        <NotesField
          disabled={saving}
          error={errors.notes}
          id="dispatch-shipment-notes"
          label="Notes"
          value={form.notes}
          onChange={(value) =>
            setForm((current) => ({ ...current, notes: value }))
          }
        />
      </div>
      <div className="mt-4">
        <MasterDataNotice>
          Creating from a finalized dispatch plan does not reserve or move
          stock. If another shipment consumed an allocation, refresh and
          resolve the server conflict.
        </MasterDataNotice>
      </div>
      <div className="mt-4">
        <SupplyChainInlineError
          message={errors.run || errors.form}
          title="Cannot create shipment"
        />
      </div>
      <div className="mt-4">
        <ShipmentConflict
          error={conflict}
          onRefresh={() => {
            setConflict(null);
            void selectRun(form.dispatchPlanningRunId);
          }}
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton disabled={saving} variant="secondary" onClick={onClose}>
          Back
        </AppButton>
        <AppButton
          isLoading={saving}
          loadingText="Creating…"
          onClick={submit}
        >
          Create shipment
        </AppButton>
      </div>
    </AppModal>
  );
};

const CancelShipmentModal = ({
  conflict,
  loading,
  onClose,
  onConfirm,
  onRefresh,
  shipment,
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!shipment) return undefined;
    const timeout = window.setTimeout(() => {
      setReason("");
      setError("");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [shipment]);

  const confirm = () => {
    const value = reason.trim();
    if (!value) {
      setError("A cancellation reason is required.");
      return;
    }
    onConfirm(value);
  };

  return (
    <AppModal
      isBusy={loading}
      isOpen={Boolean(shipment)}
      title={`Cancel ${shipment?.shipmentNumber || "shipment"}`}
      onClose={loading ? undefined : onClose}
    >
      <p className="text-sm leading-6 text-slate-600">
        Cancellation is an auditable lifecycle action. It does not restore or
        move stock.
      </p>
      <div className="mt-4">
        <NotesField
          disabled={loading}
          error={error}
          id="shipment-cancel-reason"
          label="Cancellation reason"
          value={reason}
          onChange={(value) => {
            setReason(value);
            setError("");
          }}
        />
      </div>
      <div className="mt-4">
        <ShipmentConflict error={conflict} onRefresh={onRefresh} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton disabled={loading} variant="secondary" onClick={onClose}>
          Back
        </AppButton>
        <AppButton
          isLoading={loading}
          loadingText="Cancelling…"
          variant="danger"
          onClick={confirm}
        >
          Cancel shipment
        </AppButton>
      </div>
    </AppModal>
  );
};

const ShipmentWorkListPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const state = useSelector((root) => root.shipments);
  const { channels, error: channelError } = useSupplyChainChannels();
  const capabilities = useShipmentCapabilities();
  const [dashboard, setDashboard] = useState(null);
  const [dashboardError, setDashboardError] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [cancelShipment, setCancelShipment] = useState(null);
  const [cancelConflict, setCancelConflict] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const params = useMemo(
    () => ({
      ...state.filters,
      PageNumber: state.pageNumber,
      PageSize: state.pageSize,
    }),
    [state.filters, state.pageNumber, state.pageSize],
  );

  const loadList = useCallback(
    () => dispatch(fetchShipments(params)),
    [dispatch, params],
  );

  const loadDashboard = useCallback(async () => {
    try {
      const response = await shipmentReportService.dashboard();
      setDashboard(response.data ?? null);
      setDashboardError("");
    } catch (error) {
      setDashboard(null);
      setDashboardError(
        getApiErrorMessage(error, "Unable to load shipment totals."),
      );
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadList(), loadDashboard()]);
  }, [loadDashboard, loadList]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadList(), 180);
    return () => window.clearTimeout(timeout);
  }, [loadList]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadDashboard]);

  useEffect(() => {
    let current = true;
    const load = async () => {
      try {
        const response = await supplyChainWarehouseService.dropdown({
          channelId: state.filters.ChannelId || undefined,
        });
        if (!current) return;
        setWarehouses(
          Array.isArray(response.data)
            ? response.data
            : getItems(response),
        );
      } catch {
        if (current) setWarehouses([]);
      }
    };
    void load();
    return () => {
      current = false;
    };
  }, [state.filters.ChannelId]);

  useEffect(() => {
    let current = true;
    const load = async () => {
      try {
        const response = await shipmentTransporterService.list();
        if (current) {
          setTransporters(
            Array.isArray(response.data) ? response.data : getItems(response),
          );
        }
      } catch {
        if (current) setTransporters([]);
      }
    };
    void load();
    return () => {
      current = false;
    };
  }, []);

  const setFilters = (patch) => dispatch(setShipmentFilters(patch));
  const activeFilterCount = Object.values(state.filters).filter(Boolean).length;

  const confirmCancel = async (reason) => {
    if (!cancelShipment) return;

    setCancelling(true);
    setCancelConflict(null);
    try {
      const response = await shipmentService.cancel(cancelShipment.id, reason);
      await shipmentService.getById(cancelShipment.id);
      toast.success(response.message || "Shipment cancelled.");
      setCancelShipment(null);
      await refresh();
    } catch (error) {
      const message = getShipmentMutationMessage(
        error,
        "Unable to cancel this shipment.",
      );
      if (isConflictError(error)) setCancelConflict(error);
      toast.error(message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Shipment Operations"
        description="Run the operational work list from packing through dispatch, delivery, returns and closure."
        title="Shipment work list"
        actions={
          <>
            <AppButton
              disabled={state.loading}
              variant="secondary"
              onClick={() => void refresh()}
            >
              <RefreshCw
                className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            {capabilities.canCreate ? (
              <>
                <AppButton
                  variant="secondary"
                  onClick={() => setDispatchOpen(true)}
                >
                  <Route className="h-4 w-4" />
                  From dispatch plan
                </AppButton>
                <AppButton onClick={() => setManualOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Manual shipment
                </AppButton>
              </>
            ) : null}
          </>
        }
      />

      <StatCards
        loading={!dashboard && !dashboardError}
        cards={[
          {
            icon: Boxes,
            label: "Draft",
            value: dashboard?.draftCount,
          },
          {
            icon: PackageCheck,
            label: "Ready for dispatch",
            value: dashboard?.readyForDispatchCount,
          },
          {
            icon: Truck,
            label: "In transit",
            value: dashboard?.inTransitCount,
          },
          {
            icon: Route,
            label: "Returns in progress",
            value: dashboard?.returnInProgressCount,
          },
        ]}
      />

      <SupplyChainFilterBar
        activeFilterCount={activeFilterCount}
        onClear={() =>
          setFilters({
            ChannelId: "",
            FromDate: "",
            Search: "",
            SourceType: "",
            Status: "",
            ToDate: "",
            WarehouseId: "",
          })
        }
      >
        <AppInput
          className="w-64"
          label="Search"
          placeholder="Shipment, invoice or STO"
          value={state.filters.Search}
          onChange={(event) => setFilters({ Search: event.target.value })}
        />
        <AppSelect
          className="w-52"
          label="Channel"
          options={[
            { label: "All channels", value: "" },
            ...channels.map((channel) => ({
              label: `${channel.code} — ${channel.name}`,
              value: channel.id,
            })),
          ]}
          value={state.filters.ChannelId}
          onChange={(value) =>
            setFilters({ ChannelId: value, WarehouseId: "" })
          }
        />
        <AppSelect
          className="w-56"
          label="Warehouse"
          options={[
            { label: "All warehouses", value: "" },
            ...warehouses.map((warehouse) => ({
              label: `${warehouse.warehouseCode} — ${warehouse.warehouseName}`,
              value: warehouse.id,
            })),
          ]}
          value={state.filters.WarehouseId}
          onChange={(value) => setFilters({ WarehouseId: value })}
        />
        <AppSelect
          className="w-52"
          label="Status"
          options={[
            { label: "All statuses", value: "" },
            ...toShipmentOptions(SHIPMENT_STATUS_LABELS),
          ]}
          value={state.filters.Status}
          onChange={(value) => setFilters({ Status: value })}
        />
        <AppSelect
          className="w-48"
          label="Source"
          options={[
            { label: "All sources", value: "" },
            ...toShipmentOptions(SHIPMENT_SOURCE_TYPE_LABELS),
          ]}
          value={state.filters.SourceType}
          onChange={(value) => setFilters({ SourceType: value })}
        />
        <AppInput
          className="w-44"
          label="From date"
          max={state.filters.ToDate || undefined}
          type="date"
          value={state.filters.FromDate}
          onChange={(event) => setFilters({ FromDate: event.target.value })}
        />
        <AppInput
          className="w-44"
          label="To date"
          min={state.filters.FromDate || undefined}
          type="date"
          value={state.filters.ToDate}
          onChange={(event) => setFilters({ ToDate: event.target.value })}
        />
      </SupplyChainFilterBar>

      <SupplyChainInlineError
        message={channelError}
        title="Channels unavailable"
      />
      <SupplyChainInlineError
        message={dashboardError}
        title="Shipment totals unavailable"
        onRetry={loadDashboard}
      />
      <SupplyChainInlineError
        message={state.error}
        title="Shipment work list unavailable"
        onRetry={loadList}
      />

      <DataTableShell
        colGroup={
          <colgroup>
            <col className="w-[56px]" />
            <col className="w-40" />
            <col className="w-32" />
            <col className="w-28" />
            <col className="w-52" />
            <col className="w-40" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-44" />
            <col className="w-24" />
          </colgroup>
        }
        columnCount={13}
        emptyHint="Adjust the filters or create a manual shipment."
        emptyTitle={
          !state.loading && state.list.length === 0
            ? "No shipments match this work list"
            : undefined
        }
        head={
          <>
            <th className={DATA_TABLE_HEADER_CLASS}>#</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Shipment no.</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Date</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Channel</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Warehouse</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Source</th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Planned
            </th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Packed
            </th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Dispatched
            </th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Packages
            </th>
            <th className={DATA_TABLE_HEADER_CLASS}>Priority</th>
            <th className={DATA_TABLE_HEADER_CLASS}>Status</th>
            <th className={`${DATA_TABLE_HEADER_CLASS} text-right`}>
              Actions
            </th>
          </>
        }
        loading={state.loading}
        minWidth="min-w-[1540px]"
      >
        {state.list.map((shipment, index) => {
          const actions = getShipmentActions(shipment, capabilities);

          return (
            <tr
              className="cursor-pointer"
              key={shipment.id}
              onClick={() =>
                navigate(`/shipments/work-list/${shipment.id}`)
              }
            >
              <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                {(state.pageNumber - 1) * state.pageSize + index + 1}
              </td>
              <td className="font-semibold text-slate-900">
                {shipment.shipmentNumber}
              </td>
              <td>{formatShipmentDate(shipment.shipmentDate)}</td>
              <td>{shipment.channelCode || "—"}</td>
              <td>
                <p className="font-medium text-slate-900">
                  {shipment.warehouseCode || "—"}
                </p>
                <p className="text-xs text-slate-500">
                  {shipment.warehouseName}
                </p>
              </td>
              <td>
                <ShipmentSourcePill sourceType={shipment.sourceType} />
              </td>
              <td className="text-right tabular-nums">
                {formatShipmentNumber(shipment.totalPlannedQuantity, "0")}
              </td>
              <td className="text-right tabular-nums">
                {formatShipmentNumber(shipment.totalPackedQuantity, "0")}
              </td>
              <td className="text-right font-semibold tabular-nums text-amber-700">
                {formatShipmentNumber(shipment.totalDispatchedQuantity, "0")}
              </td>
              <td className="text-right tabular-nums">
                {formatShipmentNumber(shipment.totalPackages, "0")}
              </td>
              <td>
                <ShipmentPriorityPill priority={shipment.priority} />
              </td>
              <td>
                <ShipmentStatusPill status={shipment.status} />
              </td>
              <td onClick={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-end gap-0.5">
                  <AppTooltip label="Open shipment">
                    <button
                      aria-label={`Open ${shipment.shipmentNumber}`}
                      className={DATA_TABLE_ROW_ACTION_CLASS}
                      type="button"
                      onClick={() =>
                        navigate(`/shipments/work-list/${shipment.id}`)
                      }
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </AppTooltip>
                  {actions.cancel.enabled ? (
                    <AppTooltip label="Cancel shipment">
                      <button
                        aria-label={`Cancel ${shipment.shipmentNumber}`}
                        className={DATA_TABLE_ROW_ACTION_DANGER_CLASS}
                        type="button"
                        onClick={() => setCancelShipment(shipment)}
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </AppTooltip>
                  ) : (
                    <AppTooltip label={actions.cancel.reason}>
                      <button
                        aria-label={`Cannot cancel ${shipment.shipmentNumber}`}
                        className={DATA_TABLE_ROW_ACTION_DANGER_CLASS}
                        disabled
                        type="button"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </AppTooltip>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </DataTableShell>

      <SupplyChainPagination
        disabled={state.loading}
        pageNumber={state.pageNumber}
        pageSize={state.pageSize}
        totalCount={state.totalCount}
        totalPages={state.totalPages}
        onPageChange={(value) => dispatch(setShipmentPage(value))}
        onPageSizeChange={(value) => dispatch(setShipmentPageSize(value))}
      />

      <ManualShipmentModal
        channels={channels}
        isOpen={manualOpen}
        transporters={transporters}
        onClose={() => setManualOpen(false)}
        onCreated={refresh}
      />
      <DispatchPlanShipmentModal
        isOpen={dispatchOpen}
        transporters={transporters}
        onClose={() => setDispatchOpen(false)}
        onCreated={refresh}
      />
      <CancelShipmentModal
        conflict={cancelConflict}
        loading={cancelling}
        shipment={cancelShipment}
        onClose={() => {
          setCancelShipment(null);
          setCancelConflict(null);
        }}
        onConfirm={(reason) => void confirmCancel(reason)}
        onRefresh={() => {
          setCancelConflict(null);
          void refresh();
        }}
      />
    </section>
  );
};

export default ShipmentWorkListPage;
