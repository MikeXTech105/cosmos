import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import { hrBankDetailsSchema } from "../../../utils/validationSchemas";

const getDefaultValues = (bankDetails) => ({
  bankName: bankDetails?.bankName ?? "",
  accountNumber: bankDetails?.accountNumber ?? "",
  ifscCode: bankDetails?.ifscCode ?? "",
  branchName: bankDetails?.branchName ?? "",
  upiId: bankDetails?.upiId ?? "",
});

const EmployeeBankModal = ({
  bankDetails,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm({
    resolver: zodResolver(hrBankDetailsSchema),
    defaultValues: getDefaultValues(bankDetails),
  });

  useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues(bankDetails));
    }
  }, [bankDetails, isOpen, reset]);

  const submitForm = async (values) => {
    await onSubmit({
      bankName: values.bankName.trim(),
      accountNumber: values.accountNumber.trim(),
      ifscCode: values.ifscCode.trim(),
      branchName: values.branchName?.trim() ?? "",
      upiId: values.upiId?.trim() ?? "",
    });
  };

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Banknote className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Bank Details
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Update payroll bank information for this employee.
          </p>
        </div>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(submitForm)}>
        <div className="grid gap-4 md:grid-cols-2">
          <AppInput
            id="bankName"
            label="Bank Name"
            required
            error={errors.bankName?.message}
            {...register("bankName")}
          />
          <AppInput
            id="accountNumber"
            label="Account Number"
            required
            error={errors.accountNumber?.message}
            {...register("accountNumber")}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <AppInput
            id="ifscCode"
            label="IFSC Code"
            required
            error={errors.ifscCode?.message}
            {...register("ifscCode")}
          />
          <AppInput
            id="branchName"
            label="Branch Name"
            error={errors.branchName?.message}
            {...register("branchName")}
          />
        </div>

        <AppInput
          id="upiId"
          label="UPI ID"
          error={errors.upiId?.message}
          {...register("upiId")}
        />

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…">
            Save Bank Details
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

export default EmployeeBankModal;
