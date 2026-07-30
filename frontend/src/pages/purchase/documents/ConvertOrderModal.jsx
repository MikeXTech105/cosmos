import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import { PurchaseNumberInput } from "../PurchaseLineItems";
import {
  addDaysToInputDate,
  getTodayInputValue,
  PAYMENT_TYPE,
  PAYMENT_TYPE_OPTIONS,
} from "../purchaseHelpers";

const convertSchema = z.object({
  billDate: z.string().min(1, "Bill date is required"),
  dueDate: z.string().optional(),
  paymentType: z.coerce.number().int().min(0),
  paidAmount: z.coerce.number().min(0, "Paid amount cannot be negative"),
  supplierInvoiceNo: z.string().optional(),
});

const ConvertOrderModal = ({ isOpen, onClose, onSubmit, order }) => {
  const today = getTodayInputValue();
  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(convertSchema),
    defaultValues: {
      billDate: today,
      dueDate: addDaysToInputDate(today, 15),
      paymentType: PAYMENT_TYPE.CREDIT,
      paidAmount: "0",
      supplierInvoiceNo: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        billDate: today,
        dueDate: addDaysToInputDate(today, 15),
        paymentType: PAYMENT_TYPE.CREDIT,
        paidAmount: "0",
        supplierInvoiceNo: "",
      });
    }
  }, [isOpen, reset, today]);

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-lg"
      onClose={isSubmitting ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <ArrowRight className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Convert Order to Bill
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {order?.orderNo ?? order?.orderNumber ?? "This order"} will become
            a purchase bill.
          </p>
        </div>
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={handleSubmit((values) =>
          onSubmit({
            billDate: values.billDate,
            dueDate: values.dueDate || null,
            paymentType: Number(values.paymentType),
            paidAmount: Number(values.paidAmount),
            supplierInvoiceNo:
              String(values.supplierInvoiceNo ?? "").trim() || null,
          }),
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <AppInput
            id="convertBillDate"
            label="Bill Date"
            type="date"
            required
            error={errors.billDate?.message}
            {...register("billDate")}
          />
          <AppInput
            id="convertDueDate"
            label="Due Date"
            type="date"
            error={errors.dueDate?.message}
            {...register("dueDate")}
          />
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
          <PurchaseNumberInput
            control={control}
            id="convertPaidAmount"
            name="paidAmount"
            label="Paid Amount"
            error={errors.paidAmount?.message}
          />
          <div className="sm:col-span-2">
            <AppInput
              id="convertSupplierInvoiceNo"
              label="Supplier Invoice #"
              error={errors.supplierInvoiceNo?.message}
              {...register("supplierInvoiceNo")}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <AppButton
            variant="secondary"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </AppButton>
          <AppButton type="submit" isLoading={isSubmitting} loadingText="Converting…">
            Convert
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

export default ConvertOrderModal;
