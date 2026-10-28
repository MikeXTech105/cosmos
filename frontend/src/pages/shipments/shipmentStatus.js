import {
  SHIPMENT_STATUS,
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_STATUS_TONES,
} from "../../constants/shipmentEnums";

const TERMINAL = new Set([
  SHIPMENT_STATUS.Cancelled,
  SHIPMENT_STATUS.Closed,
]);

const TRANSITIONS = Object.freeze({
  [SHIPMENT_STATUS.Draft]: [
    SHIPMENT_STATUS.ReadyForPacking,
    SHIPMENT_STATUS.ReadyForDispatch,
  ],
  [SHIPMENT_STATUS.ReadyForPacking]: [
    SHIPMENT_STATUS.PackingInProgress,
    SHIPMENT_STATUS.Packed,
  ],
  [SHIPMENT_STATUS.PackingInProgress]: [SHIPMENT_STATUS.Packed],
  [SHIPMENT_STATUS.Packed]: [
    SHIPMENT_STATUS.ReadyForDispatch,
    SHIPMENT_STATUS.AppointmentPending,
  ],
  [SHIPMENT_STATUS.ReadyForDispatch]: [
    SHIPMENT_STATUS.Dispatched,
    SHIPMENT_STATUS.AppointmentPending,
  ],
  [SHIPMENT_STATUS.Dispatched]: [
    SHIPMENT_STATUS.AppointmentPending,
    SHIPMENT_STATUS.AppointmentBooked,
    SHIPMENT_STATUS.InTransit,
    SHIPMENT_STATUS.DeliveryAttempted,
    SHIPMENT_STATUS.PartiallyDelivered,
    SHIPMENT_STATUS.Delivered,
  ],
  [SHIPMENT_STATUS.AppointmentPending]: [
    SHIPMENT_STATUS.AppointmentBooked,
    SHIPMENT_STATUS.Dispatched,
    SHIPMENT_STATUS.InTransit,
  ],
  [SHIPMENT_STATUS.AppointmentBooked]: [
    SHIPMENT_STATUS.Dispatched,
    SHIPMENT_STATUS.InTransit,
  ],
  [SHIPMENT_STATUS.InTransit]: [
    SHIPMENT_STATUS.DeliveryAttempted,
    SHIPMENT_STATUS.PartiallyDelivered,
    SHIPMENT_STATUS.Delivered,
    SHIPMENT_STATUS.ReturnInProgress,
  ],
  [SHIPMENT_STATUS.DeliveryAttempted]: [
    SHIPMENT_STATUS.InTransit,
    SHIPMENT_STATUS.PartiallyDelivered,
    SHIPMENT_STATUS.Delivered,
    SHIPMENT_STATUS.ReturnInProgress,
  ],
  [SHIPMENT_STATUS.PartiallyDelivered]: [
    SHIPMENT_STATUS.DeliveryAttempted,
    SHIPMENT_STATUS.Delivered,
    SHIPMENT_STATUS.ReturnInProgress,
  ],
  [SHIPMENT_STATUS.Delivered]: [
    SHIPMENT_STATUS.ReturnInProgress,
    SHIPMENT_STATUS.Closed,
  ],
  [SHIPMENT_STATUS.ReturnInProgress]: [
    SHIPMENT_STATUS.Returned,
    SHIPMENT_STATUS.Closed,
  ],
  [SHIPMENT_STATUS.Returned]: [SHIPMENT_STATUS.Closed],
  [SHIPMENT_STATUS.Cancelled]: [],
  [SHIPMENT_STATUS.Closed]: [],
});

const permitted = (enabled, reason) => ({
  enabled: Boolean(enabled),
  reason: enabled ? "" : reason,
});

export const getStatusLabel = (status) =>
  SHIPMENT_STATUS_LABELS[status] ?? String(status ?? "Unknown");

export const getStatusTone = (status) =>
  SHIPMENT_STATUS_TONES[status] ?? "slate";

export const getAvailableTransitions = (status) => [
  ...(TRANSITIONS[status] ?? []),
];

export const getShipmentActions = (shipment = {}, capabilities = {}) => {
  const status = shipment.status;
  const terminal = TERMINAL.has(status);
  const writeReason = terminal
    ? `${getStatusLabel(status)} shipments are read only.`
    : "";
  const transitionTargets = getAvailableTransitions(status);
  const transitionPermission =
    capabilities.canTransition ?? capabilities.canUpdate ?? false;
  const packingState = [SHIPMENT_STATUS.Draft, SHIPMENT_STATUS.ReadyForPacking, SHIPMENT_STATUS.PackingInProgress].includes(status);
  const repackingState = packingState || [SHIPMENT_STATUS.Packed, SHIPMENT_STATUS.ReadyForDispatch].includes(status);
  const freightProtected = (shipment.freightCharges ?? []).some(charge => ["Submitted", "Approved", "PartiallyPaid", "Paid", 2, 3, 5, 6].includes(charge.status));

  return {
    appointment: permitted(
      !terminal && capabilities.canManageAppointments,
      writeReason ||
        "Appointment actions require Shipment Operations Appointments permission.",
    ),
    cancel: permitted(
      !terminal && capabilities.canCancel,
      writeReason ||
        "Cancelling requires Shipment Operations Shipments delete permission.",
    ),
    deliveryAttempt: permitted(
      !terminal && capabilities.canManageTracking,
      writeReason ||
        "Delivery attempts require Shipment Operations Tracking permission.",
    ),
    docket: permitted(
      !terminal && capabilities.canManageDockets,
      writeReason ||
        "Docket actions require Shipment Operations Dockets permission.",
    ),
    freight: permitted(
      !terminal && capabilities.canManageFreight,
      writeReason ||
        "Freight actions require Shipment Operations Freight permission.",
    ),
    pack: {
      ...permitted(!terminal && packingState && !shipment.dispatchedAtUtc && capabilities.canManagePacking,
        writeReason || (!packingState ? "Adding packages requires a draft packing state. Review Remove / repack to reopen an undispatched package." : "Packing actions require Shipment Operations Packing edit permission.")),
      canRepack: !terminal && repackingState && !shipment.dispatchedAtUtc && !freightProtected && capabilities.canManagePacking,
      repackReason: freightProtected ? "Ask Accounts to resolve submitted, approved or paid freight before changing package weights." : "Repack requires Packing edit permission and an undispatched package.",
    },
    receipt: permitted(
      !terminal && capabilities.canManageReceipts,
      writeReason ||
        "Receipt actions require Shipment Operations Receipts permission.",
    ),
    return: permitted(
      !terminal && capabilities.canManageReturns,
      writeReason ||
        "Return actions require Shipment Operations Returns permission.",
    ),
    terminal,
    tracking: permitted(
      !terminal && capabilities.canManageTracking,
      writeReason ||
        "Tracking events require Shipment Operations Tracking permission.",
    ),
    transition: transitionTargets.map((targetStatus) => ({
      enabled: !terminal && transitionPermission,
      reason:
        terminal
          ? writeReason
          : transitionPermission
            ? ""
            : "Status changes require Shipment Operations Shipments update permission.",
      targetStatus,
    })),
  };
};

export { SHIPMENT_STATUS };
