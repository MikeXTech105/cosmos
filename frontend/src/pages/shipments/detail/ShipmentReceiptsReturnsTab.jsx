import {
  ArrowDownToLine,
  ExternalLink,
  PackageCheck,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import AppTooltip from "../../../components/common/AppTooltip";
import { SHIPMENT_RETURN_STATUS } from "../../../constants/shipmentEnums";
import { shipmentActivityService } from "../../../services/shipments";
import { isConflictError } from "../../../utils/apiError";
import {
  validateReturnReceive,
  validateReturnReceiveLine,
} from "../../../utils/shipmentOperations";
import {
  DisabledShipmentAction,
  InventoryEffectNotice,
  ShipmentConflict,
  ShipmentReturnStatusPill,
} from "../ShipmentShared";
import {
  formatShipmentDate,
  formatShipmentNumber,
  getShipmentMutationMessage,
} from "../shipmentDisplay";
import {
  getShipmentSchemaErrors,
  shipmentReceiptSchema,
  shipmentReturnReceiveSchema,
  shipmentReturnSchema,
} from "../shipmentSchemas";

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10);
};

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

const receiptRemaining = (item) =>
  Math.max(
    0,
    Number(item.dispatchedQuantity || 0) -
      Number(item.receivedQuantity || 0) -
      Number(item.rejectedQuantity || 0) -
      Number(item.damagedQuantity || 0) -
      Number(item.shortQuantity || 0),
  );

