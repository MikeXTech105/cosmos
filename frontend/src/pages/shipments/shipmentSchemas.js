import { z } from "zod";
import { requiredDate, optionalDate as calendarDate, dateOrder } from "../../utils/validationRules";
import { compareDecimal, decimalText, decimalWire, idWire } from "../../utils/productionValues";

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

const exactId = label => z.any().transform((value, context) => {
  try { idWire(value); return String(value).trim(); }
  catch { context.addIssue({ code: "custom", message: `${label} must be a valid selected record.` }); return z.NEVER; }
});
const requiredId = label => exactId(label);
const optionalId = z.preprocess(emptyToUndefined, exactId("Selection").optional());
const exactQuantity = label => z.any().transform((value, context) => {
  try { const source = value == null || value === "" ? "0" : value; decimalWire(source, { integerDigits: 13, scale: 6 }); return decimalText(source); }
  catch { context.addIssue({ code: "custom", message: `${label} needs a nonnegative quantity with at most six decimal places.` }); return z.NEVER; }
});
const positiveQuantity = label => exactQuantity(label).refine(value => compareDecimal(value, "0") > 0, `${label} must be positive.`);

const transporterId = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional(),
);

const date = requiredDate;
const optionalDate = z.preprocess(emptyToUndefined, calendarDate);

const nonNegative = (label) =>
  z.coerce.number().min(0, `${label} cannot be negative.`);

const shipmentItem = z.object({
  itemId: requiredId("Item"),
  notes: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(1000).optional()),
  packagingProfileId: optionalId,
  plannedQuantity: positiveQuantity("Planned quantity"),
});

export const manualShipmentSchema = z.object({
  channelId: requiredId("Channel"),
  dispatchMode: z.enum(Object.values(SHIPMENT_DISPATCH_MODE)),
  expectedDeliveryDate: optionalDate,
  externalShipmentReference: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(150).optional()),
  invoiceId: optionalId,
  invoiceNumber: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(100).optional()),
  items: z.array(shipmentItem).min(1, "Add at least one shipment item."),
  manualReason: z.string().trim().min(1, "Manual reason is required.").max(1000),
  marketplaceReference: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(150).optional()),
  notes: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(2000).optional()),
  priority: z.enum(Object.values(SHIPMENT_PRIORITY)),
  shipmentDate: date("Shipment date"),
  stoNumber: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(100).optional()),
  transporterPartyId: transporterId,
  warehouseId: requiredId("Warehouse"),
}).superRefine((values, context) => dateOrder(values, context, "shipmentDate", "expectedDeliveryDate", "Expected delivery cannot be before shipment date"));

export const dispatchShipmentSchema = z.object({
  allocations: z
    .array(
      z.object({
        dispatchPlanningAllocationId: requiredId("Allocation"),
        plannedQuantity: positiveQuantity("Planned quantity"),
      }),
    )
    .min(1, "Select at least one allocation."),
  dispatchPlanningRunId: requiredId("Dispatch planning run"),
  expectedDeliveryDate: optionalDate,
  invoiceId: optionalId,
  invoiceNumber: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(100).optional()),
  notes: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(2000).optional()),
  shipmentDate: date("Shipment date"),
  stoNumber: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(100).optional()),
  transporterPartyId: transporterId,
  warehouseId: requiredId("Warehouse"),
}).superRefine((values, context) => dateOrder(values, context, "shipmentDate", "expectedDeliveryDate", "Expected delivery cannot be before shipment date"));

export const shipmentPackageSchema = z.object({
  barcode: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(200).optional()),
  dimensionUnit: z.preprocess(value => String(value ?? "").toUpperCase(), z.enum(["CM", "MM"])),
  grossWeight: nonNegative("Gross weight"),
  height: nonNegative("Height"),
  isMixedPackage: z.boolean(),
  items: z
    .array(
      z.object({
        quantity: exactQuantity("Quantity"),
        shipmentItemId: requiredId("Shipment item"),
      }),
    )
    .refine(
      (items) => items.some((item) => item.quantity > 0),
      "Allocate at least one item quantity.",
    ),
  length: nonNegative("Length"),
  netWeight: nonNegative("Net weight"),
  notes: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(1000).optional()),
  packageNumber: z.string().trim().min(1, "Package number is required.").max(100),
  packageType: z.string().trim().min(1, "Package type is required.").max(50),
  packagingProfileId: optionalId,
  sealNumber: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(100).optional()),
  trackingLabel: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(200).optional()),
  volumetricDivisor: z.preprocess(emptyToUndefined, z.coerce.number().positive("Volumetric divisor must be positive").optional()),
  weightUnit: z.preprocess(value => String(value ?? "").toUpperCase(), z.enum(["KG", "G"])),
  width: nonNegative("Width"),
}).superRefine((values, context) => {
   if (values.netWeight > values.grossWeight) context.addIssue({code:"custom",path:["netWeight"],message:"Net weight cannot exceed gross weight"});
   const populated = values.items.filter(item => item.quantity > 0);
   if (!values.isMixedPackage && populated.length > 1) context.addIssue({code:"custom",path:["isMixedPackage"],message:"Multiple items require a mixed package"});
   if (new Set(populated.map(item => item.shipmentItemId)).size !== populated.length) context.addIssue({code:"custom",path:["items"],message:"An item can appear only once in a package"});
 });

