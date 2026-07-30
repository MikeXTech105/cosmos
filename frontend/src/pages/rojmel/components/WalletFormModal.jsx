import { zodResolver } from "@hookform/resolvers/zod";
import { WalletCards } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import { RojmelWalletType } from "../../../constants/rojmelEnums";
import { getApiErrorMessage } from "../../../utils/apiError";
import { ROJMEL_WALLET_TYPE_OPTIONS } from "../rojmelHelpers";

const walletSchema = z
  .object({
    isActive: z.boolean(),
    isDefault: z.boolean(),
    linkedUserId: z.union([z.literal(""), z.coerce.number().positive()]),
    notes: z.string().trim().max(1000, "Notes are too long").optional(),
    openingBalance: z.coerce.number().min(0, "Opening balance cannot be negative"),
    walletCode: z.string().trim().optional(),
    walletName: z.string().trim().min(1, "Wallet name is required"),
    walletType: z.coerce.number().positive("Wallet type is required"),
  })
  .superRefine((values, context) => {
    if (values.walletType === RojmelWalletType.User && !values.linkedUserId) {
      context.addIssue({
        code: "custom",
        message: "Linked user is required for a user wallet",
        path: ["linkedUserId"],
      });
    }
  });

const getDefaults = (wallet) => ({
  isActive: wallet?.isActive ?? true,
  isDefault: wallet?.isDefault ?? false,
  linkedUserId: wallet?.linkedUserId ?? "",
  notes: wallet?.notes ?? "",
  openingBalance: wallet?.openingBalance ?? 0,
  walletCode: wallet?.walletCode ?? "",
  walletName: wallet?.walletName ?? "",
  walletType: wallet?.walletType ?? RojmelWalletType.User,
});

const WalletFormModal = ({ isOpen, mode, onClose, onSubmit, users, wallet }) => {
  const isEdit = mode === "edit";
  const isView = mode === "view";
  const {
    control,
    handleSubmit,
    register,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: getDefaults(wallet),
    resolver: zodResolver(walletSchema),
  });

  useEffect(() => {
    if (isOpen) reset(getDefaults(wallet));
  }, [isOpen, reset, wallet]);

  const walletType = useWatch({ control, name: "walletType" });
  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        label:
          user.fullName ??
          user.name ??
          user.userName ??
          user.email ??
          `User ${user.id}`,
        value: user.id,
      })),
    [users],
  );
  const walletTypeOptions = ROJMEL_WALLET_TYPE_OPTIONS.filter(
    (option) => option.value !== "all",
  );

  const submit = async (values) => {
    const common = {
      isDefault: Boolean(values.isDefault),
      linkedUserId: values.linkedUserId ? Number(values.linkedUserId) : undefined,
      notes: values.notes || undefined,
      walletName: values.walletName || undefined,
      walletType: Number(values.walletType),
    };
    const payload = isEdit
      ? common
      : {
          ...common,
          isActive: Boolean(values.isActive),
          openingBalance: Number(values.openingBalance),
          walletCode: values.walletCode || undefined,
        };

    try {
      await onSubmit(payload);
    } catch (error) {
      setError("root.server", {
        message: getApiErrorMessage(error, "Unable to save wallet."),
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
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
          <WalletCards className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {isView ? "Wallet Details" : isEdit ? "Edit Wallet" : "Create Wallet"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Company, user and external cash locations in one ledger.
          </p>
        </div>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(submit)}>
        {errors.root?.server?.message && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.server.message}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {!isEdit && (
            <AppInput
              disabled={isView}
              error={errors.walletCode?.message}
              label="Wallet Code"
              placeholder="Auto if blank"
              {...register("walletCode")}
            />
          )}
          <AppInput
            autoFocus={!isView}
            disabled={isView}
            error={errors.walletName?.message}
            label="Wallet Name"
            required
            {...register("walletName")}
          />
          <Controller
            control={control}
            name="walletType"
            render={({ field }) => (
              <AppSelect
                disabled={isView || wallet?.isCompanyWallet}
                error={errors.walletType?.message}
                label="Wallet Type"
                options={walletTypeOptions}
                required
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {Number(walletType) === RojmelWalletType.User && (
            <Controller
              control={control}
              name="linkedUserId"
              render={({ field }) => (
                <AppSelect
                  disabled={isView}
                  error={errors.linkedUserId?.message}
                  label="Linked User"
                  options={userOptions}
                  placeholder="Choose user"
                  required
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          )}
          {!isEdit && (
            <AppInput
              disabled={isView}
              error={errors.openingBalance?.message}
              label="Opening Balance"
              min="0"
              step="0.01"
              type="number"
              {...register("openingBalance")}
            />
          )}
        </div>

        <AppInput disabled={isView} label="Notes" placeholder="Optional notes" {...register("notes")} />

        {!isView && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-800">Default wallet</span>
              <input type="checkbox" className="h-4 w-4 accent-brand" {...register("isDefault")} />
            </label>
            {!isEdit && (
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-800">Active</span>
                <input type="checkbox" className="h-4 w-4 accent-brand" {...register("isActive")} />
              </label>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton variant="secondary" onClick={onClose}>
            {isView ? "Close" : "Cancel"}
          </AppButton>
          {!isView && (
            <AppButton isLoading={isSubmitting} loadingText="Saving…" type="submit">
              {isEdit ? "Save Changes" : "Create Wallet"}
            </AppButton>
          )}
        </div>
      </form>
    </AppModal>
  );
};

export default WalletFormModal;
