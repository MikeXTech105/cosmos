import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Plus, ReceiptText, Trash2 } from "lucide-react";
import { useEffect } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { z } from "zod";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import { itemService } from "../../../services/inventory/itemService";
import {
  buildInvoicePayload,
  formatCurrency,
  getDefaultInvoiceLine,
  getInvoiceDefaultValues,
  getInvoiceTotals,
  getLineCalculations,
  normalizeNumberBlurValue,
  normalizeNumberInput,
  PAYMENT_MODE_OPTIONS,
  SALES_PAYMENT_MODE,
} from "./invoiceHelpers";

const invoiceLineSchema = z.object({
  itemId: z.coerce.number().int().positive("Item is required"),
  itemName: z.string().optional(),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  rate: z.coerce.number().min(0, "Rate cannot be negative"),
  discountPercentage: z.coerce
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%"),
  discountAmount: z.coerce
    .number()
    .min(0, "Discount amount cannot be negative"),
  taxRateId: z.union([z.number(), z.string(), z.null()]).optional(),
  taxPercentage: z.coerce.number().min(0, "Tax cannot be negative"),
});

const initialPaymentSchema = z
  .object({
    paymentDate: z.string().optional(),
    amount: z.coerce
      .number()
      .min(0, "Payment amount cannot be negative")
      .optional(),
    paymentMode: z.coerce.number().int().min(0, "Payment mode is required"),
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

const invoiceSchema = z.object({
  customerPartyId: z.string().uuid("Customer is required"),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().optional(),
  discountAmount: z.coerce
    .number()
    .min(0, "Invoice discount cannot be negative"),
  notes: z.string().max(1000, "Notes are too long").optional(),
  termsAndConditions: z
    .string()
    .max(1000, "Terms are too long")
    .optional(),
  initialPayment: initialPaymentSchema.optional(),
  items: z.array(invoiceLineSchema).min(1, "Add at least one line item"),
});

const NumberInput = ({
  className,
  control,
  disabled,
  error,
  id,
  label,
  name,
  placeholder = "0",
}) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <AppInput
          id={id}
          label={label}
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          disabled={disabled}
          value={field.value ?? ""}
          name={field.name}
          error={error}
          className={className}
          onFocus={(event) => {
            if (String(field.value) === "0") {
              event.target.select();
            }
          }}
          onKeyDown={(event) => {
            if (["e", "E", "+", "-"].includes(event.key)) {
              event.preventDefault();
            }
          }}
          onChange={(event) =>
            field.onChange(normalizeNumberInput(event.target.value))
          }
          onBlur={(event) => {
            field.onChange(normalizeNumberBlurValue(event.target.value));
            field.onBlur();
          }}
          ref={field.ref}
        />
      )}
    />
  );
};

const getResponseItem = (response) => {
  return response?.data?.item ?? response?.data ?? null;
};

