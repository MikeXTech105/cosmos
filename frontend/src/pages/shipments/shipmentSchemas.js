import { z } from "zod";

import {
  SHIPMENT_APPOINTMENT_STATUS,
  SHIPMENT_DELIVERY_ATTEMPT_OUTCOME,
  SHIPMENT_DISPATCH_MODE,
  SHIPMENT_FREIGHT_CHARGE_TYPE,
  SHIPMENT_PRIORITY,
  SHIPMENT_STATUS,
  SHIPMENT_TRACKING_EVENT_TYPE,
} from "../../constants/shipmentEnums";

const emptyToUndefined = (value) =>
  value === "" || value === null || value === undefined ? undefined : value;

const optionalText = z.preprocess(
  (value) => String(value ?? "").trim() || undefined,
  z.string().optional(),
);

const optionalNumber = z.preprocess(
  emptyToUndefined,
  z.coerce.number().optional(),
);

const requiredId = (label) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number({
      error: `${label} is required.`,
    }).positive(`${label} is required.`),
  );

const optionalId = z.preprocess(
  emptyToUndefined,
  z.coerce.number().positive().optional(),
);

const transporterId = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional(),
);

const date = (label) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must use yyyy-MM-dd.`);

const optionalDate = z.preprocess(
  emptyToUndefined,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
);

const nonNegative = (label) =>
  z.coerce.number().min(0, `${label} cannot be negative.`);

const positive = (label) =>
  z.coerce.number().positive(`${label} must be positive.`);

const shipmentItem = z.object({
  itemId: requiredId("Item"),
  notes: optionalText,
  packagingProfileId: optionalId,
  plannedQuantity: positive("Planned quantity"),
});

export const manualShipmentSchema = z.object({
  channelId: requiredId("Channel"),
  dispatchMode: z.enum(Object.values(SHIPMENT_DISPATCH_MODE)),
  expectedDeliveryDate: optionalDate,
  externalShipmentReference: optionalText,
  invoiceId: optionalId,
  invoiceNumber: optionalText,
  items: z.array(shipmentItem).min(1, "Add at least one shipment item."),
  manualReason: optionalText,
  marketplaceReference: optionalText,
  notes: optionalText,
  priority: z.enum(Object.values(SHIPMENT_PRIORITY)),
  shipmentDate: date("Shipment date"),
  stoNumber: optionalText,
  transporterPartyId: transporterId,
  warehouseId: requiredId("Warehouse"),
});

export const dispatchShipmentSchema = z.object({
  allocations: z
    .array(
      z.object({
        dispatchPlanningAllocationId: requiredId("Allocation"),
        plannedQuantity: positive("Planned quantity"),
      }),
    )
    .min(1, "Select at least one allocation."),
  dispatchPlanningRunId: requiredId("Dispatch planning run"),
  expectedDeliveryDate: optionalDate,
  invoiceId: optionalId,
  invoiceNumber: optionalText,
  notes: optionalText,
  shipmentDate: date("Shipment date"),
  stoNumber: optionalText,
  transporterPartyId: transporterId,
  warehouseId: requiredId("Warehouse"),
});

export const shipmentPackageSchema = z.object({
  barcode: optionalText,
  dimensionUnit: optionalText,
  grossWeight: nonNegative("Gross weight"),
  height: nonNegative("Height"),
  isMixedPackage: z.boolean(),
  items: z
    .array(
      z.object({
        quantity: nonNegative("Quantity"),
        shipmentItemId: requiredId("Shipment item"),
      }),
    )
    .refine(
      (items) => items.some((item) => item.quantity > 0),
      "Allocate at least one item quantity.",
    ),
  length: nonNegative("Length"),
  netWeight: nonNegative("Net weight"),
  notes: optionalText,
  packageNumber: optionalText,
  packageType: optionalText,
  packagingProfileId: optionalId,
  sealNumber: optionalText,
  trackingLabel: optionalText,
  volumetricDivisor: optionalNumber,
  weightUnit: optionalText,
  width: nonNegative("Width"),
});

export const shipmentDocketSchema = z.object({
  dispatchMode: z.enum(Object.values(SHIPMENT_DISPATCH_MODE)),
  docketDate: date("Docket date"),
  docketNumber: optionalText,
  driverMobile: optionalText,
  driverName: optionalText,
  estimatedDeliveryDate: optionalDate,
  pickupReference: optionalText,
  trackingUrl: optionalText,
  transporterPartyId: z.string().trim().min(1, "Transporter is required."),
  vehicleNumber: optionalText,
});

export const shipmentAppointmentSchema = z.object({
  appointmentDate: date("Appointment date"),
  appointmentReference: optionalText,
  appointmentStatus: z.enum(Object.values(SHIPMENT_APPOINTMENT_STATUS)),
  cancellationReason: optionalText,
  remarks: optionalText,
  timeFrom: optionalText,
  timeTo: optionalText,
});

export const shipmentTrackingSchema = z.object({
  eventDateTimeUtc: z.string().min(1, "Event time is required."),
  eventStatus: optionalText,
  eventType: z.enum(Object.values(SHIPMENT_TRACKING_EVENT_TYPE)),
  location: optionalText,
  referenceNumber: optionalText,
  remarks: optionalText,
  source: optionalText,
});

export const shipmentDeliveryAttemptSchema = z.object({
  attemptDateTimeUtc: z.string().min(1, "Attempt time is required."),
  nextAttemptDate: optionalDate,
  outcome: z.enum(Object.values(SHIPMENT_DELIVERY_ATTEMPT_OUTCOME)),
  reasonCode: optionalText,
  remarks: optionalText,
});

const receiptItem = z.object({
  damagedQuantity: nonNegative("Damaged quantity"),
  notes: optionalText,
  reasonCode: optionalText,
  receivedQuantity: nonNegative("Received quantity"),
  rejectedQuantity: nonNegative("Rejected quantity"),
  shipmentItemId: requiredId("Shipment item"),
  shortQuantity: nonNegative("Short quantity"),
});

export const shipmentReceiptSchema = z.object({
  items: z.array(receiptItem).min(1),
  marketplaceReceiptReference: optionalText,
  notes: optionalText,
  proofAttachmentUrl: optionalText,
  receiptDate: date("Receipt date"),
  receivedByName: optionalText,
});

export const shipmentReturnSchema = z.object({
  docketNumber: optionalText,
  expectedReturnDate: optionalDate,
  items: z
    .array(
      z.object({
        notes: optionalText,
        reasonCode: optionalText,
        returnQuantity: nonNegative("Return quantity"),
        shipmentItemId: requiredId("Shipment item"),
      }),
    )
    .refine(
      (items) => items.some((item) => item.returnQuantity > 0),
      "Enter a return quantity for at least one item.",
    ),
  notes: optionalText,
  returnDate: date("Return date"),
  returnReason: optionalText,
  transporterPartyId: transporterId,
});

export const shipmentReturnReceiveSchema = z.object({
  items: z.array(
    z.object({
      damagedQuantity: nonNegative("Damaged quantity"),
      nonRestockableQuantity: nonNegative("Non-restockable quantity"),
      notes: optionalText,
      reasonCode: optionalText,
      receivedBackQuantity: nonNegative("Received-back quantity"),
      restockableQuantity: nonNegative("Restockable quantity"),
      shipmentReturnItemId: requiredId("Shipment return item"),
    }),
  ),
  notes: optionalText,
  receivedBackDate: date("Received-back date"),
});

export const shipmentFreightSchema = z.object({
  actualWeight: nonNegative("Actual weight"),
  appointmentCharge: nonNegative("Appointment charge"),
  baseFreight: nonNegative("Base freight"),
  chargeType: z.enum(Object.values(SHIPMENT_FREIGHT_CHARGE_TYPE)),
  chargeableWeight: nonNegative("Chargeable weight"),
  currencyCode: z.string().trim().min(3, "Currency code is required."),
  discountAmount: nonNegative("Discount amount"),
  fuelSurcharge: nonNegative("Fuel surcharge"),
  handlingCharge: nonNegative("Handling charge"),
  loadingCharge: nonNegative("Loading charge"),
  otherCharge: nonNegative("Other charge"),
  ratePerWeightUnit: optionalNumber,
  returnFreight: nonNegative("Return freight"),
  taxAmount: nonNegative("Tax amount"),
  transporterInvoiceDate: optionalDate,
  transporterInvoiceNumber: optionalText,
  transporterPartyId: transporterId,
  unloadingCharge: nonNegative("Unloading charge"),
  volumetricWeight: nonNegative("Volumetric weight"),
});

export const shipmentRojmelSchema = z.object({
  categoryId: optionalId,
  description: optionalText,
  paymentMode: optionalText,
  transactionDate: date("Transaction date"),
  walletId: requiredId("Wallet"),
});

export const shipmentTransitionSchema = z.object({
  remarks: optionalText,
  targetStatus: z.enum(Object.values(SHIPMENT_STATUS)),
});

export const getShipmentSchemaErrors = (result) =>
  result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [
          issue.path.join(".") || "form",
          issue.message,
        ]),
      );
