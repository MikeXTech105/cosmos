import { zodResolver } from "@hookform/resolvers/zod";
import { FileClock, LogIn, LogOut, ShieldCheck, ShieldX } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import {
  HR_ATTENDANCE_STATUS,
  HR_ATTENDANCE_STATUS_OPTIONS,
} from "../../../utils/hrEnums";
import {
  hrAttendanceAdjustmentSchema,
  hrAttendanceDecisionSchema,
  hrAttendanceManualSchema,
  hrAttendanceQuickActionSchema,
} from "../../../utils/validationSchemas";
import { combineDateAndTime } from "../hrHelpers";
import { formatLocalDateKey } from "./attendanceHelpers";

const today = () => formatLocalDateKey(new Date());
const nowTime = () => new Date().toTimeString().slice(0, 5);

const ModalIntro = ({ description, icon: Icon, tone = "brand" }) => {
  const toneClass =
    tone === "danger"
      ? "bg-red-50 text-red-600"
      : tone === "success"
        ? "bg-emerald-50 text-emerald-600"
        : "bg-brand-light text-brand";

  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="pt-0.5 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
};

const FormActions = ({ isSubmitting, onClose, submitLabel }) => (
  <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
    <AppButton variant="secondary" disabled={isSubmitting} onClick={onClose}>
      Cancel
    </AppButton>
    <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…">
      {submitLabel}
    </AppButton>
  </div>
);

export const QuickActionModal = ({
  action,
  employeeOptions,
  initialEmployeeId = "",
  isOpen,
  onClose,
  onSubmit,
}) => {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm({
    resolver: zodResolver(hrAttendanceQuickActionSchema),
    defaultValues: { actionTime: nowTime(), employeeId: "" },
  });
  const isCheckIn = action === "checkIn";

  useEffect(() => {
    if (isOpen) {
      reset({ actionTime: nowTime(), employeeId: initialEmployeeId || "" });
    }
  }, [initialEmployeeId, isOpen, reset]);

  const submitForm = async (values) => {
    await onSubmit({
      employeeId: Number(values.employeeId),
      [`${action}Time`]: combineDateAndTime(today(), values.actionTime),
    });
  };

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-lg"
      onClose={isSubmitting ? undefined : onClose}
      title={isCheckIn ? "Check In" : "Check Out"}
    >
      <ModalIntro
        icon={isCheckIn ? LogIn : LogOut}
        tone={isCheckIn ? "success" : "brand"}
        description={`Record today's ${isCheckIn ? "arrival" : "departure"} time for an employee.`}
      />
      <form className="space-y-5" onSubmit={handleSubmit(submitForm)}>
        <Controller
          name="employeeId"
          control={control}
          render={({ field }) => (
            <AppSelect
              label="Employee"
              required
              value={field.value}
              onChange={field.onChange}
              options={employeeOptions}
              placeholder="Select employee"
              error={errors.employeeId?.message}
            />
          )}
        />
        <AppInput
          id={`${action}Time`}
          label="Time"
          type="time"
          required
          error={errors.actionTime?.message}
          {...register("actionTime")}
        />
        <FormActions
          isSubmitting={isSubmitting}
          onClose={onClose}
          submitLabel={isCheckIn ? "Save Check In" : "Save Check Out"}
        />
      </form>
    </AppModal>
  );
};

