import {
  ArrowLeft,
  Ban,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock3,
  MapPin,
  Plus,
  RefreshCw,
  Route,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import DataTableShell, {
  DATA_TABLE_HEADER_CLASS,
} from "../../../components/common/DataTableShell";
import PageHeader from "../../../components/common/PageHeader";
import {
  SHIPMENT_STATUS,
  SHIPMENT_TRACKING_EVENT_TYPE,
  SHIPMENT_TRACKING_EVENT_TYPE_LABELS,
  toShipmentOptions,
} from "../../../constants/shipmentEnums";
import {
  shipmentActivityService,
  shipmentService,
  shipmentTransporterService,
} from "../../../services/shipments";
import {
  getApiErrorMessage,
  isConflictError,
  isNotFoundError,
} from "../../../utils/apiError";
import {
  SupplyChainInlineError,
} from "../../supplyChain/SupplyChainShared";
import {
  DisabledShipmentAction,
  InventoryEffectNotice,
  ShipmentConflict,
  ShipmentPriorityPill,
  ShipmentSourcePill,
  ShipmentStatusPill,
} from "../ShipmentShared";
import {
  formatShipmentDate,
  formatShipmentDateTime,
  formatShipmentNumber,
  getShipmentMutationMessage,
} from "../shipmentDisplay";
import {
  getShipmentSchemaErrors,
  shipmentTrackingSchema,
  shipmentTransitionSchema,
} from "../shipmentSchemas";
import {
  getShipmentActions,
  getStatusLabel,
} from "../shipmentStatus";
import useShipmentCapabilities from "../useShipmentCapabilities";
import ShipmentFreightTab from "./ShipmentFreightTab";
import ShipmentPackingTab from "./ShipmentPackingTab";
import ShipmentReceiptsReturnsTab from "./ShipmentReceiptsReturnsTab";
import ShipmentTransportTab from "./ShipmentTransportTab";

const TABS = [
  { id: "items", label: "Items" },
  { id: "packing", label: "Packing" },
  { id: "transport", label: "Transport" },
  { id: "receipts-returns", label: "Receipts & returns" },
  { id: "freight", label: "Freight" },
  { id: "timeline", label: "Timeline" },
];

const localDateTime = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 16);
};

