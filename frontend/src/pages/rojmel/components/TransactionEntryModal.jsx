import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownLeft, ArrowUpRight, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import { getApiErrorMessage } from "../../../utils/apiError";
import {
  PAYMENT_MODE_OPTIONS,
  toRojmelInputDate,
} from "../rojmelHelpers";

const optionalText = z.string().trim().optional();
const entrySchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  categoryId: z.union([z.literal(""), z.coerce.number().positive()]),
  description: optionalText,
  isIncrease: z.boolean(),
  paymentMode: optionalText,
  referenceNo: optionalText,
  transactionDate: z.string().min(1, "Date is required"),
  walletId: z.union([z.literal(""), z.coerce.number().positive()]),
});

const defaults = {
  amount: "",
  categoryId: "",
  description: "",
  isIncrease: true,
  paymentMode: "Cash",
  referenceNo: "",
  transactionDate: toRojmelInputDate(),
  walletId: "",
};

const TransactionEntryModal = ({
  categories,
  categoriesLoading,
  isAdmin,
  isOpen,
  mode,
  onClose,
  onSubmit,
  wallets,
}) => {
  const isAdjustment = mode === "adjustment";
  const isIncome = mode === "income";
  const title = isAdjustment
    ? "Balance Adjustment"
    : isIncome
      ? "Add Income"
      : "Add Expense";
  const Icon = isAdjustment
    ? SlidersHorizontal
    : isIncome
      ? ArrowDownLeft
      : ArrowUpRight;
  const tone = isAdjustment
    ? "bg-amber-50 text-amber-700"
    : isIncome
      ? "bg-emerald-50 text-emerald-700"
      : "bg-red-50 text-red-600";
  const {
    control,
    handleSubmit,
    register,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: defaults,
    resolver: zodResolver(entrySchema),
  });

  useEffect(() => {
    if (isOpen) reset({ ...defaults, transactionDate: toRojmelInputDate() });
  }, [isOpen, mode, reset]);

  const walletOptions = useMemo(
    () =>
      wallets
        .filter((wallet) => wallet.isActive !== false)
        .map((wallet) => ({
          label: `${wallet.walletName} · ${wallet.walletCode || "No code"}`,
          value: wallet.id,
        })),
    [wallets],
  );
  const categoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category.isActive !== false)
        .map((category) => ({ label: category.name, value: category.id })),
    [categories],
  );

  const submit = async (values) => {
    if (isAdmin && !values.walletId) {
      setError("walletId", { message: "Wallet is required" });
      return;
    }

    const payload = {
      amount: Number(values.amount),
      description: values.description || undefined,
      referenceNo: values.referenceNo || undefined,
      transactionDate: values.transactionDate,
      ...(isAdmin ? { walletId: Number(values.walletId) } : {}),
      ...(isAdjustment
        ? { isIncrease: Boolean(values.isIncrease) }
        : {
            categoryId: values.categoryId
              ? Number(values.categoryId)
              : undefined,
            paymentMode: values.paymentMode || undefined,
          }),
    };

    try {
      await onSubmit(payload);
    } catch (error) {
      setError("root.server", {
        message: getApiErrorMessage(error, `Unable to post ${mode}.`),
      });
    }
  };

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-2xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {isAdjustment
              ? "Manual balance correction. Adjustments stay outside income and expense totals."
              : "Record the amount now and keep the daily cash position current."}
          </p>
        </div>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(submit)}>
        {errors.root?.server?.message && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.server.message}
          </p>
        )}

        <AppInput
          autoFocus
          className="h-14 text-xl font-bold tabular-nums"
          error={errors.amount?.message}
          label="Amount"
          min="0.01"
          placeholder="₹ 0.00"
          required
          step="0.01"
          type="number"
          {...register("amount")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {isAdmin && (
            <Controller
              control={control}
              name="walletId"
              render={({ field }) => (
                <AppSelect
                  error={errors.walletId?.message}
                  label="Wallet"
                  options={walletOptions}
                  placeholder="Choose wallet"
                  required
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          )}
          {!isAdjustment && (
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <AppSelect
                  disabled={categoriesLoading}
                  error={errors.categoryId?.message}
                  label="Category"
                  options={categoryOptions}
                  placeholder={categoriesLoading ? "Loading…" : "Choose category"}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          )}
          <AppInput
            error={errors.transactionDate?.message}
            label="Date"
            max={toRojmelInputDate()}
            required
            type="date"
            {...register("transactionDate")}
          />
          {!isAdjustment && (
            <Controller
              control={control}
              name="paymentMode"
              render={({ field }) => (
                <AppSelect
                  label="Payment Mode"
                  options={PAYMENT_MODE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </div>

        {isAdjustment && (
          <Controller
            control={control}
            name="isIncrease"
            render={({ field }) => (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-700">
                  Correction direction
                </p>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                  {[true, false].map((value) => (
                    <button
                      key={String(value)}
                      type="button"
                      className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
                        field.value === value
                          ? "bg-white text-brand shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      onClick={() => field.onChange(value)}
                    >
                      {value ? "Increase balance" : "Decrease balance"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <AppInput label="Reference No." placeholder="Optional reference" {...register("referenceNo")} />
          <AppInput label="Description" placeholder="What was this for?" {...register("description")} />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton disabled={isSubmitting} variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton isLoading={isSubmitting} loadingText="Posting…" type="submit">
            Post {isAdjustment ? "Adjustment" : isIncome ? "Income" : "Expense"}
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

export default TransactionEntryModal;
