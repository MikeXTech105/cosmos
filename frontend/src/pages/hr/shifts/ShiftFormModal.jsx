import { zodResolver } from "@hookform/resolvers/zod";
import { Clock } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import { applyApiErrorsToForm } from "../../../utils/formApiErrors";
import { hrShiftSchema } from "../../../utils/validationSchemas";
import { getHrBoolean } from "../hrHelpers";
import { HrNumberInput } from "../HrShared";

const getTimeInputValue = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  const normalized = String(value).slice(0, 5);

  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : fallback;
};

const toApiTime = (value) => {
  const normalized = String(value ?? "").trim();

  if (/^\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }

  return normalized;
};

const getDefaultValues = (shift) => ({
  shiftCode: shift?.shiftCode ?? "",
  shiftName: shift?.shiftName ?? "",
  startTime: getTimeInputValue(shift?.startTime, "09:00"),
  endTime: getTimeInputValue(shift?.endTime, "18:00"),
  graceMinutes: shift?.graceMinutes ?? 0,
  isNightShift: getHrBoolean(shift?.isNightShift, false),
  weeklyHours: shift?.weeklyHours ?? 48,
  isActive: getHrBoolean(shift?.isActive, true),
});
const SHIFT_FIELDS = Object.keys(getDefaultValues());

const ShiftFormModal = ({
  isLoading,
  isOpen,
  mode,
  onClose,
  onSubmit,
  shift,
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
    resolver: zodResolver(hrShiftSchema),
    defaultValues: getDefaultValues(shift),
  });

  useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues(shift));
    }
  }, [isOpen, reset, shift]);

  const submitForm = async (values) => {
    try {
      await onSubmit({
        shiftCode: values.shiftCode.trim(),
        shiftName: values.shiftName.trim(),
        startTime: toApiTime(values.startTime),
        endTime: toApiTime(values.endTime),
        graceMinutes: Number(values.graceMinutes),
        isNightShift: values.isNightShift,
        weeklyHours: Number(values.weeklyHours),
        isActive: values.isActive,
      });
    } catch (error) {
      applyApiErrorsToForm({ error, formFieldNames: SHIFT_FIELDS, setError });
    }
  };

  const title = isView
    ? "View Shift"
    : isEdit
      ? "Edit Shift"
      : "Add Shift";

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-2xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Clock aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Configure shift timing, grace minutes, and weekly hours.
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
              id="shiftCode"
              label="Shift Code"
              required
              disabled={isView}
              error={errors.shiftCode?.message}
              {...register("shiftCode")}
            />

            <AppInput
              id="shiftName"
              label="Shift Name"
              required
              disabled={isView}
              error={errors.shiftName?.message}
              {...register("shiftName")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <AppInput
              id="startTime"
              label="Start Time"
              type="time"
              required
              disabled={isView}
              error={errors.startTime?.message}
              {...register("startTime")}
            />

            <AppInput
              id="endTime"
              label="End Time"
              type="time"
              required
              disabled={isView}
              error={errors.endTime?.message}
              {...register("endTime")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <HrNumberInput
              control={control}
              id="graceMinutes"
              name="graceMinutes"
              label="Grace Minutes"
              allowDecimal={false}
              disabled={isView}
              error={errors.graceMinutes?.message}
            />

            <HrNumberInput
              control={control}
              id="weeklyHours"
              name="weeklyHours"
              label="Weekly Hours"
              disabled={isView}
              error={errors.weeklyHours?.message}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label
              className={[
                "flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3",
                isView ? "cursor-default" : "cursor-pointer",
              ].join(" ")}
            >
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Night shift
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Mark this shift as overnight work.
                </span>
              </span>
              <input
                type="checkbox"
                disabled={isView}
                title={isView ? "Open edit mode to change the night-shift setting" : undefined}
                className="h-4 w-4 accent-brand"
                {...register("isNightShift")}
              />
            </label>

            <label
              className={[
                "flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3",
                isView ? "cursor-default" : "cursor-pointer",
              ].join(" ")}
            >
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Active shift
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Active shifts can be assigned to employees.
                </span>
              </span>
              <input
                type="checkbox"
                disabled={isView}
                title={isView ? "Open edit mode to change shift status" : undefined}
                className="h-4 w-4 accent-brand"
                {...register("isActive")}
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <AppButton variant="secondary" onClick={onClose}>
              {isView ? "Close" : "Cancel"}
            </AppButton>
            {!isView && (
              <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…">
                {isEdit ? "Save Changes" : "Create Shift"}
              </AppButton>
            )}
          </div>
        </form>
      )}
    </AppModal>
  );
};

export default ShiftFormModal;
