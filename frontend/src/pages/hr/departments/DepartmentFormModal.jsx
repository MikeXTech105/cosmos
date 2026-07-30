import { zodResolver } from "@hookform/resolvers/zod";
import { Building2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import { applyApiErrorsToForm } from "../../../utils/formApiErrors";
import { hrDepartmentSchema } from "../../../utils/validationSchemas";
import { getHrBoolean } from "../hrHelpers";

const getDefaultValues = (department) => ({
  departmentCode: department?.departmentCode ?? "",
  departmentName: department?.departmentName ?? "",
  description: department?.description ?? "",
  isActive: getHrBoolean(department?.isActive, true),
});
const DEPARTMENT_FIELDS = Object.keys(getDefaultValues());

const DepartmentFormModal = ({
  department,
  isLoading,
  isOpen,
  mode,
  onClose,
  onSubmit,
}) => {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm({
    resolver: zodResolver(hrDepartmentSchema),
    defaultValues: getDefaultValues(department),
  });

  useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues(department));
    }
  }, [department, isOpen, reset]);

  const submitForm = async (values) => {
    try {
      await onSubmit({
        departmentCode: values.departmentCode.trim(),
        departmentName: values.departmentName.trim(),
        description: values.description?.trim() ?? "",
        isActive: values.isActive,
      });
    } catch (error) {
      applyApiErrorsToForm({ error, formFieldNames: DEPARTMENT_FIELDS, setError });
    }
  };

  const title = isView
    ? "View Department"
    : isEdit
      ? "Edit Department"
      : "Add Department";

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Maintain HR departments and business units.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : (
        <form
          className="mt-6 space-y-5"
          onSubmit={handleSubmit(submitForm)}
        >
          {errors.root?.server?.message && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.root.server.message}
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <AppInput
              id="departmentCode"
              label="Department Code"
              required
              disabled={isView}
              error={errors.departmentCode?.message}
              {...register("departmentCode")}
            />

            <AppInput
              id="departmentName"
              label="Department Name"
              required
              disabled={isView}
              error={errors.departmentName?.message}
              {...register("departmentName")}
            />
          </div>

          <div>
            <label
              htmlFor="departmentDescription"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Description
            </label>
            <textarea
              id="departmentDescription"
              rows={4}
              disabled={isView}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50"
              {...register("description")}
            />
            {errors.description?.message && (
              <p className="mt-1.5 text-xs font-medium text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          <label
            className={[
              "flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3",
              isView ? "cursor-default" : "cursor-pointer",
            ].join(" ")}
          >
            <span>
              <span className="block text-sm font-semibold text-slate-900">
                Active department
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Active departments can be assigned to employees.
              </span>
            </span>
            <input
              type="checkbox"
              disabled={isView}
              className="h-4 w-4 accent-brand"
              {...register("isActive")}
            />
          </label>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <AppButton variant="secondary" onClick={onClose}>
              {isView ? "Close" : "Cancel"}
            </AppButton>
            {!isView && (
              <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…">
                {isEdit ? "Save Changes" : "Create Department"}
              </AppButton>
            )}
          </div>
        </form>
      )}
    </AppModal>
  );
};

export default DepartmentFormModal;
