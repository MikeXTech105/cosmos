const freezeValues = (values) =>
  Object.freeze(Object.fromEntries(values.map((value) => [value, value])));

export const SHIPMENT_STATUS = freezeValues([
  "Draft",
  "ReadyForPacking",
  "PackingInProgress",
  "Packed",
  "ReadyForDispatch",
  "Dispatched",
  "AppointmentPending",
  "AppointmentBooked",
  "InTransit",
  "DeliveryAttempted",
  "PartiallyDelivered",
  "Delivered",
  "ReturnInProgress",
  "Returned",
  "Cancelled",
  "Closed",
]);

export const SHIPMENT_SOURCE_TYPE = freezeValues([
  "Manual",
  "DispatchPlanning",
  "HistoricalImport",
]);

export const SHIPMENT_DISPATCH_MODE = freezeValues([
  "Road",
  "Air",
  "Rail",
  "Courier",
  "HandDelivery",
  "Other",
]);

export const SHIPMENT_PRIORITY = freezeValues([
  "Low",
  "Normal",
  "High",
  "Urgent",
]);

export const SHIPMENT_APPOINTMENT_STATUS = freezeValues([
  "NotRequired",
  "Pending",
  "Requested",
  "Booked",
  "Rescheduled",
  "Completed",
  "Missed",
  "Cancelled",
]);

export const SHIPMENT_DELIVERY_ATTEMPT_OUTCOME = freezeValues([
  "Successful",
  "Partial",
  "Failed",
  "Rescheduled",
  "Rejected",
]);

export const SHIPMENT_RETURN_STATUS = freezeValues([
  "Draft",
  "Approved",
  "InTransit",
  "Received",
  "PartiallyReceived",
  "Cancelled",
  "Closed",
]);

export const SHIPMENT_FREIGHT_STATUS = freezeValues([
  "Draft",
  "Submitted",
  "Approved",
  "Rejected",
  "PartiallyPaid",
  "Paid",
  "Cancelled",
]);

export const SHIPMENT_FREIGHT_CHARGE_TYPE = freezeValues([
  "OutboundFreight",
  "ReturnFreight",
  "Handling",
  "Appointment",
  "Loading",
  "Unloading",
  "Other",
]);

export const SHIPMENT_TRACKING_EVENT_TYPE = freezeValues([
  "ShipmentCreated",
  "ReadyForPacking",
  "PackingStarted",
  "Packed",
  "DocketCreated",
  "AppointmentRequested",
  "AppointmentBooked",
  "AppointmentRescheduled",
  "Dispatched",
  "InTransit",
  "DeliveryAttempted",
  "PartiallyDelivered",
  "Delivered",
  "ReturnInitiated",
  "Returned",
  "Cancelled",
  "Closed",
]);

