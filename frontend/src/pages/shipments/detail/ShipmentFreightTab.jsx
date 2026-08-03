import {
  BadgeCheck,
  Banknote,
  Check,
  ExternalLink,
  Plus,
  Send,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import {
  SHIPMENT_FREIGHT_CHARGE_TYPE,
  SHIPMENT_FREIGHT_CHARGE_TYPE_LABELS,
  SHIPMENT_FREIGHT_STATUS,
  toShipmentOptions,
} from "../../../constants/shipmentEnums";
import { myWalletService } from "../../../services/rojmel/myWalletService";
import { walletService } from "../../../services/rojmel/walletService";
import { shipmentFreightService } from "../../../services/shipments";
import { isConflictError } from "../../../utils/apiError";
import {
  DisabledShipmentAction,
  InventoryEffectNotice,
  ShipmentConflict,
  ShipmentFreightStatusPill,
} from "../ShipmentShared";
import {
  formatShipmentCurrency,
  formatShipmentDate,
  formatShipmentDateTime,
  formatShipmentNumber,
  getShipmentMutationMessage,
} from "../shipmentDisplay";
import {
  getShipmentSchemaErrors,
  shipmentFreightSchema,
  shipmentRojmelSchema,
} from "../shipmentSchemas";

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10);
};

const localDateTime = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 16);
};

const CHARGE_FIELDS = [
  ["baseFreight", "Base freight"],
  ["fuelSurcharge", "Fuel surcharge"],
  ["handlingCharge", "Handling charge"],
  ["loadingCharge", "Loading charge"],
  ["unloadingCharge", "Unloading charge"],
  ["appointmentCharge", "Appointment charge"],
  ["returnFreight", "Return freight"],
  ["otherCharge", "Other charge"],
  ["taxAmount", "Tax amount"],
  ["discountAmount", "Discount amount"],
];

const emptyCharge = (shipment) => ({
  actualWeight: shipment.totalGrossWeight || "0",
  appointmentCharge: "0",
  baseFreight: "0",
  chargeType: SHIPMENT_FREIGHT_CHARGE_TYPE.OutboundFreight,
  chargeableWeight: shipment.totalChargeableWeight || "0",
  currencyCode: "INR",
  discountAmount: "0",
  fuelSurcharge: "0",
  handlingCharge: "0",
  loadingCharge: "0",
  otherCharge: "0",
  ratePerWeightUnit: "",
  returnFreight: "0",
  taxAmount: "0",
  transporterInvoiceDate: "",
  transporterInvoiceNumber: "",
  transporterPartyId: shipment.transporterPartyId
    ? String(shipment.transporterPartyId)
    : "",
  unloadingCharge: "0",
  volumetricWeight: shipment.totalVolumetricWeight || "0",
});

const localSubtotal = (form) =>
  CHARGE_FIELDS.reduce((total, [field]) => {
    const value = Number(form[field]);
    if (!Number.isFinite(value)) return total;
    return field === "discountAmount" ? total - value : total + value;
  }, 0);

