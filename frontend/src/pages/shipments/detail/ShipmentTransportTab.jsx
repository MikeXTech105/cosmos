import {
  CalendarClock,
  ClipboardList,
  MapPin,
  Plus,
  Route,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import {
  SHIPMENT_APPOINTMENT_STATUS,
  SHIPMENT_APPOINTMENT_STATUS_LABELS,
  SHIPMENT_DELIVERY_ATTEMPT_OUTCOME,
  SHIPMENT_DELIVERY_ATTEMPT_OUTCOME_LABELS,
  SHIPMENT_DISPATCH_MODE,
  SHIPMENT_DISPATCH_MODE_LABELS,
  toShipmentOptions,
} from "../../../constants/shipmentEnums";
import { shipmentActivityService } from "../../../services/shipments";
import { isConflictError } from "../../../utils/apiError";
import {
  DisabledShipmentAction,
  InventoryEffectNotice,
  ShipmentConflict,
  ShipmentPill,
} from "../ShipmentShared";
import {
  formatShipmentDate,
  formatShipmentDateTime,
  getShipmentMutationMessage,
} from "../shipmentDisplay";
import {
  getShipmentSchemaErrors,
  shipmentAppointmentSchema,
  shipmentDeliveryAttemptSchema,
  shipmentDocketSchema,
} from "../shipmentSchemas";

const localDateTime = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 16);
};

const today = () => localDateTime().slice(0, 10);

