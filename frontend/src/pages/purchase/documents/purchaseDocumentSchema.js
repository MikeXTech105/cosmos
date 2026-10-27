import { z } from "zod";
import { enumNumber, requiredDate, optionalDate, dateOrder } from "../../../utils/validationRules";
import { documentIdSchema, documentQuantitySchema, optionalDocumentIdSchema } from "../../../utils/documentFieldSchemas";
import { PAYMENT_TYPE } from "../purchaseHelpers";

export const purchaseLineSchema = z.object({
  itemId: documentIdSchema("Item"),
  itemName: z.string().optional(),
  quantity: documentQuantitySchema,
  purchasePrice: z.coerce.number().min(0, "Price cannot be negative"),
  discountPercentage: z.coerce.number().min(0).max(100),
  discountAmount: z.coerce.number().min(0),
  taxPercentage: z.coerce.number().min(0),
  unitId: optionalDocumentIdSchema,
  purchaseBillItemId: optionalDocumentIdSchema,
});

export const purchaseDocumentSchema = (dateField) => z.object({
  supplierId: z.string().uuid("Supplier is required"),
  supplierInvoiceNo: z.string().optional(),
  purchaseBillId: optionalDocumentIdSchema,
  billDate: dateField === "billDate" ? requiredDate("Document date") : optionalDate,
  dueDate: optionalDate,
  orderDate: dateField === "orderDate" ? requiredDate("Document date") : optionalDate,
  expectedDeliveryDate: optionalDate,
  returnDate: dateField === "returnDate" ? requiredDate("Document date") : optionalDate,
  paymentType: dateField === "billDate" ? enumNumber(PAYMENT_TYPE, "Payment type") : z.coerce.number().optional(),
  discountAmount: z.coerce.number().min(0),
  roundOff: z.coerce.number(),
  paidAmount: z.coerce.number().min(0),
  reason: z.string().optional(),
  termsAndConditions: z.string().optional(),
  notes: z.string().max(1000, "Notes are too long").optional(),
  items: z.array(purchaseLineSchema).min(1, "Add at least one line item"),
}).superRefine((values, context) => {
  if (dateField === "billDate") dateOrder(values, context, "billDate", "dueDate", "Due date cannot be before bill date");
  if (dateField === "orderDate") dateOrder(values, context, "orderDate", "expectedDeliveryDate", "Expected delivery cannot be before order date");
});

