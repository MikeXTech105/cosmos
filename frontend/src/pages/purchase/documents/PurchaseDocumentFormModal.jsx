import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { enumNumber, requiredDate, optionalDate, dateOrder } from "../../../utils/validationRules";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import PurchaseLineItems, {
  PurchaseNumberInput,
} from "../PurchaseLineItems";
import {
  addDaysToInputDate,
  buildPurchaseDocumentPayload,
  extractItems,
  formatCurrency,
  getDefaultLine,
  getDocumentTotals,
  getTodayInputValue,
  PAYMENT_TYPE,
  PAYMENT_TYPE_OPTIONS,
  toInputDate,
} from "../purchaseHelpers";

const lineSchema = z.object({
  itemId: z.coerce.number().int().positive("Item is required"),
  itemName: z.string().optional(),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  purchasePrice: z.coerce.number().min(0, "Price cannot be negative"),
  discountPercentage: z.coerce.number().min(0).max(100),
  discountAmount: z.coerce.number().min(0),
  taxPercentage: z.coerce.number().min(0),
  unitId: z.union([z.number(), z.string(), z.null()]).optional(),
  purchaseBillItemId: z.union([z.number(), z.string(), z.null()]).optional(),
});

const documentSchema = (dateField) => z.object({
  supplierId: z.string().uuid("Supplier is required"),
  supplierInvoiceNo: z.string().optional(),
  purchaseBillId: z.union([z.number(), z.string(), z.null()]).optional(),
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
  items: z.array(lineSchema).min(1, "Add at least one line item"),
}).superRefine((values, context) => {
  if (dateField === "billDate") dateOrder(values, context, "billDate", "dueDate", "Due date cannot be before bill date");
  if (dateField === "orderDate") dateOrder(values, context, "orderDate", "expectedDeliveryDate", "Expected delivery cannot be before order date");
});

const getDefaultValues = (record, config) => {
  const today = getTodayInputValue();

  return {
    supplierId: record?.supplierId ?? "",
    supplierInvoiceNo: record?.supplierInvoiceNo ?? "",
    purchaseBillId: record?.purchaseBillId ?? "",
    billDate: toInputDate(record?.billDate) || today,
    dueDate: toInputDate(record?.dueDate) || addDaysToInputDate(today, 15),
    orderDate: toInputDate(record?.orderDate) || today,
    expectedDeliveryDate:
      toInputDate(record?.expectedDeliveryDate) || addDaysToInputDate(today, 7),
    returnDate: toInputDate(record?.returnDate) || today,
    paymentType: record?.paymentType ?? PAYMENT_TYPE.CASH,
    discountAmount: String(record?.discountAmount ?? 0),
    roundOff: String(record?.roundOff ?? 0),
    paidAmount: String(record?.paidAmount ?? 0),
    reason: record?.reason ?? "",
    termsAndConditions:
      record?.termsAndConditions ?? "Purchase terms as agreed with supplier.",
    notes: record?.notes ?? "",
    items: record ? extractItems(record) : [getDefaultLine()],
    activeDate: toInputDate(record?.[config.dateField]) || today,
  };
};

