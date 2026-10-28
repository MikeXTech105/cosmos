import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import { applyApiErrorsToForm } from "../../../utils/formApiErrors";
import { hrDesignationSchema } from "../../../utils/validationSchemas";
import { getHrBoolean } from "../hrHelpers";

const getDefaultValues = (designation) => ({
  designationCode: designation?.designationCode ?? "",
  designationName: designation?.designationName ?? "",
  departmentId: designation?.departmentId ?? "",
  description: designation?.description ?? "",
  isActive: getHrBoolean(designation?.isActive, true),
});
const DESIGNATION_FIELDS = Object.keys(getDefaultValues());

const DesignationFormModal = ({
  canCreateDepartment = false,
  departmentOptions,
  departmentsLoading,
  designation,
  isLoading,
  isOpen,
  mode,
  onClose,
  onCreateDepartment,
  onSubmit,
}) => {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm({
    resolver: zodResolver(hrDesignationSchema),
    defaultValues: getDefaultValues(designation),
  });

  useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues(designation));
    }
  }, [designation, isOpen, reset]);

  const submitForm = async (values) => {
    try {
      await onSubmit({
        designationCode: values.designationCode.trim(),
        designationName: values.designationName.trim(),
        departmentId: values.departmentId,
        description: values.description?.trim() ?? "",
        isActive: values.isActive,
      });
    } catch (error) {
      applyApiErrorsToForm({ error, formFieldNames: DESIGNATION_FIELDS, setError });
    }
  };

  const title = isView
    ? "View Designation"
    : isEdit
      ? "Edit Designation"
      : "Add Designation";

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-2xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <BadgeCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Maintain HR role titles and their department mapping.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
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
              id="designationCode"
              label="Designation Code"
              required
              disabled={isView}
              error={errors.designationCode?.message}
              {...register("designationCode")}
            />

            <AppInput
              id="designationName"
              label="Designation Name"
              required
              disabled={isView}
              error={errors.designationName?.message}
              {...register("designationName")}
            />
          </div>

          <Controller
            name="departmentId"
            control={control}
            render={({ field }) => (
              <AppSelect
                label="Department"
                required
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={departmentOptions}
                placeholder={
                  departmentsLoading
                    ? "Loading departments..."
                    : "Select department"
                }
                emptyMessage="No active departments found"
                disabled={isView || departmentsLoading}
                error={errors.departmentId?.message}
                creatable={canCreateDepartment}
                createLabel="Create new department"
                onCreateClick={onCreateDepartment}
              />
            )}
          />

          <div>
            <label
              htmlFor="designationDescription"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Description
            </label>
            <textarea
              id="designationDescription"
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
                Active designation
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Active designations can be assigned to employees.
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
                {isEdit ? "Save Changes" : "Create Designation"}
              </AppButton>
            )}
          </div>
        </form>
      )}
    </AppModal>
  );
};

export default DesignationFormModal;
