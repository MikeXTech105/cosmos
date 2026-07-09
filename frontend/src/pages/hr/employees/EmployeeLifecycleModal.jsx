import { zodResolver } from "@hookform/resolvers/zod";
import { LogOut, UserPlus } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import {
  hrEmployeeRejoinSchema,
  hrEmployeeResignSchema,
} from "../../../utils/validationSchemas";
import { getEmployeeName } from "../hrHelpers";

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const getDefaultValues = (mode) => {
  if (mode === "rejoin") {
    return {
      rejoinedDate: todayInputValue(),
      remarks: "",
    };
  }

  return {
    lastWorkingDate: todayInputValue(),
    resignationReason: "",
  };
};

const TextAreaField = ({ error, id, label, required, ...props }) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <textarea
        id={id}
        rows={4}
        className={[
          "w-full resize-y rounded-lg border bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400",
          "outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20",
          error ? "border-red-400 bg-red-50" : "border-slate-200",
        ].join(" ")}
        {...props}
      />
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
};

const EmployeeLifecycleModal = ({
  employee,
  isOpen,
  mode = "resign",
  onClose,
  onSubmit,
}) => {
  const isRejoin = mode === "rejoin";
  const Icon = isRejoin ? UserPlus : LogOut;
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm({
    resolver: zodResolver(
      isRejoin ? hrEmployeeRejoinSchema : hrEmployeeResignSchema,
    ),
    defaultValues: getDefaultValues(mode),
  });

  useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues(mode));
    }
  }, [isOpen, mode, reset]);

  const submitForm = async (values) => {
    await onSubmit(
      isRejoin
        ? {
            rejoinedDate: values.rejoinedDate,
            remarks: values.remarks?.trim() ?? "",
          }
        : {
            lastWorkingDate: values.lastWorkingDate,
            resignationReason: values.resignationReason?.trim() ?? "",
          },
    );
  };

  return (
    <AppModal
      isOpen={isOpen}
      maxWidth="max-w-xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {isRejoin ? "Rejoin Employee" : "Resign Employee"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {getEmployeeName(employee)}
            {employee?.employeeCode ? ` - ${employee.employeeCode}` : ""}
          </p>
        </div>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(submitForm)}>
        {isRejoin ? (
          <>
            <AppInput
              id="rejoinedDate"
              label="Rejoined Date"
              type="date"
              required
              error={errors.rejoinedDate?.message}
              {...register("rejoinedDate")}
            />
            <TextAreaField
              id="remarks"
              label="Remarks"
              placeholder="Optional notes for this rejoin"
              error={errors.remarks?.message}
              {...register("remarks")}
            />
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              The existing employee code will stay unchanged.
            </div>
          </>
        ) : (
          <>
            <AppInput
              id="lastWorkingDate"
              label="Last Working Date"
              type="date"
              required
              error={errors.lastWorkingDate?.message}
              {...register("lastWorkingDate")}
            />
            <TextAreaField
              id="resignationReason"
              label="Resignation Reason"
              placeholder="Reason, handover notes, or HR remarks"
              error={errors.resignationReason?.message}
              {...register("resignationReason")}
            />
          </>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton variant="secondary" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton
            type="submit"
            variant={isRejoin ? "primary" : "danger"}
            isLoading={isSubmitting}
          >
            {isRejoin ? "Rejoin Employee" : "Mark Resigned"}
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

export default EmployeeLifecycleModal;