export const shipmentDocketSchema = z.object({
  dispatchMode: z.enum(Object.values(SHIPMENT_DISPATCH_MODE)),
  docketDate: date("Docket date"),
  docketNumber: z.string().trim().min(1, "Docket number is required.").max(100),
  driverMobile: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(30).optional()),
  driverName: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(150).optional()),
  estimatedDeliveryDate: optionalDate,
  pickupReference: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(100).optional()),
  trackingUrl: z.preprocess(value => String(value ?? "").trim() || undefined, z.url("Enter an absolute tracking URL").max(1000).optional()),
  transporterPartyId: z.string().trim().min(1, "Transporter is required."),
  vehicleNumber: optionalText,
});

export const shipmentAppointmentSchema = z.object({
  appointmentDate: date("Appointment date"),
  appointmentReference: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(100).optional()),
  appointmentStatus: z.enum(Object.values(SHIPMENT_APPOINTMENT_STATUS)),
  cancellationReason: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(1000).optional()),
  remarks: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(1000).optional()),
  timeFrom: optionalText,
  timeTo: optionalText,
}).superRefine((values, context) => {
   dateOrder(values, context, "timeFrom", "timeTo", "End time cannot be before start time");
   if (values.appointmentStatus === "Cancelled" && !values.cancellationReason) context.addIssue({code:"custom",path:["cancellationReason"],message:"Cancellation reason is required"});
 });

export const shipmentTrackingSchema = z.object({
  eventDateTimeUtc: z.string().min(1, "Event time is required."),
  eventStatus: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(100).optional()),
  eventType: z.enum(Object.values(SHIPMENT_TRACKING_EVENT_TYPE)),
  location: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(250).optional()),
  referenceNumber: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(100).optional()),
  remarks: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(1000).optional()),
  source: z.string().trim().min(1, "Source is required.").max(50),
});

export const shipmentDeliveryAttemptSchema = z.object({
  attemptDateTimeUtc: z.string().min(1, "Attempt time is required."),
  nextAttemptDate: optionalDate,
  outcome: z.enum(Object.values(SHIPMENT_DELIVERY_ATTEMPT_OUTCOME)),
  reasonCode: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(100).optional()),
  remarks: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(1000).optional()),
});

const receiptItem = z.object({
  damagedQuantity: exactQuantity("Damaged quantity"),
  notes: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(1000).optional()),
  reasonCode: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(100).optional()),
  receivedQuantity: exactQuantity("Received quantity"),
  rejectedQuantity: exactQuantity("Rejected quantity"),
  shipmentItemId: requiredId("Shipment item"),
  shortQuantity: exactQuantity("Short quantity"),
});

export const shipmentReceiptSchema = z.object({
  items: z.array(receiptItem).min(1),
  marketplaceReceiptReference: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(150).optional()),
  notes: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(1000).optional()),
  proofAttachmentUrl: optionalText,
  receiptDate: date("Receipt date"),
  receivedByName: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(150).optional()),
});

export const shipmentReturnSchema = z.object({
  docketNumber: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(100).optional()),
  expectedReturnDate: optionalDate,
  items: z
    .array(
      z.object({
        notes: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(1000).optional()),
        reasonCode: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(100).optional()),
        returnQuantity: exactQuantity("Return quantity"),
        shipmentItemId: requiredId("Shipment item"),
      }),
    )
    .refine(
      (items) => items.some((item) => item.returnQuantity > 0),
      "Enter a return quantity for at least one item.",
    ),
  notes: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(1000).optional()),
  returnDate: date("Return date"),
  returnReason: z.string().trim().min(1, "Return reason is required.").max(1000),
  transporterPartyId: transporterId,
});

export const shipmentReturnReceiveSchema = z.object({
  items: z.array(
    z.object({
      damagedQuantity: exactQuantity("Damaged quantity"),
      nonRestockableQuantity: exactQuantity("Non-restockable quantity"),
      notes: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(1000).optional()),
      reasonCode: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(100).optional()),
      receivedBackQuantity: exactQuantity("Received-back quantity"),
      restockableQuantity: exactQuantity("Restockable quantity"),
      shipmentReturnItemId: requiredId("Shipment return item"),
    }),
  ),
  notes: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(1000).optional()),
  receivedBackDate: date("Received-back date"),
});

export const shipmentFreightSchema = z.object({
  actualWeight: nonNegative("Actual weight"),
  appointmentCharge: nonNegative("Appointment charge"),
  baseFreight: nonNegative("Base freight"),
  chargeType: z.enum(Object.values(SHIPMENT_FREIGHT_CHARGE_TYPE)),
  chargeableWeight: nonNegative("Chargeable weight"),
  currencyCode: z.string().trim().regex(/^[A-Z]{3}$/, "Enter a three-letter uppercase currency code"),
  discountAmount: nonNegative("Discount amount"),
  fuelSurcharge: nonNegative("Fuel surcharge"),
  handlingCharge: nonNegative("Handling charge"),
  loadingCharge: nonNegative("Loading charge"),
  otherCharge: nonNegative("Other charge"),
  ratePerWeightUnit: z.preprocess(emptyToUndefined, z.coerce.number().min(0, "Rate cannot be negative").optional()),
  returnFreight: nonNegative("Return freight"),
  taxAmount: nonNegative("Tax amount"),
  transporterInvoiceDate: optionalDate,
  transporterInvoiceNumber: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(100).optional()),
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
  remarks: z.preprocess(value => String(value ?? "").trim() || undefined, z.string().max(1000).optional()),
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