const TextArea = ({ disabled, error, id, label, onChange, value }) => (
  <div>
    <label
      className="mb-1.5 block text-[13px] font-medium text-slate-700"
      htmlFor={id}
    >
      {label}
    </label>
    <textarea
      className={[
        "min-h-20 w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20",
        error ? "border-red-400 bg-red-50" : "border-slate-200",
      ].join(" ")}
      disabled={disabled}
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
    {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
  </div>
);

const DocketModal = ({
  isOpen,
  onClose,
  onSaved,
  shipment,
  transporters,
}) => {
  const [form, setForm] = useState({
    dispatchMode: shipment.dispatchMode || SHIPMENT_DISPATCH_MODE.Road,
    docketDate: today(),
    docketNumber: "",
    driverMobile: "",
    driverName: "",
    estimatedDeliveryDate: "",
    pickupReference: "",
    trackingUrl: "",
    transporterPartyId: shipment.transporterPartyId
      ? String(shipment.transporterPartyId)
      : "",
    vehicleNumber: "",
  });
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timeout = window.setTimeout(() => {
      setForm({
        dispatchMode: shipment.dispatchMode || SHIPMENT_DISPATCH_MODE.Road,
        docketDate: today(),
        docketNumber: "",
        driverMobile: "",
        driverName: "",
        estimatedDeliveryDate: shipment.expectedDeliveryDate || "",
        pickupReference: "",
        trackingUrl: "",
        transporterPartyId: shipment.transporterPartyId
          ? String(shipment.transporterPartyId)
          : "",
        vehicleNumber: "",
      });
      setErrors({});
      setConflict(null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isOpen, shipment]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };

  const submit = async () => {
    const parsed = shipmentDocketSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(getShipmentSchemaErrors(parsed));
      return;
    }

    setSaving(true);
    setErrors({});
    setConflict(null);
    try {
      const response = await shipmentActivityService.saveDocket(
        shipment.id,
        parsed.data,
      );
      toast.success(response.message || "Docket saved.");
      await onSaved();
      onClose();
    } catch (error) {
      const message = getShipmentMutationMessage(
        error,
        "Unable to save this docket.",
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
      maxWidth="max-w-4xl"
      title="Add docket"
      onClose={saving ? undefined : onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <AppSelect
          disabled={saving}
          error={errors.transporterPartyId}
          label="Transporter"
          options={transporters
            .filter((party) => party.isTransporter)
            .map((party) => ({
              label: `${party.partyCode} — ${party.partyName}`,
              value: String(party.partyId),
            }))}
          required
          value={form.transporterPartyId}
          onChange={(value) => setField("transporterPartyId", String(value))}
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
        <AppInput
          disabled={saving}
          error={errors.docketNumber}
          label="Docket number" required
          value={form.docketNumber}
          onChange={(event) => setField("docketNumber", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.docketDate}
          label="Docket date"
          required
          type="date"
          value={form.docketDate}
          onChange={(event) => setField("docketDate", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.trackingUrl}
          label="Tracking URL"
          placeholder="https://…"
          type="url"
          value={form.trackingUrl}
          onChange={(event) => setField("trackingUrl", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.estimatedDeliveryDate}
          label="Estimated delivery"
          type="date"
          value={form.estimatedDeliveryDate}
          onChange={(event) =>
            setField("estimatedDeliveryDate", event.target.value)
          }
        />
        <AppInput
          disabled={saving}
          error={errors.vehicleNumber}
          label="Vehicle number"
          value={form.vehicleNumber}
          onChange={(event) => setField("vehicleNumber", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.pickupReference}
          label="Pickup reference"
          value={form.pickupReference}
          onChange={(event) => setField("pickupReference", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.driverName}
          label="Driver name"
          value={form.driverName}
          onChange={(event) => setField("driverName", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.driverMobile}
          label="Driver mobile"
          value={form.driverMobile}
          onChange={(event) => setField("driverMobile", event.target.value)}
        />
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
        <AppButton
          isLoading={saving}
          loadingText="Saving…"
          onClick={submit}
        >
          Save docket
        </AppButton>
      </div>
    </AppModal>
  );
};

const AppointmentModal = ({ isOpen, onClose, onSaved, shipment }) => {
  const [form, setForm] = useState({
    appointmentDate: today(),
    appointmentReference: "",
    appointmentStatus: SHIPMENT_APPOINTMENT_STATUS.Pending,
    cancellationReason: "",
    remarks: "",
    timeFrom: "",
    timeTo: "",
  });
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timeout = window.setTimeout(() => {
      setForm({
        appointmentDate: today(),
        appointmentReference: "",
        appointmentStatus: SHIPMENT_APPOINTMENT_STATUS.Pending,
        cancellationReason: "",
        remarks: "",
        timeFrom: "",
        timeTo: "",
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
    const parsed = shipmentAppointmentSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(getShipmentSchemaErrors(parsed));
      return;
    }

    setSaving(true);
    setErrors({});
    setConflict(null);
    try {
      const response = await shipmentActivityService.saveAppointment(
        shipment.id,
        parsed.data,
      );
      toast.success(response.message || "Appointment saved.");
      await onSaved();
      onClose();
    } catch (error) {
      const message = getShipmentMutationMessage(
        error,
        "Unable to save this appointment.",
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
      title="Add appointment"
      onClose={saving ? undefined : onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <AppInput
          disabled={saving}
          error={errors.appointmentDate}
          label="Appointment date"
          required
          type="date"
          value={form.appointmentDate}
          onChange={(event) =>
            setField("appointmentDate", event.target.value)
          }
        />
        <AppSelect
          disabled={saving}
          error={errors.appointmentStatus}
          label="Appointment status"
          options={toShipmentOptions(SHIPMENT_APPOINTMENT_STATUS_LABELS)}
          required
          value={form.appointmentStatus}
          onChange={(value) => setField("appointmentStatus", value)}
        />
        <AppInput
          disabled={saving}
          error={errors.appointmentReference}
          label="Reference"
          value={form.appointmentReference}
          onChange={(event) =>
            setField("appointmentReference", event.target.value)
          }
        />
        <div className="grid grid-cols-2 gap-3">
          <AppInput
            disabled={saving}
            error={errors.timeFrom}
            label="Time from"
            type="time"
            value={form.timeFrom}
            onChange={(event) => setField("timeFrom", event.target.value)}
          />
          <AppInput
            disabled={saving}
            error={errors.timeTo}
            label="Time to"
            type="time"
            value={form.timeTo}
            onChange={(event) => setField("timeTo", event.target.value)}
          />
        </div>
        {form.appointmentStatus === SHIPMENT_APPOINTMENT_STATUS.Cancelled ? (
          <div className="md:col-span-2">
            <AppInput
              disabled={saving}
              error={errors.cancellationReason}
              label="Cancellation reason"
              value={form.cancellationReason}
              onChange={(event) =>
                setField("cancellationReason", event.target.value)
              }
            />
          </div>
        ) : null}
        <div className="md:col-span-2">
          <TextArea
            disabled={saving}
            error={errors.remarks}
            id="appointment-remarks"
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
        <AppButton
          isLoading={saving}
          loadingText="Saving…"
          onClick={submit}
        >
          Save appointment
        </AppButton>
      </div>
    </AppModal>
  );
};

const DeliveryAttemptModal = ({ isOpen, onClose, onSaved, shipment }) => {
  const [form, setForm] = useState({
    attemptDateTimeUtc: localDateTime(),
    nextAttemptDate: "",
    outcome: SHIPMENT_DELIVERY_ATTEMPT_OUTCOME.Failed,
    reasonCode: "",
    remarks: "",
  });
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timeout = window.setTimeout(() => {
      setForm({
        attemptDateTimeUtc: localDateTime(),
        nextAttemptDate: "",
        outcome: SHIPMENT_DELIVERY_ATTEMPT_OUTCOME.Failed,
        reasonCode: "",
        remarks: "",
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
    const parsed = shipmentDeliveryAttemptSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(getShipmentSchemaErrors(parsed));
      return;
    }

    setSaving(true);
    setErrors({});
    setConflict(null);
    try {
      const response = await shipmentActivityService.addDeliveryAttempt(
        shipment.id,
        {
          ...parsed.data,
          attemptDateTimeUtc: new Date(
            parsed.data.attemptDateTimeUtc,
          ).toISOString(),
        },
      );
      toast.success(response.message || "Delivery attempt recorded.");
      await onSaved();
      onClose();
    } catch (error) {
      const message = getShipmentMutationMessage(
        error,
        "Unable to record this delivery attempt.",
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
      maxWidth="max-w-2xl"
      title="Record delivery attempt"
      onClose={saving ? undefined : onClose}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <AppInput
          disabled={saving}
          error={errors.attemptDateTimeUtc}
          label="Attempt time"
          required
          type="datetime-local"
          value={form.attemptDateTimeUtc}
          onChange={(event) =>
            setField("attemptDateTimeUtc", event.target.value)
          }
        />
        <AppSelect
          disabled={saving}
          error={errors.outcome}
          label="Outcome"
          options={toShipmentOptions(
            SHIPMENT_DELIVERY_ATTEMPT_OUTCOME_LABELS,
          )}
          required
          value={form.outcome}
          onChange={(value) => setField("outcome", value)}
        />
        <AppInput
          disabled={saving}
          error={errors.reasonCode}
          label="Reason code"
          value={form.reasonCode}
          onChange={(event) => setField("reasonCode", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.nextAttemptDate}
          label="Next attempt date"
          type="date"
          value={form.nextAttemptDate}
          onChange={(event) =>
            setField("nextAttemptDate", event.target.value)
          }
        />
        <div className="md:col-span-2">
          <TextArea
            disabled={saving}
            error={errors.remarks}
            id="delivery-attempt-remarks"
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
        <AppButton
          isLoading={saving}
          loadingText="Recording…"
          onClick={submit}
        >
          Record attempt
        </AppButton>
      </div>
    </AppModal>
  );
};

const Section = ({ action, children, icon: Icon, onAdd, title }) => (
  <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {action.enabled ? (
        <AppButton className="h-8 px-3" variant="secondary" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add
        </AppButton>
      ) : (
        <DisabledShipmentAction reason={action.reason}>
          <AppButton className="h-8 px-3" disabled variant="secondary">
            <Plus className="h-4 w-4" />
            Add
          </AppButton>
        </DisabledShipmentAction>
      )}
    </div>
    {children}
  </div>
);

const ShipmentTransportTab = ({
  actions,
  onWritten,
  shipment,
  transporters,
}) => {
  const [docketOpen, setDocketOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [attemptOpen, setAttemptOpen] = useState(false);

  return (
    <div className="space-y-4">
      <InventoryEffectNotice />
      <div className="grid gap-4 xl:grid-cols-3">
        <Section
          action={actions.docket}
          icon={ClipboardList}
          title="Dockets"
          onAdd={() => setDocketOpen(true)}
        >
          <div className="divide-y divide-slate-100">
            {(shipment.dockets ?? []).length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                No docket history has been recorded.
              </p>
            ) : (
              [...shipment.dockets]
                .sort(
                  (a, b) =>
                    new Date(b.docketDate).getTime() -
                    new Date(a.docketDate).getTime(),
                )
                .map((docket) => (
                  <div className="px-4 py-3" key={docket.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {docket.docketNumber || `Docket ${docket.id}`}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {docket.transporterName || shipment.transporterName}
                        </p>
                      </div>
                      <ShipmentPill tone="slate">
                        {docket.dispatchMode}
                      </ShipmentPill>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      {formatShipmentDate(docket.docketDate)}
                      {docket.vehicleNumber
                        ? ` · Vehicle ${docket.vehicleNumber}`
                        : ""}
                    </p>
                    {docket.trackingUrl ? (
                      <a
                        className="mt-2 inline-flex text-xs font-semibold text-brand hover:underline"
                        href={docket.trackingUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open tracking
                      </a>
                    ) : null}
                  </div>
                ))
            )}
          </div>
        </Section>

        <Section
          action={actions.appointment}
          icon={CalendarClock}
          title="Appointments"
          onAdd={() => setAppointmentOpen(true)}
        >
          <div className="divide-y divide-slate-100">
            {(shipment.appointments ?? []).length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                No appointment history has been recorded.
              </p>
            ) : (
              [...shipment.appointments]
                .sort(
                  (a, b) =>
                    Number(b.attemptNumber ?? 0) -
                    Number(a.attemptNumber ?? 0),
                )
                .map((appointment) => (
                  <div className="px-4 py-3" key={appointment.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Attempt {appointment.attemptNumber || 1}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatShipmentDate(appointment.appointmentDate)}
                          {appointment.timeFrom
                            ? ` · ${appointment.timeFrom}${appointment.timeTo ? `–${appointment.timeTo}` : ""}`
                            : ""}
                        </p>
                      </div>
                      <ShipmentPill tone="violet">
                        {SHIPMENT_APPOINTMENT_STATUS_LABELS[
                          appointment.appointmentStatus
                        ] ?? appointment.appointmentStatus}
                      </ShipmentPill>
                    </div>
                    {appointment.appointmentReference ? (
                      <p className="mt-2 text-xs text-slate-600">
                        Ref: {appointment.appointmentReference}
                      </p>
                    ) : null}
                  </div>
                ))
            )}
          </div>
        </Section>

        <Section
          action={actions.deliveryAttempt}
          icon={Route}
          title="Delivery attempts"
          onAdd={() => setAttemptOpen(true)}
        >
          <div className="divide-y divide-slate-100">
            {(shipment.deliveryAttempts ?? []).length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                No delivery attempts have been recorded.
              </p>
            ) : (
              [...shipment.deliveryAttempts]
                .sort(
                  (a, b) =>
                    Number(b.attemptNumber ?? 0) -
                    Number(a.attemptNumber ?? 0),
                )
                .map((attempt) => (
                  <div className="px-4 py-3" key={attempt.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Attempt {attempt.attemptNumber || 1}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatShipmentDateTime(
                            attempt.attemptDateTimeUtc,
                          )}
                        </p>
                      </div>
                      <ShipmentPill
                        tone={
                          attempt.outcome ===
                          SHIPMENT_DELIVERY_ATTEMPT_OUTCOME.Successful
                            ? "emerald"
                            : attempt.outcome ===
                                SHIPMENT_DELIVERY_ATTEMPT_OUTCOME.Partial
                              ? "amber"
                              : "red"
                        }
                      >
                        {SHIPMENT_DELIVERY_ATTEMPT_OUTCOME_LABELS[
                          attempt.outcome
                        ] ?? attempt.outcome}
                      </ShipmentPill>
                    </div>
                    {attempt.nextAttemptDate ? (
                      <p className="mt-2 flex items-center gap-1 text-xs text-slate-600">
                        <MapPin className="h-3.5 w-3.5" />
                        Next {formatShipmentDate(attempt.nextAttemptDate)}
                      </p>
                    ) : null}
                  </div>
                ))
            )}
          </div>
        </Section>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <Truck className="mr-2 inline h-4 w-4" />
        Dockets, appointments and delivery attempts retain their full history.
        They do not move stock.
      </div>

      <DocketModal
        isOpen={docketOpen}
        shipment={shipment}
        transporters={transporters}
        onClose={() => setDocketOpen(false)}
        onSaved={onWritten}
      />
      <AppointmentModal
        isOpen={appointmentOpen}
        shipment={shipment}
        onClose={() => setAppointmentOpen(false)}
        onSaved={onWritten}
      />
      <DeliveryAttemptModal
        isOpen={attemptOpen}
        shipment={shipment}
        onClose={() => setAttemptOpen(false)}
        onSaved={onWritten}
      />
    </div>
  );
};

export default ShipmentTransportTab;