const InvoiceFormModal = ({
  canCreateCustomer = false,
  canCreateItem = false,
  customerEmptyMessage,
  customerLoading,
  customerOptions,
  invoice,
  isLoading,
  isOpen,
  itemEmptyMessage,
  itemLoading,
  itemOptions,
  itemsById,
  mode,
  onClose,
  onCreateCustomer,
  onCreateItem,
  onSubmit,
}) => {
  const isEdit = mode === "edit";
  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: getInvoiceDefaultValues(invoice),
  });
  const { append, fields, remove } = useFieldArray({
    control,
    name: "items",
  });
  const watchedItems = useWatch({ control, name: "items" }) ?? [];
  const invoiceDiscountAmount =
    useWatch({ control, name: "discountAmount" }) ?? "0";
  const totals = getInvoiceTotals(watchedItems, invoiceDiscountAmount);

  useEffect(() => {
    if (isOpen) {
      reset(getInvoiceDefaultValues(invoice));
    }
  }, [invoice, isOpen, reset]);

  const applyItemDetails = async (index, itemId) => {
    const lookupItem = itemsById.get(String(itemId));
    const applyItem = (item) => {
      if (!item) {
        return;
      }

      setValue(`items.${index}.itemName`, item.name ?? "", {
        shouldDirty: true,
      });
      setValue(`items.${index}.rate`, String(item.salesPrice ?? 0), {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue(`items.${index}.taxPercentage`, String(item.gstRate ?? 0), {
        shouldDirty: true,
        shouldValidate: true,
      });
    };

    applyItem(lookupItem);

    try {
      const response = await itemService.getItemById(itemId);
      applyItem(getResponseItem(response));
    } catch {
      applyItem(lookupItem);
    }
  };

  const submitForm = async (values) => {
    await onSubmit(buildInvoicePayload(values));
  };

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-7xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <ReceiptText className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Edit Sale Invoice" : "New Sale Invoice"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Create a draft invoice with live line totals and backend-ready tax
            fields.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : (
        <form
          className="mt-5 flex max-h-[calc(100vh-13rem)] min-h-0 flex-col"
          onSubmit={handleSubmit(submitForm)}
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-1 pb-5">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Invoice Header
              </h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Controller
                  control={control}
                  name="customerPartyId"
                  render={({ field }) => (
                    <AppSelect
                      label="Customer"
                      required
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      options={customerOptions}
                      emptyMessage={customerEmptyMessage}
                      placeholder={
                        customerLoading
                          ? "Loading customers..."
                          : "Select customer"
                      }
                      disabled={customerLoading}
                      error={errors.customerPartyId?.message}
                      creatable={canCreateCustomer}
                      createLabel="Create new customer"
                      onCreateClick={onCreateCustomer}
                    />
                  )}
                />

                <AppInput
                  id="invoiceNumber"
                  label="Invoice Number"
                  placeholder="Assigned by backend"
                  disabled
                  {...register("invoiceNumber")}
                />

                <AppInput
                  id="invoiceDate"
                  label="Invoice Date"
                  type="date"
                  required
                  error={errors.invoiceDate?.message}
                  {...register("invoiceDate")}
                />

                <AppInput
                  id="dueDate"
                  label="Due Date"
                  type="date"
                  error={errors.dueDate?.message}
                  {...register("dueDate")}
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Line Items
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Rate and GST auto-fill from item details when the backend
                    provides them.
                  </p>
                </div>
                <AppButton
                  variant="secondary"
                  className="h-9 rounded-lg px-3"
                  onClick={() => append(getDefaultInvoiceLine())}
                >
                  <Plus className="h-4 w-4" />
                  Add Row
                </AppButton>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] table-fixed text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-white">
                      <th className="w-[27%] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Item
                      </th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Rate
                      </th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Disc %
                      </th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Disc Amt
                      </th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        GST %
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Line Total
                      </th>
                      <th className="w-12 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      const line = watchedItems[index] ?? field;
                      const lineTotal = getLineCalculations(line).lineTotal;

                      return (
                        <tr key={field.id} className="border-b border-slate-100">
                          <td className="px-3 py-3 align-top">
                            <Controller
                              control={control}
                              name={`items.${index}.itemId`}
                              render={({ field: itemField }) => (
                                <AppSelect
                                  value={itemField.value}
                                  onChange={(value) => {
                                    itemField.onChange(Number(value));
                                    void applyItemDetails(index, value);
                                  }}
                                  onBlur={itemField.onBlur}
                                  options={itemOptions}
                                  emptyMessage={itemEmptyMessage}
                                  placeholder={
                                    itemLoading
                                      ? "Loading items..."
                                      : "Select item"
                                  }
                                  disabled={itemLoading}
                                  error={errors.items?.[index]?.itemId?.message}
                                  creatable={canCreateItem}
                                  createLabel="Create new item"
                                  onCreateClick={onCreateItem}
                                />
                              )}
                            />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <NumberInput
                              control={control}
                              id={`quantity-${index}`}
                              name={`items.${index}.quantity`}
                              error={errors.items?.[index]?.quantity?.message}
                            />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <NumberInput
                              control={control}
                              id={`rate-${index}`}
                              name={`items.${index}.rate`}
                              error={errors.items?.[index]?.rate?.message}
                            />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <NumberInput
                              control={control}
                              id={`discount-percentage-${index}`}
                              name={`items.${index}.discountPercentage`}
                              error={
                                errors.items?.[index]?.discountPercentage
                                  ?.message
                              }
                            />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <NumberInput
                              control={control}
                              id={`discount-amount-${index}`}
                              name={`items.${index}.discountAmount`}
                              error={
                                errors.items?.[index]?.discountAmount?.message
                              }
                            />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <NumberInput
                              control={control}
                              id={`tax-${index}`}
                              name={`items.${index}.taxPercentage`}
                              error={
                                errors.items?.[index]?.taxPercentage?.message
                              }
                            />
                          </td>
                          <td className="px-3 py-3 text-right align-middle text-sm font-semibold text-slate-900">
                            {formatCurrency(lineTotal)}
                          </td>
                          <td className="px-2 py-3 text-right align-middle">
                            <button
                              type="button"
                              aria-label="Remove line item"
                              disabled={fields.length === 1}
                              onClick={() => remove(index)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {errors.items?.message && (
                <p className="px-4 py-3 text-xs font-medium text-red-600">
                  {errors.items.message}
                </p>
              )}
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="invoiceNotes"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    Notes
                  </label>
                  <textarea
                    id="invoiceNotes"
                    rows={4}
                    className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                    {...register("notes")}
                  />
                  {errors.notes?.message && (
                    <p className="mt-1.5 text-xs font-medium text-red-600">
                      {errors.notes.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="termsAndConditions"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    Terms & Conditions
                  </label>
                  <textarea
                    id="termsAndConditions"
                    rows={4}
                    className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                    {...register("termsAndConditions")}
                  />
                  {errors.termsAndConditions?.message && (
                    <p className="mt-1.5 text-xs font-medium text-red-600">
                      {errors.termsAndConditions.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Totals
                </h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Subtotal</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatCurrency(totals.subTotal)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Line Discount</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatCurrency(totals.lineDiscount)}
                    </dd>
                  </div>
                  <NumberInput
                    control={control}
                    id="invoiceDiscountAmount"
                    name="discountAmount"
                    label="Invoice Discount"
                    error={errors.discountAmount?.message}
                  />
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Tax</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatCurrency(totals.taxAmount)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <dt className="text-base font-semibold text-slate-900">
                      Grand Total
                    </dt>
                    <dd className="text-xl font-bold text-brand">
                      {formatCurrency(totals.grandTotal)}
                    </dd>
                  </div>
                </dl>

                {!isEdit && (
                  <div className="mt-5 border-t border-slate-200 pt-4">
                    <h4 className="text-sm font-semibold text-slate-900">
                      Initial Payment
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Leave amount blank to save without a receipt.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <NumberInput
                        control={control}
                        id="initialPaymentAmount"
                        name="initialPayment.amount"
                        label="Amount"
                        error={errors.initialPayment?.amount?.message}
                      />
                      <AppInput
                        id="initialPaymentDate"
                        label="Payment Date"
                        type="date"
                        error={errors.initialPayment?.paymentDate?.message}
                        {...register("initialPayment.paymentDate")}
                      />
                      <Controller
                        control={control}
                        name="initialPayment.paymentMode"
                        defaultValue={SALES_PAYMENT_MODE.CASH}
                        render={({ field }) => (
                          <AppSelect
                            label="Mode"
                            value={field.value}
                            onChange={(value) => field.onChange(Number(value))}
                            onBlur={field.onBlur}
                            options={PAYMENT_MODE_OPTIONS}
                            error={errors.initialPayment?.paymentMode?.message}
                          />
                        )}
                      />
                      <AppInput
                        id="initialPaymentReference"
                        label="Reference"
                        error={errors.initialPayment?.referenceNumber?.message}
                        {...register("initialPayment.referenceNumber")}
                      />
                    </div>
                    <div className="mt-3">
                      <label
                        htmlFor="initialPaymentNotes"
                        className="mb-1.5 block text-xs font-semibold text-slate-700"
                      >
                        Payment Notes
                      </label>
                      <textarea
                        id="initialPaymentNotes"
                        rows={2}
                        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                        {...register("initialPayment.notes")}
                      />
                      {errors.initialPayment?.notes?.message && (
                        <p className="mt-1.5 text-xs font-medium text-red-600">
                          {errors.initialPayment.notes.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white pt-4 sm:flex-row sm:justify-end">
            <AppButton
              variant="secondary"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </AppButton>
            <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…">
              <Check className="h-4 w-4" />
              {isEdit ? "Save Changes" : "Save Draft"}
            </AppButton>
          </div>
        </form>
      )}
    </AppModal>
  );
};

export default InvoiceFormModal;
