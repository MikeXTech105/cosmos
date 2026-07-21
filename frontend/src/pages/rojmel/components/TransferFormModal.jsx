import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRight } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import { getApiErrorMessage } from "../../../utils/apiError";
import { toRojmelInputDate } from "../rojmelHelpers";

const transferSchema = z
  .object({
    amount: z.coerce.number().positive("Amount must be greater than zero"),
    description: z.string().trim().optional(),
    fromWalletId: z.coerce.number().positive("Source wallet is required"),
    referenceNo: z.string().trim().optional(),
    toWalletId: z.coerce.number().positive("Destination wallet is required"),
    transferDate: z.string().min(1, "Date is required"),
  })
  .refine((values) => values.fromWalletId !== values.toWalletId, {
    message: "Source and destination wallets must be different",
    path: ["toWalletId"],
  });

const TransferFormModal = ({ isOpen, onClose, onSubmit, wallets }) => {
  const {
    control,
    handleSubmit,
    register,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      amount: "",
      description: "",
      fromWalletId: "",
      referenceNo: "",
      toWalletId: "",
      transferDate: toRojmelInputDate(),
    },
    resolver: zodResolver(transferSchema),
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        amount: "",
        description: "",
        fromWalletId: "",
        referenceNo: "",
        toWalletId: "",
        transferDate: toRojmelInputDate(),
      });
    }
  }, [isOpen, reset]);

  const fromWalletId = useWatch({ control, name: "fromWalletId" });
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
  const destinationOptions = useMemo(
    () =>
      walletOptions.map((option) => ({
        ...option,
        disabled: String(option.value) === String(fromWalletId),
      })),
    [fromWalletId, walletOptions],
  );

  const submit = async (values) => {
    try {
      await onSubmit({
        amount: Number(values.amount),
        description: values.description || undefined,
        fromWalletId: Number(values.fromWalletId),
        referenceNo: values.referenceNo || undefined,
        toWalletId: Number(values.toWalletId),
        transferDate: values.transferDate,
      });
    } catch (error) {
      setError("root.server", {
        message: getApiErrorMessage(error, "Unable to post transfer."),
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
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <ArrowLeftRight className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">New Transfer</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Move money between wallets. Transfers never count as income or expense.
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
          <Controller
            control={control}
            name="fromWalletId"
            render={({ field }) => (
              <AppSelect
                error={errors.fromWalletId?.message}
                label="From Wallet"
                options={walletOptions}
                placeholder="Choose source"
                required
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="toWalletId"
            render={({ field }) => (
              <AppSelect
                error={errors.toWalletId?.message}
                label="To Wallet"
                options={destinationOptions}
                placeholder="Choose destination"
                required
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <AppInput
            error={errors.transferDate?.message}
            label="Transfer Date"
            max={toRojmelInputDate()}
            required
            type="date"
            {...register("transferDate")}
          />
          <AppInput label="Reference No." placeholder="Optional reference" {...register("referenceNo")} />
        </div>
        <AppInput label="Description" placeholder="Purpose of this transfer" {...register("description")} />

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton disabled={isSubmitting} variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton isLoading={isSubmitting} loadingText="Transferring…" type="submit">
            <ArrowLeftRight className="h-4 w-4" />
            Transfer Money
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

export default TransferFormModal;