const TextArea = ({
  disabled,
  error,
  id,
  label,
  onChange,
  required,
  value,
}) => (
  <div>
    <label
      className="mb-1.5 block text-[13px] font-medium text-slate-700"
      htmlFor={id}
    >
      {label}
      {required ? <span className="ml-0.5 text-red-500">*</span> : null}
    </label>
    <textarea
      className={[
        "min-h-24 w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20",
        error ? "border-red-400 bg-red-50" : "border-slate-200",
      ].join(" ")}
      disabled={disabled}
      id={id}
      required={required}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
    {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
  </div>
);

const TransitionModal = ({
  actions,
  onClose,
  onSaved,
  shipment,
}) => {
  const [targetStatus, setTargetStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null);
  const [saving, setSaving] = useState(false);
  const isOpen = actions.transition.length > 0 && Boolean(targetStatus);
  const available = useMemo(
    () =>
      actions.transition.filter((transition) => transition.enabled),
    [actions.transition],
  );

  useEffect(() => {
    if (actions.transition.length === 0) return undefined;
    const timeout = window.setTimeout(() => {
      setTargetStatus(available[0]?.targetStatus || "");
      setRemarks("");
      setErrors({});
      setConflict(null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [actions.transition.length, available]);

  const close = () => {
    setTargetStatus("");
    onClose();
  };

  const submit = async () => {
    const parsed = shipmentTransitionSchema.safeParse({
      remarks,
      targetStatus,
    });
    if (!parsed.success) {
      setErrors(getShipmentSchemaErrors(parsed));
      return;
    }

    setSaving(true);
    setErrors({});
    setConflict(null);
    try {
      const response = await shipmentService.transition(
        shipment.id,
        parsed.data,
      );
      toast.success(response.message || "Shipment status updated.");
      await onSaved();
      close();
    } catch (error) {
      const message = getShipmentMutationMessage(
        error,
        "Unable to change shipment status.",
      );
      setErrors({ form: message });
      if (isConflictError(error)) setConflict(error);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const movesStock =
    shipment.status === SHIPMENT_STATUS.ReadyForDispatch &&
    targetStatus === SHIPMENT_STATUS.Dispatched;

  return (
    <AppModal
      isBusy={saving}
      isOpen={isOpen}
      maxWidth="max-w-xl"
      title="Move shipment to next status"
      onClose={saving ? undefined : close}
    >
      <AppSelect
        disabled={saving}
        error={errors.targetStatus}
        label="Target status"
        options={available.map((transition) => ({
          label: getStatusLabel(transition.targetStatus),
          value: transition.targetStatus,
        }))}
        required
        value={targetStatus}
        onChange={setTargetStatus}
      />
      <div className="mt-4">
        <TextArea
          disabled={saving}
          error={errors.remarks}
          id="shipment-transition-remarks"
          label="Remarks"
          value={remarks}
          onChange={setRemarks}
        />
      </div>
      <div className="mt-4">
        {movesStock ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            This dispatches the shipment and reduces stock. It cannot be
            undone.
          </div>
        ) : (
          <InventoryEffectNotice />
        )}
      </div>
      {errors.form ? (
        <p className="mt-4 text-sm text-red-600">{errors.form}</p>
      ) : null}
      <div className="mt-4">
        <ShipmentConflict error={conflict} onRefresh={onSaved} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton disabled={saving} variant="secondary" onClick={close}>
          Back
        </AppButton>
        <AppButton
          isLoading={saving}
          loadingText="Updating…"
          variant={movesStock ? "danger" : "primary"}
          onClick={() => void submit()}
        >
          {movesStock ? "Dispatch and reduce stock" : "Update status"}
        </AppButton>
      </div>
    </AppModal>
  );
};

const CancelModal = ({ isOpen, onClose, onSaved, shipment }) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timeout = window.setTimeout(() => {
      setReason("");
      setError("");
      setConflict(null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  const submit = async () => {
    if (!reason.trim()) {
      setError("A cancellation reason is required.");
      return;
    }

    setSaving(true);
    setError("");
    setConflict(null);
    try {
      const response = await shipmentService.cancel(
        shipment.id,
        reason.trim(),
      );
      toast.success(response.message || "Shipment cancelled.");
      await onSaved();
      onClose();
    } catch (requestError) {
      const message = getShipmentMutationMessage(
        requestError,
        "Unable to cancel this shipment.",
      );
      setError(message);
      if (isConflictError(requestError)) setConflict(requestError);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      isBusy={saving}
      isOpen={isOpen}
      maxWidth="max-w-xl"
      title="Cancel shipment"
      onClose={saving ? undefined : onClose}
    >
      <p className="text-sm leading-6 text-slate-600">
        Cancellation is an auditable lifecycle action. It does not restore or
        move stock.
      </p>
      <div className="mt-4">
        <TextArea
          disabled={saving}
          error={error}
          id="shipment-detail-cancel-reason"
          label="Cancellation reason"
          required
          value={reason}
          onChange={(value) => {
            setReason(value);
            setError("");
          }}
        />
      </div>
      <div className="mt-4">
        <ShipmentConflict error={conflict} onRefresh={onSaved} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton disabled={saving} variant="secondary" onClick={onClose}>
          Back
        </AppButton>
        <AppButton
          isLoading={saving}
          loadingText="Cancelling…"
          variant="danger"
          onClick={() => void submit()}
        >
          Cancel shipment
        </AppButton>
      </div>
    </AppModal>
  );
};

const TrackingEventModal = ({
  action,
  isOpen,
  onClose,
  onSaved,
  shipment,
}) => {
  const [form, setForm] = useState({
    eventDateTimeUtc: localDateTime(),
    eventStatus: "",
    eventType: SHIPMENT_TRACKING_EVENT_TYPE.InTransit,
    location: "",
    referenceNumber: "",
    remarks: "",
    source: "",
  });
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timeout = window.setTimeout(() => {
      setForm({
        eventDateTimeUtc: localDateTime(),
        eventStatus: "",
        eventType: SHIPMENT_TRACKING_EVENT_TYPE.InTransit,
        location: "",
        referenceNumber: "",
        remarks: "",
        source: "",
      });
      setErrors({});
      setConflict(null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };

  const submit = async () => {
    const parsed = shipmentTrackingSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(getShipmentSchemaErrors(parsed));
      return;
    }

    setSaving(true);
    setErrors({});
    setConflict(null);
    try {
      const response = await shipmentActivityService.addTrackingEvent(
        shipment.id,
        {
          ...parsed.data,
          eventDateTimeUtc: new Date(
            parsed.data.eventDateTimeUtc,
          ).toISOString(),
        },
      );
      toast.success(response.message || "Tracking event added.");
      await onSaved();
      onClose();
    } catch (error) {
      const message = getShipmentMutationMessage(
        error,
        "Unable to add this tracking event.",
      );
      setErrors({ form: message });
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
      maxWidth="max-w-3xl"
      title="Add tracking event"
      onClose={saving ? undefined : onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <AppSelect
          disabled={saving}
          error={errors.eventType}
          label="Event type"
          options={toShipmentOptions(SHIPMENT_TRACKING_EVENT_TYPE_LABELS)}
          required
          value={form.eventType}
          onChange={(value) => setField("eventType", value)}
        />
        <AppInput
          disabled={saving}
          error={errors.eventDateTimeUtc}
          label="Event time"
          required
          type="datetime-local"
          value={form.eventDateTimeUtc}
          onChange={(event) =>
            setField("eventDateTimeUtc", event.target.value)
          }
        />
        <AppInput
          disabled={saving}
          error={errors.source}
          label="Source" required
          value={form.source}
          onChange={(event) => setField("source", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.eventStatus}
          label="Event status"
          value={form.eventStatus}
          onChange={(event) => setField("eventStatus", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.location}
          label="Location"
          value={form.location}
          onChange={(event) => setField("location", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.referenceNumber}
          label="Reference number"
          value={form.referenceNumber}
          onChange={(event) =>
            setField("referenceNumber", event.target.value)
          }
        />
        <div className="md:col-span-2">
          <TextArea
            disabled={saving}
            error={errors.remarks}
            id="tracking-event-remarks"
            label="Remarks"
            value={form.remarks}
            onChange={(value) => setField("remarks", value)}
          />
        </div>
      </div>
      <div className="mt-4">
        <InventoryEffectNotice />
      </div>
      {errors.form ? (
        <p className="mt-4 text-sm text-red-600">{errors.form}</p>
      ) : null}
      <div className="mt-4">
        <ShipmentConflict error={conflict} onRefresh={onSaved} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton disabled={saving} variant="secondary" onClick={onClose}>
          Back
        </AppButton>
        {action.enabled ? (
          <AppButton
            isLoading={saving}
            loadingText="Adding…"
            onClick={() => void submit()}
          >
            Add event
          </AppButton>
        ) : (
          <DisabledShipmentAction reason={action.reason}>
            <AppButton disabled>Add event</AppButton>
          </DisabledShipmentAction>
        )}
      </div>
    </AppModal>
  );
};

const QuantityRibbon = ({ shipment }) => {
  const restockable = (shipment.items ?? []).reduce(
    (total, item) => total + Number(item.restockableReturnQuantity || 0),
    0,
  );
  const figures = [
    ["Planned", shipment.totalPlannedQuantity, ""],
    ["Packed", shipment.totalPackedQuantity, ""],
    ["Dispatched", shipment.totalDispatchedQuantity, "amber"],
    ["Received", shipment.totalReceivedQuantity, ""],
    ["Returned", shipment.totalReturnedQuantity, ""],
    ["Returned restockable", restockable, "emerald"],
  ];

  return (
    <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:grid-cols-3 xl:grid-cols-6">
      {figures.map(([label, value, tone], index) => (
        <div
          className={[
            "px-4 py-3",
            index > 0 ? "border-t border-slate-100 sm:border-l sm:border-t-0" : "",
            tone === "amber" ? "bg-amber-50" : "",
            tone === "emerald" ? "bg-emerald-50" : "",
          ].join(" ")}
          key={label}
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p
            className={[
              "mt-1 text-xl font-semibold tabular-nums",
              tone === "amber"
                ? "text-amber-700"
                : tone === "emerald"
                  ? "text-emerald-700"
                  : "text-slate-900",
            ].join(" ")}
          >
            {formatShipmentNumber(value, "0")}
          </p>
        </div>
      ))}
    </div>
  );
};

const ItemsTab = ({ shipment }) => (
  <DataTableShell
    colGroup={
      <colgroup>
        <col className="w-[56px]" />
        <col className="w-60" />
        <col className="w-40" />
        {Array.from({ length: 10 }, (_, index) => (
          <col className="w-28" key={index} />
        ))}
      </colgroup>
    }
    columnCount={13}
    emptyHint="Shipment item snapshots appear after creation."
    emptyTitle={
      (shipment.items ?? []).length === 0
        ? "No shipment item snapshots"
        : undefined
    }
    head={
      <>
        <th className={DATA_TABLE_HEADER_CLASS}>#</th>
        <th className={DATA_TABLE_HEADER_CLASS}>Item</th>
        <th className={DATA_TABLE_HEADER_CLASS}>Channel SKU</th>
        {[
          "Planned",
          "Packed",
          "Dispatched",
          "Received",
          "Rejected",
          "Damaged",
          "Short",
          "Returned",
          "Restockable",
          "Units/box",
        ].map((label) => (
          <th
            className={`${DATA_TABLE_HEADER_CLASS} text-right`}
            key={label}
          >
            {label}
          </th>
        ))}
      </>
    }
    minWidth="min-w-[1500px]"
  >
    {(shipment.items ?? []).map((item, index) => (
      <tr key={item.id}>
        <td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
          {index + 1}
        </td>
        <td>
          <p className="font-medium text-slate-900">
            {item.itemNameSnapshot}
          </p>
          <p className="text-xs text-slate-500">{item.itemCodeSnapshot}</p>
        </td>
        <td>{item.channelSkuSnapshot || "—"}</td>
        {[
          item.plannedQuantity,
          item.packedQuantity,
          item.dispatchedQuantity,
          item.receivedQuantity,
          item.rejectedQuantity,
          item.damagedQuantity,
          item.shortQuantity,
          item.returnedQuantity,
          item.restockableReturnQuantity,
          item.unitsPerBoxSnapshot,
        ].map((value, valueIndex) => (
          <td
            className={[
              "text-right tabular-nums",
              valueIndex === 2
                ? "font-semibold text-amber-700"
                : valueIndex === 8
                  ? "font-semibold text-emerald-700"
                  : "",
            ].join(" ")}
            key={valueIndex}
          >
            {formatShipmentNumber(value, "0")}
          </td>
        ))}
      </tr>
    ))}
  </DataTableShell>
);

const TimelineTab = ({ action, onAdd, shipment }) => {
  const events = [...(shipment.trackingEvents ?? [])].sort(
    (a, b) =>
      new Date(b.eventDateTimeUtc).getTime() -
      new Date(a.eventDateTimeUtc).getTime(),
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {action.enabled ? (
          <AppButton onClick={onAdd}>
            <Plus className="h-4 w-4" />
            Add event
          </AppButton>
        ) : (
          <DisabledShipmentAction reason={action.reason}>
            <AppButton disabled>
              <Plus className="h-4 w-4" />
              Add event
            </AppButton>
          </DisabledShipmentAction>
        )}
      </div>
      <InventoryEffectNotice />
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {events.length === 0 ? (
          <div className="py-10 text-center">
            <Clock3 className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-900">
              No tracking events recorded
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Tracking is append-only. Added events cannot be edited or
              deleted here.
            </p>
          </div>
        ) : (
          <ol className="relative ml-2 border-l border-slate-200">
            {events.map((event) => (
              <li className="relative ml-6 pb-7 last:pb-0" key={event.id}>
                <span className="absolute -left-[31px] top-0 grid h-4 w-4 place-items-center rounded-full bg-brand ring-4 ring-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {SHIPMENT_TRACKING_EVENT_TYPE_LABELS[event.eventType] ??
                        event.eventType}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatShipmentDateTime(event.eventDateTimeUtc)}
                      {event.source ? ` · ${event.source}` : ""}
                    </p>
                  </div>
                  {event.eventStatus ? (
                    <span className="text-xs font-medium text-slate-500">
                      {event.eventStatus}
                    </span>
                  ) : null}
                </div>
                {event.location || event.referenceNumber ? (
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    {event.location ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.location}
                      </span>
                    ) : null}
                    {event.referenceNumber ? (
                      <span>Ref: {event.referenceNumber}</span>
                    ) : null}
                  </p>
                ) : null}
                {event.remarks ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {event.remarks}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

const LoadingDetail = () => (
  <section className="space-y-5">
    <div className="h-9 w-64 animate-pulse rounded bg-slate-100" />
    <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
    <div className="h-96 animate-pulse rounded-xl bg-slate-100" />
  </section>
);

const ShipmentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const capabilities = useShipmentCapabilities();
  const [shipment, setShipment] = useState(null);
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const requestedTab = searchParams.get("tab") || "items";
  const activeTab = TABS.some((tab) => tab.id === requestedTab)
    ? requestedTab
    : "items";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotFound(false);
    try {
      const response = await shipmentService.getById(id);
      setShipment(response.data ?? null);
    } catch (requestError) {
      setShipment(null);
      if (isNotFoundError(requestError)) {
        setNotFound(true);
      } else {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load this shipment workspace.",
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    let current = true;
    const loadTransporters = async () => {
      try {
        const response = await shipmentTransporterService.list();
        if (current) {
          setTransporters(
            Array.isArray(response.data)
              ? response.data
              : Array.isArray(response.data?.items)
                ? response.data.items
                : [],
          );
        }
      } catch {
        if (current) setTransporters([]);
      }
    };
    void loadTransporters();
    return () => {
      current = false;
    };
  }, []);

  if (loading && !shipment) return <LoadingDetail />;

  if (notFound) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Truck className="mx-auto h-10 w-10 text-slate-300" />
        <h1 className="mt-4 text-xl font-semibold text-slate-900">
          Shipment not found
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          This shipment may have been removed or the link is no longer valid.
        </p>
        <AppButton
          className="mt-5"
          variant="secondary"
          onClick={() => navigate("/shipments/work-list")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to work list
        </AppButton>
      </section>
    );
  }

  if (!shipment) {
    return (
      <section className="space-y-4">
        <SupplyChainInlineError
          message={error}
          title="Shipment workspace unavailable"
          onRetry={load}
        />
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
          to="/shipments/work-list"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to work list
        </Link>
      </section>
    );
  }

  const actions = getShipmentActions(shipment, capabilities);
  const nextTransition = actions.transition.find(
    (transition) => transition.enabled,
  );

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge="Shipment Operations"
        description={`${shipment.channelCode || "Channel"} → ${shipment.warehouseCode || "Warehouse"} · ${formatShipmentDate(shipment.shipmentDate)}`}
        title={shipment.shipmentNumber || `Shipment ${shipment.id}`}
        actions={
          <>
            <AppButton
              disabled={loading}
              variant="secondary"
              onClick={() => void load()}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            {nextTransition ? (
              <AppButton onClick={() => setTransitionOpen(true)}>
                <CheckCircle2 className="h-4 w-4" />
                Move to {getStatusLabel(nextTransition.targetStatus)}
              </AppButton>
            ) : actions.transition.length > 0 ? (
              <DisabledShipmentAction
                reason={actions.transition[0]?.reason}
              >
                <AppButton disabled>Update status</AppButton>
              </DisabledShipmentAction>
            ) : null}
            {!actions.terminal && actions.cancel.enabled ? (
              <AppButton
                variant="danger"
                onClick={() => setCancelOpen(true)}
              >
                <Ban className="h-4 w-4" />
                Cancel
              </AppButton>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <ShipmentStatusPill status={shipment.status} />
        <ShipmentSourcePill sourceType={shipment.sourceType} />
        <ShipmentPriorityPill priority={shipment.priority} />
        <span className="text-xs text-slate-500">
          {shipment.transporterName || "No transporter assigned"}
        </span>
        <span className="text-xs text-slate-400">·</span>
        <span className="text-xs text-slate-500">
          {shipment.dispatchMode}
        </span>
      </div>

      <QuantityRibbon shipment={shipment} />

      {error ? (
        <SupplyChainInlineError
          message={error}
          title="Latest shipment refresh failed"
          onRetry={load}
        />
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div
          aria-label="Shipment workspace tabs"
          className="flex overflow-x-auto border-b border-slate-200 px-2"
          role="tablist"
        >
          {TABS.map((tab) => (
            <button
              aria-selected={activeTab === tab.id}
              className={[
                "shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition",
                activeTab === tab.id
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-500 hover:text-slate-900",
              ].join(" ")}
              key={tab.id}
              role="tab"
              type="button"
              onClick={() =>
                setSearchParams(
                  tab.id === "items" ? {} : { tab: tab.id },
                  { replace: true },
                )
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="min-w-0 p-4">
          {activeTab === "items" ? <ItemsTab shipment={shipment} /> : null}
          {activeTab === "packing" ? (
            <ShipmentPackingTab
              action={actions.pack}
              shipment={shipment}
              onWritten={load}
            />
          ) : null}
          {activeTab === "transport" ? (
            <ShipmentTransportTab
              actions={actions}
              shipment={shipment}
              transporters={transporters}
              onWritten={load}
            />
          ) : null}
          {activeTab === "receipts-returns" ? (
            <ShipmentReceiptsReturnsTab
              actions={actions}
              shipment={shipment}
              transporters={transporters}
              onWritten={load}
            />
          ) : null}
          {activeTab === "freight" ? (
            <ShipmentFreightTab
              action={actions.freight}
              capabilities={capabilities}
              shipment={shipment}
              transporters={transporters}
              onWritten={load}
            />
          ) : null}
          {activeTab === "timeline" ? (
            <TimelineTab
              action={actions.tracking}
              shipment={shipment}
              onAdd={() => setTrackingOpen(true)}
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm">
          <Calendar className="mr-1.5 inline h-4 w-4 text-slate-400" />
          Expected delivery {formatShipmentDate(shipment.expectedDeliveryDate)}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm">
          <Boxes className="mr-1.5 inline h-4 w-4 text-slate-400" />
          Invoice {shipment.invoiceNumber || "not linked"}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm">
          <Route className="mr-1.5 inline h-4 w-4 text-slate-400" />
          STO {shipment.stoNumber || "not linked"}
        </div>
      </div>

      {transitionOpen ? (
        <TransitionModal
          actions={actions}
          shipment={shipment}
          onClose={() => setTransitionOpen(false)}
          onSaved={load}
        />
      ) : null}
      <CancelModal
        isOpen={cancelOpen}
        shipment={shipment}
        onClose={() => setCancelOpen(false)}
        onSaved={load}
      />
      <TrackingEventModal
        action={actions.tracking}
        isOpen={trackingOpen}
        shipment={shipment}
        onClose={() => setTrackingOpen(false)}
        onSaved={load}
      />
    </section>
  );
};

export default ShipmentDetailPage;