const ReceiptModal = ({ isOpen, onClose, onSaved, shipment }) => {
  const empty = useMemo(
    () => ({
      items: (shipment.items ?? []).map((item) => ({
        damagedQuantity: "0",
        notes: "",
        reasonCode: "",
        receivedQuantity: "0",
        rejectedQuantity: "0",
        shipmentItemId: item.id,
        shortQuantity: "0",
      })),
      marketplaceReceiptReference: "",
      notes: "",
      proofAttachmentUrl: "",
      receiptDate: today(),
      receivedByName: "",
    }),
    [shipment.items],
  );
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timeout = window.setTimeout(() => {
      setForm(empty);
      setErrors({});
      setConflict(null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [empty, isOpen]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };

  const setItem = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((line, itemIndex) =>
        itemIndex === index ? { ...line, [field]: value } : line,
      ),
    }));
    setErrors((current) => ({
      ...current,
      [`items.${index}.${field}`]: "",
      [`items.${index}`]: "",
      form: "",
    }));
  };

  const submit = async () => {
    const parsed = shipmentReceiptSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(getShipmentSchemaErrors(parsed));
      return;
    }

    const localErrors = {};
    let positiveLines = 0;
    parsed.data.items.forEach((line, index) => {
      const total =
        line.receivedQuantity +
        line.rejectedQuantity +
        line.damagedQuantity +
        line.shortQuantity;
      if (total > 0) positiveLines += 1;
      if (total - receiptRemaining(shipment.items[index]) > 1e-9) {
        localErrors[`items.${index}`] =
          "This receipt exceeds the remaining dispatched quantity.";
      }
    });
    if (positiveLines === 0) {
      localErrors.form = "Enter a receipt quantity for at least one item.";
    }
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    setConflict(null);
    try {
      const response = await shipmentActivityService.createReceipt(
        shipment.id,
        {
          ...parsed.data,
          items: parsed.data.items.filter(
            (line) =>
              line.receivedQuantity +
                line.rejectedQuantity +
                line.damagedQuantity +
                line.shortQuantity >
              0,
          ),
        },
      );
      toast.success(response.message || "Shipment receipt recorded.");
      await onSaved();
      onClose();
    } catch (error) {
      const message = getShipmentMutationMessage(
        error,
        "Unable to record this receipt.",
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
      maxWidth="max-w-6xl"
      title="Record shipment receipt"
      onClose={saving ? undefined : onClose}
    >
      <InventoryEffectNotice />
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AppInput
          disabled={saving}
          error={errors.receiptDate}
          label="Receipt date"
          required
          type="date"
          value={form.receiptDate}
          onChange={(event) => setField("receiptDate", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.marketplaceReceiptReference}
          label="Marketplace receipt reference"
          value={form.marketplaceReceiptReference}
          onChange={(event) =>
            setField("marketplaceReceiptReference", event.target.value)
          }
        />
        <AppInput
          disabled={saving}
          error={errors.receivedByName}
          label="Received by"
          value={form.receivedByName}
          onChange={(event) => setField("receivedByName", event.target.value)}
        />
        <div>
          <AppInput
            disabled={saving}
            error={errors.proofAttachmentUrl}
            label="Proof URL or path"
            placeholder="https://…"
            value={form.proofAttachmentUrl}
            onChange={(event) =>
              setField("proofAttachmentUrl", event.target.value)
            }
          />
          {form.proofAttachmentUrl ? (
            <a
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              href={form.proofAttachmentUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open proof <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[1120px] table-fixed text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-600">
            <tr>
              <th className="w-64 px-3 py-2.5">Item</th>
              <th className="w-32 px-3 py-2.5">Received</th>
              <th className="w-32 px-3 py-2.5">Rejected</th>
              <th className="w-32 px-3 py-2.5">Damaged</th>
              <th className="w-32 px-3 py-2.5">Short</th>
              <th className="w-40 px-3 py-2.5">Reason code</th>
              <th className="w-64 px-3 py-2.5">Dispatch balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(shipment.items ?? []).map((item, index) => (
              <tr key={item.id}>
                <td className="px-3 py-3">
                  <p className="font-medium text-slate-900">
                    {item.itemNameSnapshot}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.itemCodeSnapshot}
                  </p>
                </td>
                {[
                  "receivedQuantity",
                  "rejectedQuantity",
                  "damagedQuantity",
                  "shortQuantity",
                ].map((field) => (
                  <td className="px-3 py-3" key={field}>
                    <AppInput
                      aria-label={`${field} for ${item.itemNameSnapshot}`}
                      disabled={saving}
                      error={errors[`items.${index}.${field}`]}
                      min="0"
                      step="any"
                      type="number"
                      value={form.items[index]?.[field] ?? "0"}
                      onChange={(event) =>
                        setItem(index, field, event.target.value)
                      }
                    />
                  </td>
                ))}
                <td className="px-3 py-3">
                  <AppInput
                    aria-label={`Reason code for ${item.itemNameSnapshot}`}
                    disabled={saving}
                    value={form.items[index]?.reasonCode ?? ""}
                    onChange={(event) =>
                      setItem(index, "reasonCode", event.target.value)
                    }
                  />
                </td>
                <td className="px-3 py-3">
                  <p className="text-xs leading-5 text-slate-600">
                    Dispatched{" "}
                    <strong>
                      {formatShipmentNumber(item.dispatchedQuantity, "0")}
                    </strong>{" "}
                    · already received{" "}
                    <strong>
                      {formatShipmentNumber(item.receivedQuantity, "0")}
                    </strong>{" "}
                    · remaining{" "}
                    <strong>{formatShipmentNumber(receiptRemaining(item), "0")}</strong>
                  </p>
                  {errors[`items.${index}`] ? (
                    <p className="mt-1 text-xs text-red-600">
                      {errors[`items.${index}`]}
                    </p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <TextArea
          disabled={saving}
          error={errors.notes}
          id="receipt-notes"
          label="Notes"
          value={form.notes}
          onChange={(value) => setField("notes", value)}
        />
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
          Record receipt
        </AppButton>
      </div>
    </AppModal>
  );
};

const ReturnModal = ({
  isOpen,
  onClose,
  onSaved,
  shipment,
  transporters,
}) => {
  const empty = useMemo(
    () => ({
      docketNumber: "",
      expectedReturnDate: "",
      items: (shipment.items ?? []).map((item) => ({
        notes: "",
        reasonCode: "",
        returnQuantity: "0",
        shipmentItemId: item.id,
      })),
      notes: "",
      returnDate: today(),
      returnReason: "",
      transporterPartyId: shipment.transporterPartyId
        ? String(shipment.transporterPartyId)
        : "",
    }),
    [shipment.items, shipment.transporterPartyId],
  );
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timeout = window.setTimeout(() => {
      setForm(empty);
      setErrors({});
      setConflict(null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [empty, isOpen]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };

  const setItem = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((line, itemIndex) =>
        itemIndex === index ? { ...line, [field]: value } : line,
      ),
    }));
    setErrors((current) => ({
      ...current,
      [`items.${index}.${field}`]: "",
      [`items.${index}`]: "",
      form: "",
    }));
  };

  const submit = async () => {
    const parsed = shipmentReturnSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(getShipmentSchemaErrors(parsed));
      return;
    }

    const localErrors = {};
    parsed.data.items.forEach((line, index) => {
      const item = shipment.items[index];
      const remaining =
        Number(item.dispatchedQuantity || 0) -
        Number(item.returnedQuantity || 0);
      if (line.returnQuantity - remaining > 1e-9) {
        localErrors[`items.${index}`] =
          "Return quantity cannot exceed dispatched quantity not already returned.";
      }
    });
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    setConflict(null);
    try {
      const response = await shipmentActivityService.createReturn(
        shipment.id,
        {
          ...parsed.data,
          items: parsed.data.items.filter(
            (line) => line.returnQuantity > 0,
          ),
        },
      );
      toast.success(response.message || "Shipment return created.");
      await onSaved();
      onClose();
    } catch (error) {
      const message = getShipmentMutationMessage(
        error,
        "Unable to create this return.",
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
      maxWidth="max-w-5xl"
      title="Create shipment return"
      onClose={saving ? undefined : onClose}
    >
      <InventoryEffectNotice />
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AppInput
          disabled={saving}
          error={errors.returnDate}
          label="Return date"
          required
          type="date"
          value={form.returnDate}
          onChange={(event) => setField("returnDate", event.target.value)}
        />
        <AppInput
          disabled={saving}
          error={errors.expectedReturnDate}
          label="Expected return date"
          min={form.returnDate}
          type="date"
          value={form.expectedReturnDate}
          onChange={(event) =>
            setField("expectedReturnDate", event.target.value)
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
          onChange={(value) => setField("transporterPartyId", String(value))}
        />
        <AppInput
          disabled={saving}
          error={errors.docketNumber}
          label="Return docket number"
          value={form.docketNumber}
          onChange={(event) => setField("docketNumber", event.target.value)}
        />
        <div className="md:col-span-2 xl:col-span-4">
          <AppInput
            disabled={saving}
            error={errors.returnReason}
            label="Return reason"
            value={form.returnReason}
            onChange={(event) => setField("returnReason", event.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
        {(shipment.items ?? []).map((item, index) => {
          const remaining = Math.max(
            0,
            Number(item.dispatchedQuantity || 0) -
              Number(item.returnedQuantity || 0),
          );

          return (
            <div
              className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_180px_180px]"
              key={item.id}
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {item.itemNameSnapshot}
                </p>
                <p className="text-xs text-slate-500">
                  {item.itemCodeSnapshot} · dispatched{" "}
                  {formatShipmentNumber(item.dispatchedQuantity, "0")} ·
                  available to return {formatShipmentNumber(remaining, "0")}
                </p>
                {errors[`items.${index}`] ? (
                  <p className="mt-1 text-xs text-red-600">
                    {errors[`items.${index}`]}
                  </p>
                ) : null}
              </div>
              <AppInput
                disabled={saving}
                error={errors[`items.${index}.returnQuantity`]}
                label="Return quantity"
                max={remaining}
                min="0"
                step="any"
                type="number"
                value={form.items[index]?.returnQuantity ?? "0"}
                onChange={(event) =>
                  setItem(index, "returnQuantity", event.target.value)
                }
              />
              <AppInput
                disabled={saving}
                error={errors[`items.${index}.reasonCode`]}
                label="Reason code"
                value={form.items[index]?.reasonCode ?? ""}
                onChange={(event) =>
                  setItem(index, "reasonCode", event.target.value)
                }
              />
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <TextArea
          disabled={saving}
          error={errors.notes}
          id="return-notes"
          label="Notes"
          value={form.notes}
          onChange={(value) => setField("notes", value)}
        />
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
          loadingText="Creating…"
          onClick={submit}
        >
          Create return
        </AppButton>
      </div>
    </AppModal>
  );
};

const ReturnReceiveModal = ({
  onClose,
  onSaved,
  returnRecord,
  shipment,
}) => {
  const [form, setForm] = useState({
    items: [],
    notes: "",
    receivedBackDate: today(),
  });
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!returnRecord) return undefined;
    const timeout = window.setTimeout(() => {
      setForm({
        items: (returnRecord.items ?? []).map((item) => ({
          damagedQuantity: "0",
          nonRestockableQuantity: "0",
          notes: "",
          reasonCode: item.reasonCode || "",
          receivedBackQuantity: item.returnQuantity,
          restockableQuantity: item.returnQuantity,
          returnQuantity: item.returnQuantity,
          shipmentReturnItemId: item.id,
        })),
        notes: "",
        receivedBackDate: today(),
      });
      setErrors({});
      setConflict(null);
      setConfirming(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [returnRecord]);

  const validation = validateReturnReceive(form.items);
  const receiveItems = form.items.map((item) => ({
    damagedQuantity: item.damagedQuantity,
    nonRestockableQuantity: item.nonRestockableQuantity,
    notes: item.notes,
    reasonCode: item.reasonCode,
    receivedBackQuantity: item.receivedBackQuantity,
    restockableQuantity: item.restockableQuantity,
    shipmentReturnItemId: item.shipmentReturnItemId,
  }));

  const setItem = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((line, itemIndex) =>
        itemIndex === index ? { ...line, [field]: value } : line,
      ),
    }));
    setErrors((current) => ({
      ...current,
      [`items.${index}`]: "",
      form: "",
    }));
    setConfirming(false);
  };

  const review = () => {
    const parsed = shipmentReturnReceiveSchema.safeParse({
      ...form,
      items: receiveItems,
    });
    if (!parsed.success) {
      setErrors(getShipmentSchemaErrors(parsed));
      return;
    }
    if (!validation.isValid) {
      setErrors(
        Object.fromEntries(
          validation.errors.map((error) => [
            `items.${error.index}`,
            error.message,
          ]),
        ),
      );
      return;
    }
    setErrors({});
    setConfirming(true);
  };

  const submit = async () => {
    const parsed = shipmentReturnReceiveSchema.safeParse({
      ...form,
      items: receiveItems,
    });
    if (!parsed.success || !validation.isValid) {
      setConfirming(false);
      review();
      return;
    }

    setSaving(true);
    setConflict(null);
    try {
      const response = await shipmentActivityService.receiveReturn(
        returnRecord.id,
        parsed.data,
      );
      toast.success(response.message || "Return received and stock updated.");
      await onSaved();
      onClose();
    } catch (error) {
      const message = getShipmentMutationMessage(
        error,
        "Unable to receive this return.",
      );
      setErrors({ form: message });
      if (isConflictError(error)) setConflict(error);
      setConfirming(false);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      isBusy={saving}
      isOpen={Boolean(returnRecord)}
      maxWidth="max-w-5xl"
      title={confirming ? "Confirm return restock" : "Receive shipment return"}
      onClose={saving ? undefined : onClose}
    >
      {confirming ? (
        <>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
            <div className="flex items-start gap-3">
              <PackageCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">
                  Add {formatShipmentNumber(validation.totalRestockable, "0")}{" "}
                  restockable units back to stock?
                </p>
                <p className="mt-1 text-sm leading-6">
                  Only the restockable quantity is added back. This receive can
                  be submitted once and cannot be repeated from this return
                  line.
                </p>
              </div>
            </div>
          </div>
          {errors.form ? (
            <p className="mt-4 text-sm text-red-600">{errors.form}</p>
          ) : null}
          <div className="mt-4">
            <ShipmentConflict error={conflict} onRefresh={onSaved} />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <AppButton
              disabled={saving}
              variant="secondary"
              onClick={() => setConfirming(false)}
            >
              Review quantities
            </AppButton>
            <AppButton
              isLoading={saving}
              loadingText="Receiving…"
              onClick={() => void submit()}
            >
              Confirm stock receipt
            </AppButton>
          </div>
        </>
      ) : (
        <>
          <InventoryEffectNotice type="return" />
          <div className="mt-4">
            <AppInput
              className="max-w-xs"
              disabled={saving}
              error={errors.receivedBackDate}
              label="Received-back date"
              required
              type="date"
              value={form.receivedBackDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  receivedBackDate: event.target.value,
                }))
              }
            />
          </div>
          <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {(returnRecord?.items ?? []).map((returnItem, index) => {
              const shipmentItem = (shipment.items ?? []).find(
                (item) => String(item.id) === String(returnItem.shipmentItemId),
              );
              const result = validateReturnReceiveLine(form.items[index]);

              return (
                <div className="p-4" key={returnItem.id}>
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {shipmentItem?.itemNameSnapshot ||
                        `Return item ${returnItem.id}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      Return quantity{" "}
                      {formatShipmentNumber(returnItem.returnQuantity, "0")}
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    {[
                      ["receivedBackQuantity", "Received back"],
                      ["restockableQuantity", "Restockable"],
                      ["damagedQuantity", "Damaged"],
                      ["nonRestockableQuantity", "Non-restockable"],
                    ].map(([field, label]) => (
                      <AppInput
                        disabled={saving}
                        key={field}
                        label={label}
                        min="0"
                        step="any"
                        type="number"
                        value={form.items[index]?.[field] ?? "0"}
                        onChange={(event) =>
                          setItem(index, field, event.target.value)
                        }
                      />
                    ))}
                  </div>
                  {!result.isValid || errors[`items.${index}`] ? (
                    <p className="mt-2 text-xs text-red-600">
                      {errors[`items.${index}`] ||
                        result.errors.join(" ")}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-emerald-700">
                      Split reconciles to the received-back quantity.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Represent split physical arrivals as separate return lines.
          </p>
          <div className="mt-4">
            <TextArea
              disabled={saving}
              error={errors.notes}
              id="return-receive-notes"
              label="Notes"
              value={form.notes}
              onChange={(value) =>
                setForm((current) => ({ ...current, notes: value }))
              }
            />
          </div>
          {errors.form ? (
            <p className="mt-4 text-sm text-red-600">{errors.form}</p>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <AppButton disabled={saving} variant="secondary" onClick={onClose}>
              Back
            </AppButton>
            <AppButton onClick={review}>
              Review stock receipt
            </AppButton>
          </div>
        </>
      )}
    </AppModal>
  );
};

const canReceiveReturn = (returnRecord) =>
  !returnRecord.receivedBackDate &&
  ![
    SHIPMENT_RETURN_STATUS.Received,
    SHIPMENT_RETURN_STATUS.PartiallyReceived,
    SHIPMENT_RETURN_STATUS.Cancelled,
    SHIPMENT_RETURN_STATUS.Closed,
  ].includes(returnRecord.status);

const ShipmentReceiptsReturnsTab = ({
  actions,
  onWritten,
  shipment,
  transporters,
}) => {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [receiveReturn, setReceiveReturn] = useState(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        {actions.receipt.enabled ? (
          <AppButton variant="secondary" onClick={() => setReceiptOpen(true)}>
            <ArrowDownToLine className="h-4 w-4" />
            Record receipt
          </AppButton>
        ) : (
          <DisabledShipmentAction reason={actions.receipt.reason}>
            <AppButton disabled variant="secondary">
              <ArrowDownToLine className="h-4 w-4" />
              Record receipt
            </AppButton>
          </DisabledShipmentAction>
        )}
        {actions.return.enabled ? (
          <AppButton onClick={() => setReturnOpen(true)}>
            <RotateCcw className="h-4 w-4" />
            Create return
          </AppButton>
        ) : (
          <DisabledShipmentAction reason={actions.return.reason}>
            <AppButton disabled>
              <RotateCcw className="h-4 w-4" />
              Create return
            </AppButton>
          </DisabledShipmentAction>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Receipts</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Receipt records do not change current stock.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {(shipment.receipts ?? []).length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                No receipts have been recorded.
              </p>
            ) : (
              shipment.receipts.map((receipt) => (
                <div className="px-4 py-3" key={receipt.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Receipt {receipt.receiptNumber || receipt.id}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatShipmentDate(receipt.receiptDate)} ·{" "}
                        {receipt.receivedByName || "Receiver not named"}
                      </p>
                    </div>
                    {receipt.proofAttachmentUrl ? (
                      <AppTooltip label="Open proof URL">
                        <a
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-brand-light hover:text-brand"
                          href={receipt.proofAttachmentUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </AppTooltip>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    {(receipt.items ?? []).length} item lines
                    {receipt.marketplaceReceiptReference
                      ? ` · Ref ${receipt.marketplaceReceiptReference}`
                      : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Returns</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Creating a return has no stock effect. Receiving its restockable
              split is the stock-in event.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {(shipment.returns ?? []).length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                No returns have been created.
              </p>
            ) : (
              shipment.returns.map((returnRecord) => (
                <div className="px-4 py-3" key={returnRecord.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {returnRecord.returnNumber ||
                          `Return ${returnRecord.id}`}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatShipmentDate(returnRecord.returnDate)} ·{" "}
                        {(returnRecord.items ?? []).length} item lines
                      </p>
                    </div>
                    <ShipmentReturnStatusPill status={returnRecord.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-600">
                      {returnRecord.receivedBackDate
                        ? `Received ${formatShipmentDate(returnRecord.receivedBackDate)}`
                        : "Not yet received"}
                    </p>
                    {canReceiveReturn(returnRecord) &&
                    actions.return.enabled ? (
                      <AppButton
                        className="h-8 px-3"
                        variant="secondary"
                        onClick={() => setReceiveReturn(returnRecord)}
                      >
                        <PackageCheck className="h-4 w-4" />
                        Receive
                      </AppButton>
                    ) : returnRecord.receivedBackDate ? (
                      <span className="text-xs font-medium text-emerald-700">
                        Read only after receive
                      </span>
                    ) : (
                      <DisabledShipmentAction reason={actions.return.reason}>
                        <AppButton
                          className="h-8 px-3"
                          disabled
                          variant="secondary"
                        >
                          <PackageCheck className="h-4 w-4" />
                          Receive
                        </AppButton>
                      </DisabledShipmentAction>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <Plus className="mr-1 inline h-3.5 w-3.5" />
        Represent split physical arrivals as separate return lines. A received
        return line is read only.
      </div>

      <ReceiptModal
        isOpen={receiptOpen}
        shipment={shipment}
        onClose={() => setReceiptOpen(false)}
        onSaved={onWritten}
      />
      <ReturnModal
        isOpen={returnOpen}
        shipment={shipment}
        transporters={transporters}
        onClose={() => setReturnOpen(false)}
        onSaved={onWritten}
      />
      <ReturnReceiveModal
        returnRecord={receiveReturn}
        shipment={shipment}
        onClose={() => setReceiveReturn(null)}
        onSaved={onWritten}
      />
    </div>
  );
};

export default ShipmentReceiptsReturnsTab;