const PurchaseDocumentFormModal = ({
  billOptions,
  canCreateItem = false,
  canCreateSupplier = false,
  config,
  isLoading,
  isOpen,
  itemEmptyMessage,
  itemLoading,
  itemOptions,
  itemsById,
  mode,
  onClose,
  onCreateItem,
  onCreateSupplier,
  onSubmit,
  record,
  supplierOptions,
}) => {
  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(documentSchema(config.dateField)),
    defaultValues: getDefaultValues(record, config),
  });
  const watchedItems = useWatch({ control, name: "items" }) ?? [];
  const discountAmount = useWatch({ control, name: "discountAmount" }) ?? "0";
  const roundOff = useWatch({ control, name: "roundOff" }) ?? "0";
  const paidAmount = useWatch({ control, name: "paidAmount" }) ?? "0";
  const totals = getDocumentTotals({
    discountAmount,
    items: watchedItems,
    paidAmount,
    roundOff,
  });

  useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues(record, config));
    }
  }, [config, isOpen, record, reset]);

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-7xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <h2 className="text-lg font-semibold text-slate-900">
        {mode === "edit" ? `Edit ${config.singularLabel}` : `New ${config.singularLabel}`}
      </h2>

      {isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
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
          onSubmit={handleSubmit((values) => onSubmit(buildPurchaseDocumentPayload(values, config)))}
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-1 pb-5">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Document Header
              </h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Controller
                  control={control}
                  name="supplierId"
                  render={({ field }) => (
                    <AppSelect
                      label="Supplier"
                      required
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      options={supplierOptions}
                      placeholder="Select supplier"
                      error={errors.supplierId?.message}
                      creatable={canCreateSupplier}
                      createLabel="Create new supplier"
                      onCreateClick={onCreateSupplier}
                    />
                  )}
                />

                {config.supportsBillSelect && (
                  <Controller
                    control={control}
                    name="purchaseBillId"
                    render={({ field }) => (
                      <AppSelect
                        label="Purchase Bill"
                        value={field.value}
                        onChange={(value) => field.onChange(Number(value))}
                        onBlur={field.onBlur}
                        options={billOptions}
                        placeholder="Select linked bill"
                        error={errors.purchaseBillId?.message}
                      />
                    )}
                  />
                )}

                {config.supplierReferenceField && (
                  <AppInput
                    id="supplierInvoiceNo"
                    label={config.supplierReferenceLabel}
                    error={errors.supplierInvoiceNo?.message}
                    {...register("supplierInvoiceNo")}
                  />
                )}

                <AppInput
                  id={config.dateField}
                  label={
                    config.dateField === "billDate"
                      ? "Bill Date"
                      : config.dateField === "orderDate"
                        ? "Order Date"
                        : "Return Date"
                  }
                  type="date"
                  required
                  error={errors[config.dateField]?.message}
                  {...register(config.dateField)}
                />

                {config.dueDateField && (
                  <AppInput
                    id={config.dueDateField}
                    label={config.secondaryDateLabel}
                    type="date"
                    error={errors[config.dueDateField]?.message}
                    {...register(config.dueDateField)}
                  />
                )}

                {config.supportsPaymentType && (
                  <Controller
                    control={control}
                    name="paymentType"
                    render={({ field }) => (
                      <AppSelect
                        label="Payment Type"
                        value={field.value}
                        onChange={(value) => field.onChange(Number(value))}
                        onBlur={field.onBlur}
                        options={PAYMENT_TYPE_OPTIONS}
                        error={errors.paymentType?.message}
                      />
                    )}
                  />
                )}

                {config.supportsReason && (
                  <AppInput
                    id="returnReason"
                    label="Reason"
                    error={errors.reason?.message}
                    {...register("reason")}
                  />
                )}
              </div>
            </section>

            <PurchaseLineItems
              control={control}
              errors={errors.items}
              itemEmptyMessage={itemEmptyMessage}
              itemLoading={itemLoading}
              itemOptions={itemOptions}
              itemsById={itemsById}
              canCreateItem={canCreateItem}
              onCreateItem={onCreateItem}
              setValue={setValue}
            />

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                {config.supportsTerms && (
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
                  </div>
                )}
                <div>
                  <label
                    htmlFor="purchaseNotes"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    Notes
                  </label>
                  <textarea
                    id="purchaseNotes"
                    rows={4}
                    className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                    {...register("notes")}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Totals</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Subtotal</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatCurrency(totals.subTotal)}
                    </dd>
                  </div>
                  {config.supportsDiscount && (
                    <PurchaseNumberInput
                      control={control}
                      id="purchaseDiscount"
                      name="discountAmount"
                      label="Document Discount"
                      error={errors.discountAmount?.message}
                    />
                  )}
                  {config.supportsRoundOff && (
                    <PurchaseNumberInput
                      allowNegative
                      control={control}
                      id="purchaseRoundOff"
                      name="roundOff"
                      label="Round Off"
                      error={errors.roundOff?.message}
                    />
                  )}
                  {config.supportsPaidAmount && (
                    <PurchaseNumberInput
                      control={control}
                      id="purchasePaidAmount"
                      name="paidAmount"
                      label="Paid Amount"
                      error={errors.paidAmount?.message}
                    />
                  )}
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
                  {config.supportsPaidAmount && (
                    <div className="flex items-center justify-between">
                      <dt className="font-semibold text-slate-900">Balance</dt>
                      <dd className="font-bold text-red-600">
                        {formatCurrency(totals.balanceAmount)}
                      </dd>
                    </div>
                  )}
                </dl>
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
              Save
            </AppButton>
          </div>
        </form>
      )}
    </AppModal>
  );
};

export default PurchaseDocumentFormModal;
