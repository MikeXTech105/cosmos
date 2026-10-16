import { zodResolver } from "@hookform/resolvers/zod";
import { Check, CreditCard } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { enumNumber, requiredDate } from "../../../utils/validationRules";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import {
  getTodayInputValue,
  normalizeNumberBlurValue,
  normalizeNumberInput,
  PAYMENT_MODE_OPTIONS,
  SALES_PAYMENT_MODE,
} from "./invoiceHelpers";

const paymentSchema = z.object({
  paymentDate: requiredDate("Payment date"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentMode: enumNumber(SALES_PAYMENT_MODE, "Payment mode"),
  referenceNumber: z.string().max(100, "Reference is too long").optional(),
  notes: z.string().max(500, "Notes are too long").optional(),
});

const NumberInput = ({ control, error, maxAmount }) => {
  return (
    <Controller
      control={control}
      name="amount"
      render={({ field }) => (
        <AppInput
          id="paymentAmount"
          label="Amount"
          type="text"
          inputMode="decimal"
          placeholder="0"
          required
          value={field.value ?? ""}
          name={field.name}
          error={error}
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
            const value = normalizeNumberBlurValue(event.target.value);
            const numericValue = Number(value);

            field.onChange(
              maxAmount && numericValue > maxAmount ? String(maxAmount) : value,
            );
            field.onBlur();
          }}
          ref={field.ref}
        />
      )}
    />
  );
};

const buildPaymentPayload = (values) => ({
  paymentDate: values.paymentDate,
  amount: Number(values.amount),
  paymentMode: Number(values.paymentMode),
  referenceNumber: String(values.referenceNumber ?? "").trim() || null,
  notes: String(values.notes ?? "").trim() || null,
});

const PaymentModal = ({
  balanceAmount,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: getTodayInputValue(),
      amount: balanceAmount ? String(balanceAmount) : "",
      paymentMode: SALES_PAYMENT_MODE.CASH,
      referenceNumber: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        paymentDate: getTodayInputValue(),
        amount: balanceAmount ? String(balanceAmount) : "",
        paymentMode: SALES_PAYMENT_MODE.CASH,
        referenceNumber: "",
        notes: "",
      });
    }
  }, [balanceAmount, isOpen, reset]);

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-lg"
      onClose={isSubmitting ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Record Payment
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Add a receipt against this invoice.
          </p>
        </div>
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={handleSubmit((values) => onSubmit(buildPaymentPayload(values)))}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <AppInput
            id="paymentDate"
            label="Payment Date"
            type="date"
            required
            error={errors.paymentDate?.message}
            {...register("paymentDate")}
          />
          <NumberInput
            control={control}
            error={errors.amount?.message}
            maxAmount={balanceAmount}
          />
          <Controller
            control={control}
            name="paymentMode"
            render={({ field }) => (
              <AppSelect
                label="Payment Mode"
                value={field.value}
                onChange={(value) => field.onChange(Number(value))}
                onBlur={field.onBlur}
                options={PAYMENT_MODE_OPTIONS}
                error={errors.paymentMode?.message}
              />
            )}
          />
          <AppInput
            id="referenceNumber"
            label="Reference"
            error={errors.referenceNumber?.message}
            {...register("referenceNumber")}
          />
        </div>

        <div>
          <label
            htmlFor="paymentNotes"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Notes
          </label>
          <textarea
            id="paymentNotes"
            rows={3}
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
            {...register("notes")}
          />
          {errors.notes?.message && (
            <p className="mt-1.5 text-xs font-medium text-red-600">
              {errors.notes.message}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <AppButton
            variant="secondary"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </AppButton>
          <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…">
            <Check className="h-4 w-4" />
            Record Payment
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

export default PaymentModal;