const FreightChargeModal = ({
  isOpen,
  onClose,
  onSaved,
  shipment,
  transporters,
}) => {
  const [form, setForm] = useState(() => emptyCharge(shipment));
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timeout = window.setTimeout(() => {
      setForm(emptyCharge(shipment));
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
    const parsed = shipmentFreightSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(getShipmentSchemaErrors(parsed));
      return;
    }

    setSaving(true);
    setErrors({});
    setConflict(null);
    try {
      const response = await shipmentFreightService.save(
        shipment.id,
        parsed.data,
      );
      toast.success(response.message || "Freight charge saved.");
      await onSaved();
      onClose();
    } catch (error) {
      const message = getShipmentMutationMessage(
        error,
        "Unable to save this freight charge.",
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
      title="Add freight charge"
      onClose={saving ? undefined : onClose}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AppSelect
          disabled={saving}
          error={errors.chargeType}
          label="Charge type"
          options={toShipmentOptions(SHIPMENT_FREIGHT_CHARGE_TYPE_LABELS)}
          required
          value={form.chargeType}
          onChange={(value) => setField("chargeType", value)}
        />
        <AppInput
          disabled={saving}
          error={errors.currencyCode}
          label="Currency code"
          maxLength={3}
          required
          value={form.currencyCode}
          onChange={(event) =>
            setField("currencyCode", event.target.value.toUpperCase())
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
          error={errors.ratePerWeightUnit}
          label="Rate per weight unit"
          min="0"
          step="any"
          type="number"
          value={form.ratePerWeightUnit}
          onChange={(event) =>
            setField("ratePerWeightUnit", event.target.value)
          }
        />
        {CHARGE_FIELDS.map(([field, label]) => (
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
        {[
          ["actualWeight", "Actual weight"],
          ["volumetricWeight", "Volumetric weight"],
          ["chargeableWeight", "Chargeable weight"],
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
        <AppInput
          disabled={saving}
          error={errors.transporterInvoiceNumber}
          label="Transporter invoice number"
          value={form.transporterInvoiceNumber}
          onChange={(event) =>
            setField("transporterInvoiceNumber", event.target.value)
          }
        />
        <AppInput
          disabled={saving}
          error={errors.transporterInvoiceDate}
          label="Transporter invoice date"
          type="date"
          value={form.transporterInvoiceDate}
          onChange={(event) =>
            setField("transporterInvoiceDate", event.target.value)
          }
        />
      </div>
      <div className="mt-4 rounded-xl border border-brand/20 bg-brand-light px-4 py-3">
        <p className="text-xs font-medium text-slate-600">
          Live local subtotal
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-brand">
          {formatShipmentCurrency(localSubtotal(form), form.currencyCode)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          This is a convenience preview. The saved server total is
          authoritative.
        </p>
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
          Save freight charge
        </AppButton>
      </div>
    </AppModal>
  );
};

const FreightActionModal = ({
  action,
  charge,
  onClose,
  onSaved,
}) => {
  const [notes, setNotes] = useState("");
  const [paidAtUtc, setPaidAtUtc] = useState(localDateTime());
  const [paymentReference, setPaymentReference] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!charge) return undefined;
    const timeout = window.setTimeout(() => {
      setNotes("");
      setPaidAtUtc(localDateTime());
      setPaymentReference("");
      setError("");
      setConflict(null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [action, charge]);

  const submit = async () => {
    setSaving(true);
    setError("");
    setConflict(null);
    try {
      let response;
      if (action === "approve") {
        response = await shipmentFreightService.approve(charge.id, {
          approvalNotes: notes.trim() || undefined,
        });
      } else if (action === "reject") {
        if (!notes.trim()) {
          setError("A rejection reason is required.");
          setSaving(false);
          return;
        }
        response = await shipmentFreightService.reject(charge.id, {
          reason: notes.trim(),
        });
      } else {
        response = await shipmentFreightService.markPaid(charge.id, {
          paidAtUtc: new Date(paidAtUtc).toISOString(),
          paymentReference: paymentReference.trim() || undefined,
        });
      }
      toast.success(response.message || "Freight charge updated.");
      await onSaved();
      onClose();
    } catch (requestError) {
      const message = getShipmentMutationMessage(
        requestError,
        "Unable to update this freight charge.",
      );
      setError(message);
      if (isConflictError(requestError)) setConflict(requestError);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const title =
    action === "approve"
      ? "Approve freight charge"
      : action === "reject"
        ? "Reject freight charge"
        : "Mark freight paid";

  return (
    <AppModal
      isBusy={saving}
      isOpen={Boolean(charge)}
      maxWidth="max-w-xl"
      title={title}
      onClose={saving ? undefined : onClose}
    >
      <InventoryEffectNotice />
      {action === "paid" ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <AppInput
            disabled={saving}
            label="Paid at"
            required
            type="datetime-local"
            value={paidAtUtc}
            onChange={(event) => setPaidAtUtc(event.target.value)}
          />
          <AppInput
            disabled={saving}
            label="Payment reference"
            value={paymentReference}
            onChange={(event) => setPaymentReference(event.target.value)}
          />
        </div>
      ) : (
        <div className="mt-4">
          <label
            className="mb-1.5 block text-[13px] font-medium text-slate-700"
            htmlFor="freight-action-notes"
          >
            {action === "reject" ? "Rejection reason" : "Approval notes"}
          </label>
          <textarea
            className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            disabled={saving}
            id="freight-action-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      )}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      <div className="mt-4">
        <ShipmentConflict error={conflict} onRefresh={onSaved} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <AppButton disabled={saving} variant="secondary" onClick={onClose}>
          Back
        </AppButton>
        <AppButton
          isLoading={saving}
          loadingText="Updating…"
          variant={action === "reject" ? "danger" : "primary"}
          onClick={() => void submit()}
        >
          {title}
        </AppButton>
      </div>
    </AppModal>
  );
};

const RojmelModal = ({ charge, onClose, onSaved }) => {
  const [form, setForm] = useState({
    categoryId: "",
    description: "",
    paymentMode: "",
    transactionDate: today(),
    walletId: "",
  });
  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!charge) return undefined;
    let current = true;
    const load = async () => {
      setLoading(true);
      setForm({
        categoryId: "",
        description: `Freight charge ${charge.id}`,
        paymentMode: "",
        transactionDate: today(),
        walletId: "",
      });
      setErrors({});
      setConflict(null);
      try {
        const [walletResponse, categoryResponse] = await Promise.all([
          walletService.getWallets({
            IsActive: true,
            PageNumber: 1,
            PageSize: 200,
          }),
          myWalletService.getCategories(2),
        ]);
        if (!current) return;
        setWallets(
          Array.isArray(walletResponse.data?.items)
            ? walletResponse.data.items
            : Array.isArray(walletResponse.data)
              ? walletResponse.data
              : [],
        );
        setCategories(
          Array.isArray(categoryResponse.data?.items)
            ? categoryResponse.data.items
            : Array.isArray(categoryResponse.data)
              ? categoryResponse.data
              : [],
        );
      } catch (error) {
        if (!current) return;
        setErrors({
          form: getShipmentMutationMessage(
            error,
            "Unable to load Rojmel wallets and categories.",
          ),
        });
      } finally {
        if (current) setLoading(false);
      }
    };
    void load();
    return () => {
      current = false;
    };
  }, [charge]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };

  const submit = async () => {
    if (charge.rojmelTransactionId) {
      setErrors({ form: "This charge is already posted to Rojmel." });
      return;
    }
    const parsed = shipmentRojmelSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(getShipmentSchemaErrors(parsed));
      return;
    }

    setSaving(true);
    setErrors({});
    setConflict(null);
    try {
      const response = await shipmentFreightService.postToRojmel(
        charge.id,
        parsed.data,
      );
      toast.success(response.message || "Freight expense posted to Rojmel.");
      await onSaved();
      onClose();
    } catch (error) {
      const message = getShipmentMutationMessage(
        error,
        "Unable to post this freight charge to Rojmel.",
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
      isOpen={Boolean(charge)}
      maxWidth="max-w-2xl"
      title="Post freight to Rojmel"
      onClose={saving ? undefined : onClose}
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Approval does not create a Rojmel expense. This is a separate,
        deliberate posting action and can succeed only once.
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <AppSelect
          disabled={loading || saving}
          error={errors.walletId}
          label="Wallet"
          options={wallets.map((wallet) => ({
            label: wallet.walletName || wallet.name || `Wallet ${wallet.id}`,
            value: wallet.id,
          }))}
          required
          value={form.walletId}
          onChange={(value) => setField("walletId", value)}
        />
        <AppInput
          disabled={saving}
          error={errors.transactionDate}
          label="Transaction date"
          required
          type="date"
          value={form.transactionDate}
          onChange={(event) =>
            setField("transactionDate", event.target.value)
          }
        />
        <AppSelect
          disabled={loading || saving}
          error={errors.categoryId}
          label="Expense category"
          options={[
            { label: "No category", value: "" },
            ...categories.map((category) => ({
              label:
                category.categoryName ||
                category.name ||
                `Category ${category.id}`,
              value: category.id,
            })),
          ]}
          value={form.categoryId}
          onChange={(value) => setField("categoryId", value)}
        />
        <AppSelect
          disabled={saving}
          error={errors.paymentMode}
          label="Payment mode"
          options={[
            { label: "Not specified", value: "" },
            { label: "Cash", value: "Cash" },
            { label: "Bank", value: "Bank" },
            { label: "UPI", value: "UPI" },
            { label: "Card", value: "Card" },
            { label: "Other", value: "Other" },
          ]}
          value={form.paymentMode}
          onChange={(value) => setField("paymentMode", value)}
        />
        <div className="md:col-span-2">
          <AppInput
            disabled={saving}
            error={errors.description}
            label="Description"
            value={form.description}
            onChange={(event) => setField("description", event.target.value)}
          />
        </div>
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
          loadingText="Posting…"
          onClick={() => void submit()}
        >
          Post to Rojmel
        </AppButton>
      </div>
    </AppModal>
  );
};

const ShipmentFreightTab = ({
  action,
  capabilities,
  onWritten,
  shipment,
  transporters,
}) => {
  const [chargeOpen, setChargeOpen] = useState(false);
  const [actionState, setActionState] = useState(null);
  const [rojmelCharge, setRojmelCharge] = useState(null);
  const [workingId, setWorkingId] = useState(null);
  const [conflict, setConflict] = useState(null);

  const submitCharge = async (charge) => {
    setWorkingId(charge.id);
    setConflict(null);
    try {
      const response = await shipmentFreightService.submit(charge.id);
      toast.success(response.message || "Freight charge submitted.");
      await onWritten();
    } catch (error) {
      const message = getShipmentMutationMessage(
        error,
        "Unable to submit this freight charge.",
      );
      if (isConflictError(error)) setConflict(error);
      toast.error(message);
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {action.enabled ? (
          <AppButton onClick={() => setChargeOpen(true)}>
            <Plus className="h-4 w-4" />
            Add freight charge
          </AppButton>
        ) : (
          <DisabledShipmentAction reason={action.reason}>
            <AppButton disabled>
              <Plus className="h-4 w-4" />
              Add freight charge
            </AppButton>
          </DisabledShipmentAction>
        )}
      </div>
      <InventoryEffectNotice />
      <div className="rounded-xl border border-brand/20 bg-brand-light px-4 py-3 text-sm text-slate-700">
        <strong className="text-brand">
          Approval does not create a Rojmel expense.
        </strong>{" "}
        Posting to Rojmel is always a separate explicit action.
      </div>
      <ShipmentConflict error={conflict} onRefresh={onWritten} />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {(shipment.freightCharges ?? []).length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Banknote className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-900">
              No freight charges recorded
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Add a charge when transporter billing details are available.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {shipment.freightCharges.map((charge) => {
              const canUpdate = action.enabled && capabilities.freight.canUpdate;
              const canApprove =
                action.enabled && capabilities.freight.canApprove;
              const submitted = charge.status === SHIPMENT_FREIGHT_STATUS.Submitted;
              const approved =
                charge.status === SHIPMENT_FREIGHT_STATUS.Approved ||
                charge.status === SHIPMENT_FREIGHT_STATUS.PartiallyPaid;

              return (
                <div className="p-4" key={charge.id}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {SHIPMENT_FREIGHT_CHARGE_TYPE_LABELS[
                            charge.chargeType
                          ] ?? charge.chargeType}
                        </p>
                        <ShipmentFreightStatusPill status={charge.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {charge.transporterName || "No transporter"} ·
                        chargeable weight{" "}
                        {formatShipmentNumber(charge.chargeableWeight, "0")}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600">
                        <span>
                          Server total{" "}
                          <strong className="text-slate-900">
                            {formatShipmentCurrency(
                              charge.totalCharge,
                              charge.currencyCode,
                            )}
                          </strong>
                        </span>
                        {charge.transporterInvoiceNumber ? (
                          <span>
                            Invoice{" "}
                            <strong>{charge.transporterInvoiceNumber}</strong>
                            {charge.transporterInvoiceDate
                              ? ` · ${formatShipmentDate(charge.transporterInvoiceDate)}`
                              : ""}
                          </span>
                        ) : null}
                        {charge.approvedAtUtc ? (
                          <span>
                            Approved{" "}
                            {formatShipmentDateTime(charge.approvedAtUtc)}
                          </span>
                        ) : null}
                        {charge.paidAtUtc ? (
                          <span>
                            Paid {formatShipmentDateTime(charge.paidAtUtc)}
                          </span>
                        ) : null}
                      </div>
                      {charge.rojmelTransactionId ? (
                        <a
                          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                          href={`/rojmel/transactions?search=${encodeURIComponent(charge.rojmelTransactionId)}`}
                        >
                          Rojmel transaction {charge.rojmelTransactionId}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {charge.status === SHIPMENT_FREIGHT_STATUS.Draft ? (
                        canUpdate ? (
                          <AppButton
                            className="h-8 px-3"
                            isLoading={workingId === charge.id}
                            loadingText="Submitting…"
                            variant="secondary"
                            onClick={() => void submitCharge(charge)}
                          >
                            <Send className="h-4 w-4" />
                            Submit
                          </AppButton>
                        ) : (
                          <DisabledShipmentAction reason="Submitting requires Freight update permission.">
                            <AppButton
                              className="h-8 px-3"
                              disabled
                              variant="secondary"
                            >
                              Submit
                            </AppButton>
                          </DisabledShipmentAction>
                        )
                      ) : null}
                      {submitted ? (
                        <>
                          {canApprove ? (
                            <>
                              <AppButton
                                className="h-8 px-3"
                                variant="secondary"
                                onClick={() =>
                                  setActionState({
                                    action: "reject",
                                    charge,
                                  })
                                }
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </AppButton>
                              <AppButton
                                className="h-8 px-3"
                                onClick={() =>
                                  setActionState({
                                    action: "approve",
                                    charge,
                                  })
                                }
                              >
                                <Check className="h-4 w-4" />
                                Approve
                              </AppButton>
                            </>
                          ) : (
                            <DisabledShipmentAction reason="Approving or rejecting requires Shipment Operations Freight approval permission.">
                              <AppButton className="h-8 px-3" disabled>
                                <BadgeCheck className="h-4 w-4" />
                                Approve
                              </AppButton>
                            </DisabledShipmentAction>
                          )}
                        </>
                      ) : null}
                      {approved && canUpdate ? (
                        <AppButton
                          className="h-8 px-3"
                          variant="secondary"
                          onClick={() =>
                            setActionState({ action: "paid", charge })
                          }
                        >
                          <Banknote className="h-4 w-4" />
                          Mark paid
                        </AppButton>
                      ) : null}
                      {approved &&
                      !charge.rojmelTransactionId &&
                      canUpdate ? (
                        <AppButton
                          className="h-8 px-3"
                          onClick={() => setRojmelCharge(charge)}
                        >
                          <WalletCards className="h-4 w-4" />
                          Post to Rojmel
                        </AppButton>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FreightChargeModal
        isOpen={chargeOpen}
        shipment={shipment}
        transporters={transporters}
        onClose={() => setChargeOpen(false)}
        onSaved={onWritten}
      />
      <FreightActionModal
        action={actionState?.action}
        charge={actionState?.charge}
        onClose={() => setActionState(null)}
        onSaved={onWritten}
      />
      <RojmelModal
        charge={rojmelCharge}
        onClose={() => setRojmelCharge(null)}
        onSaved={onWritten}
      />
    </div>
  );
};

export default ShipmentFreightTab;