const sentenceLabel = (value) =>
  String(value ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

const labelsFor = (values) =>
  Object.freeze(
    Object.fromEntries(
      Object.values(values).map((value) => [value, sentenceLabel(value)]),
    ),
  );

export const SHIPMENT_STATUS_LABELS = labelsFor(SHIPMENT_STATUS);
export const SHIPMENT_SOURCE_TYPE_LABELS = labelsFor(SHIPMENT_SOURCE_TYPE);
export const SHIPMENT_DISPATCH_MODE_LABELS = labelsFor(
  SHIPMENT_DISPATCH_MODE,
);
export const SHIPMENT_PRIORITY_LABELS = labelsFor(SHIPMENT_PRIORITY);
export const SHIPMENT_APPOINTMENT_STATUS_LABELS = labelsFor(
  SHIPMENT_APPOINTMENT_STATUS,
);
export const SHIPMENT_DELIVERY_ATTEMPT_OUTCOME_LABELS = labelsFor(
  SHIPMENT_DELIVERY_ATTEMPT_OUTCOME,
);
export const SHIPMENT_RETURN_STATUS_LABELS = labelsFor(
  SHIPMENT_RETURN_STATUS,
);
export const SHIPMENT_FREIGHT_STATUS_LABELS = labelsFor(
  SHIPMENT_FREIGHT_STATUS,
);
export const SHIPMENT_FREIGHT_CHARGE_TYPE_LABELS = labelsFor(
  SHIPMENT_FREIGHT_CHARGE_TYPE,
);
export const SHIPMENT_TRACKING_EVENT_TYPE_LABELS = labelsFor(
  SHIPMENT_TRACKING_EVENT_TYPE,
);

export const SHIPMENT_STATUS_TONES = Object.freeze({
  [SHIPMENT_STATUS.Draft]: "slate",
  [SHIPMENT_STATUS.ReadyForPacking]: "sky",
  [SHIPMENT_STATUS.PackingInProgress]: "sky",
  [SHIPMENT_STATUS.Packed]: "brand",
  [SHIPMENT_STATUS.ReadyForDispatch]: "brand",
  [SHIPMENT_STATUS.Dispatched]: "amber",
  [SHIPMENT_STATUS.AppointmentPending]: "violet",
  [SHIPMENT_STATUS.AppointmentBooked]: "violet",
  [SHIPMENT_STATUS.InTransit]: "amber",
  [SHIPMENT_STATUS.DeliveryAttempted]: "orange",
  [SHIPMENT_STATUS.PartiallyDelivered]: "amber",
  [SHIPMENT_STATUS.Delivered]: "emerald",
  [SHIPMENT_STATUS.ReturnInProgress]: "rose",
  [SHIPMENT_STATUS.Returned]: "rose",
  [SHIPMENT_STATUS.Cancelled]: "red",
  [SHIPMENT_STATUS.Closed]: "emerald",
});

export const SHIPMENT_PRIORITY_TONES = Object.freeze({
  [SHIPMENT_PRIORITY.Low]: "slate",
  [SHIPMENT_PRIORITY.Normal]: "brand",
  [SHIPMENT_PRIORITY.High]: "amber",
  [SHIPMENT_PRIORITY.Urgent]: "red",
});

export const SHIPMENT_SOURCE_TYPE_TONES = Object.freeze({
  [SHIPMENT_SOURCE_TYPE.Manual]: "slate",
  [SHIPMENT_SOURCE_TYPE.DispatchPlanning]: "brand",
  [SHIPMENT_SOURCE_TYPE.HistoricalImport]: "amber",
});

export const SHIPMENT_FREIGHT_STATUS_TONES = Object.freeze({
  [SHIPMENT_FREIGHT_STATUS.Draft]: "slate",
  [SHIPMENT_FREIGHT_STATUS.Submitted]: "sky",
  [SHIPMENT_FREIGHT_STATUS.Approved]: "brand",
  [SHIPMENT_FREIGHT_STATUS.Rejected]: "red",
  [SHIPMENT_FREIGHT_STATUS.PartiallyPaid]: "amber",
  [SHIPMENT_FREIGHT_STATUS.Paid]: "emerald",
  [SHIPMENT_FREIGHT_STATUS.Cancelled]: "red",
});

export const SHIPMENT_RETURN_STATUS_TONES = Object.freeze({
  [SHIPMENT_RETURN_STATUS.Draft]: "slate",
  [SHIPMENT_RETURN_STATUS.Approved]: "brand",
  [SHIPMENT_RETURN_STATUS.InTransit]: "amber",
  [SHIPMENT_RETURN_STATUS.Received]: "emerald",
  [SHIPMENT_RETURN_STATUS.PartiallyReceived]: "amber",
  [SHIPMENT_RETURN_STATUS.Cancelled]: "red",
  [SHIPMENT_RETURN_STATUS.Closed]: "emerald",
});

// CONFIRM: Swagger exposes ShipmentHistoricalImportBatchDto.status as an
// integer but publishes no names or numeric values. Do not use guessed values
// for server filtering until an authenticated live response confirms them.
export const SHIPMENT_IMPORT_BATCH_STATUS = Object.freeze({});
export const SHIPMENT_IMPORT_BATCH_STATUS_LABELS = Object.freeze({});

export const SHIPMENT_MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export const toShipmentOptions = (labels) =>
  Object.entries(labels).map(([value, label]) => ({ label, value }));