export const ManualEntryModal = ({
  employeeOptions,
  initialEmployeeId = "",
  isOpen,
  onClose,
  onSubmit,
}) => {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm({
    resolver: zodResolver(hrAttendanceManualSchema),
    defaultValues: {
      attendanceDate: today(),
      attendanceStatus: HR_ATTENDANCE_STATUS.PRESENT,
      checkInTime: "09:00",
      checkOutTime: "18:00",
      employeeId: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        attendanceDate: today(),
        attendanceStatus: HR_ATTENDANCE_STATUS.PRESENT,
        checkInTime: "09:00",
        checkOutTime: "18:00",
        employeeId: initialEmployeeId || "",
      });
    }
  }, [initialEmployeeId, isOpen, reset]);

  const submitForm = async (values) => {
    await onSubmit({
      attendanceDate: values.attendanceDate,
      attendanceStatus: Number(values.attendanceStatus),
      checkInTime: combineDateAndTime(
        values.attendanceDate,
        values.checkInTime,
      ),
      checkOutTime: combineDateAndTime(
        values.attendanceDate,
        values.checkOutTime,
      ),
      employeeId: Number(values.employeeId),
    });
  };

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-2xl"
      onClose={isSubmitting ? undefined : onClose}
      title="Manual Attendance"
    >
      <ModalIntro
        icon={FileClock}
        description="Add or correct one employee's attendance with the right day status and times."
      />
      <form className="space-y-5" onSubmit={handleSubmit(submitForm)}>
        <Controller
          name="employeeId"
          control={control}
          render={({ field }) => (
            <AppSelect
              label="Employee"
              required
              value={field.value}
              onChange={field.onChange}
              options={employeeOptions}
              placeholder="Select employee"
              error={errors.employeeId?.message}
            />
          )}
        />
        <div className="grid gap-4 md:grid-cols-3">
          <AppInput
            id="attendanceDate"
            label="Attendance Date"
            type="date"
            required
            error={errors.attendanceDate?.message}
            {...register("attendanceDate")}
          />
          <AppInput
            id="manualCheckIn"
            label="Check In"
            type="time"
            error={errors.checkInTime?.message}
            {...register("checkInTime")}
          />
          <AppInput
            id="manualCheckOut"
            label="Check Out"
            type="time"
            error={errors.checkOutTime?.message}
            {...register("checkOutTime")}
          />
        </div>
        <Controller
          name="attendanceStatus"
          control={control}
          render={({ field }) => (
            <AppSelect
              label="Day Status"
              value={field.value}
              onChange={field.onChange}
              options={HR_ATTENDANCE_STATUS_OPTIONS}
              error={errors.attendanceStatus?.message}
            />
          )}
        />
        <FormActions
          isSubmitting={isSubmitting}
          onClose={onClose}
          submitLabel="Save Attendance"
        />
      </form>
    </AppModal>
  );
};

export const AdjustmentModal = ({
  employeeOptions,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm({
    resolver: zodResolver(hrAttendanceAdjustmentSchema),
    defaultValues: { attendanceId: "", employeeId: "", reason: "" },
  });

  useEffect(() => {
    if (isOpen) reset({ attendanceId: "", employeeId: "", reason: "" });
  }, [isOpen, reset]);

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-xl"
      onClose={isSubmitting ? undefined : onClose}
      title="Attendance Adjustment"
    >
      <ModalIntro
        icon={FileClock}
        description="Request a correction for an existing attendance record."
      />
      <form
        className="space-y-5"
        onSubmit={handleSubmit(async (values) =>
          onSubmit({
            attendanceId: Number(values.attendanceId),
            employeeId: Number(values.employeeId),
            reason: values.reason.trim(),
          }),
        )}
      >
        <Controller
          name="employeeId"
          control={control}
          render={({ field }) => (
            <AppSelect
              label="Employee"
              required
              value={field.value}
              onChange={field.onChange}
              options={employeeOptions}
              placeholder="Select employee"
              error={errors.employeeId?.message}
            />
          )}
        />
        <AppInput
          id="attendanceId"
          label="Attendance Record ID"
          required
          error={errors.attendanceId?.message}
          {...register("attendanceId")}
        />
        <AppInput
          id="reason"
          label="Correction reason"
          required
          error={errors.reason?.message}
          {...register("reason")}
        />
        <FormActions
          isSubmitting={isSubmitting}
          onClose={onClose}
          submitLabel="Submit Request"
        />
      </form>
    </AppModal>
  );
};

export const DecisionModal = ({ isOpen, mode, onClose, onSubmit }) => {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm({
    resolver: zodResolver(hrAttendanceDecisionSchema),
    defaultValues: { adjustmentId: "", remarks: "" },
  });
  const isApprove = mode === "approve";

  useEffect(() => {
    if (isOpen) reset({ adjustmentId: "", remarks: "" });
  }, [isOpen, reset]);

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-lg"
      onClose={isSubmitting ? undefined : onClose}
      title={isApprove ? "Approve Adjustment" : "Reject Adjustment"}
    >
      <ModalIntro
        icon={isApprove ? ShieldCheck : ShieldX}
        tone={isApprove ? "success" : "danger"}
        description={`${isApprove ? "Approve" : "Reject"} a pending attendance correction request.`}
      />
      <form
        className="space-y-5"
        onSubmit={handleSubmit(async (values) =>
          onSubmit({
            adjustmentId: Number(values.adjustmentId),
            remarks: values.remarks?.trim() ?? "",
          }),
        )}
      >
        <AppInput
          id="adjustmentId"
          label="Adjustment ID"
          required
          error={errors.adjustmentId?.message}
          {...register("adjustmentId")}
        />
        <AppInput
          id="remarks"
          label="Remarks"
          error={errors.remarks?.message}
          {...register("remarks")}
        />
        <FormActions
          isSubmitting={isSubmitting}
          onClose={onClose}
          submitLabel={isApprove ? "Approve Request" : "Reject Request"}
        />
      </form>
    </AppModal>
  );
};
