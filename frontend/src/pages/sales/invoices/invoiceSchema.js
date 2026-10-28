import { z } from "zod";
import { enumNumber, requiredDate, optionalDate, dateOrder } from "../../../utils/validationRules";
import { documentIdSchema, documentQuantitySchema, optionalDocumentIdSchema } from "../../../utils/documentFieldSchemas";
import { discountFitsDocumentLine } from "../../../utils/documentPrecision";
import { SALES_PAYMENT_MODE } from "./invoiceHelpers";

export const invoiceLineSchema = z.object({
  itemId: documentIdSchema("Item"),
  itemName: z.string().optional(),
  quantity: documentQuantitySchema,
  rate: z.coerce.number().min(0, "Rate cannot be negative"),
  discountPercentage: z.coerce
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%"),
  discountAmount: z.coerce
    .number()
    .min(0, "Discount amount cannot be negative"),
  taxRateId: optionalDocumentIdSchema,
  taxPercentage: z.coerce.number().min(0, "Tax cannot be negative"),
  hsnSacCode: z.string().optional(),
  hsnSource: z.string().optional(),
}).refine(line => discountFitsDocumentLine(line.discountAmount, line.quantity, line.rate), { path: ["discountAmount"], message: "Discount cannot exceed line amount" });

const initialPaymentSchema = z
  .object({
    paymentDate: z.string().optional(),
    amount: z.coerce
      .number()
      .min(0, "Payment amount cannot be negative")
      .optional(),
    paymentMode: enumNumber(SALES_PAYMENT_MODE, "Payment mode"),
    referenceNumber: z.string().max(100, "Reference is too long").optional(),
    notes: z.string().max(500, "Payment notes are too long").optional(),
  })
  .superRefine((payment, context) => {
    if (Number(payment.amount) > 0 && !payment.paymentDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Payment date is required",
        path: ["paymentDate"],
      });
    }
  });

export const invoiceSchema = z.object({
  // Party identifiers are backend-owned and may be GUIDs or numeric/string ids.
  customerPartyId: z.coerce.string().trim().min(1, "Customer is required"),
  companyGstRegistrationId: optionalDocumentIdSchema,
  placeOfSupplyStateCode: z.string().trim().regex(/^$|^[0-9]{2}$/, "Use a two-digit GST state code"),
  placeOfSupplySource: z.string().trim().max(50, "Source is too long"),
  priceBasis: z.union([z.literal(""), z.coerce.number().int().min(0).max(1)]).optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: requiredDate("Invoice date"),
  dueDate: optionalDate,
  discountAmount: z.coerce
    .number()
    .min(0, "Invoice discount cannot be negative"),
  notes: z.string().max(1000, "Notes are too long").optional(),
  termsAndConditions: z.string().max(2000, "Terms are too long").optional(),
  initialPayment: initialPaymentSchema.optional(),
  items: z.array(invoiceLineSchema).min(1, "Add at least one line item"),
}).superRefine((values, context) => {
  dateOrder(values, context, "invoiceDate", "dueDate", "Due date cannot be before invoice date");
  if (values.placeOfSupplyStateCode && !values.placeOfSupplySource) context.addIssue({ code: z.ZodIssueCode.custom, path: ["placeOfSupplySource"], message: "Explain the reviewed place-of-supply selection." });
});

