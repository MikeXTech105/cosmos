import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarCheck,
  Clock,
  FileClock,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  UserCheck,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import AppSelect from "../../../components/common/AppSelect";
import PageHeader from "../../../components/common/PageHeader";
import { hrDepartmentService } from "../../../services/hr/departmentService";
import { hrEmployeeService } from "../../../services/hr/employeeService";
import {
  approveHrAttendanceAdjustment,
  createHrAttendanceManualEntry,
  fetchHrAttendance,
  fetchHrAttendanceDepartmentReport,
  fetchHrAttendanceMonthlyReport,
  hrAttendanceCheckIn,
  hrAttendanceCheckOut,
  rejectHrAttendanceAdjustment,
  requestHrAttendanceAdjustment,
  setHrAttendanceFilters,
  setHrAttendancePage,
  setHrAttendancePageSize,
} from "../../../store/slices/hr/attendanceSlice";
import {
  HR_ATTENDANCE_STATUS,
  HR_ATTENDANCE_STATUS_OPTIONS,
  getHrOptionLabel,
} from "../../../utils/hrEnums";
import {
  hrAttendanceAdjustmentSchema,
  hrAttendanceDecisionSchema,
  hrAttendanceManualSchema,
  hrAttendanceQuickActionSchema,
} from "../../../utils/validationSchemas";
import {
  buildHrQueryParams,
  combineDateAndTime,
  formatHrDate,
  formatHrDateTime,
  formatHrHours,
  getEmployeeName,
  getHrActionError,
  getHrRecordId,
  getHrSuccessMessage,
  getLookupLabel,
} from "../hrHelpers";
import useHrCapabilities from "../useHrCapabilities";
import {
  HrEmptyState,
  HrPagination,
  HrStatCard,
} from "../HrShared";

const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);

const extractList = (response) => {
  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

const toEmployeeOption = (employee) => {
  const value = getHrRecordId(employee, "employee");
  const label = getEmployeeName(employee);

  return value && label ? { label, value } : null;
};

const AttendanceStatusPill = ({ status }) => {
  const value = Number(status);
  const color =
    value === HR_ATTENDANCE_STATUS.PRESENT
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : value === HR_ATTENDANCE_STATUS.LATE
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : value === HR_ATTENDANCE_STATUS.ON_LEAVE
          ? "bg-brand-light text-brand ring-brand/20"
          : "bg-red-50 text-red-700 ring-red-200";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${color}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {getHrOptionLabel(HR_ATTENDANCE_STATUS_OPTIONS, status, "Unknown")}
    </span>
  );
};

const QuickActionModal = ({ action, employeeOptions, isOpen, onClose, onSubmit }) => {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm({
    resolver: zodResolver(hrAttendanceQuickActionSchema),
    defaultValues: {
      actionTime: nowTime(),
      employeeId: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ actionTime: nowTime(), employeeId: "" });
    }
  }, [isOpen, reset]);

  const submitForm = async (values) => {
    await onSubmit({
      employeeId: Number(values.employeeId),
      [`${action}Time`]: combineDateAndTime(today(), values.actionTime),
    });
  };

  return (
    <AppModal
      isOpen={isOpen}
      maxWidth="max-w-lg"
      onClose={isSubmitting ? undefined : onClose}
    >
      <h2 className="text-lg font-semibold text-slate-900">
        {action === "checkIn" ? "Check In" : "Check Out"}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Record today&apos;s attendance time for an employee.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(submitForm)}>
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

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" isLoading={isSubmitting}>
            Save
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

const ManualEntryModal = ({ employeeOptions, isOpen, onClose, onSubmit }) => {
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
        employeeId: "",
      });
    }
  }, [isOpen, reset]);

  const submitForm = async (values) => {
    await onSubmit({
      attendanceDate: values.attendanceDate,
      attendanceStatus: Number(values.attendanceStatus),
      checkInTime: combineDateAndTime(values.attendanceDate, values.checkInTime),
      checkOutTime: combineDateAndTime(values.attendanceDate, values.checkOutTime),
      employeeId: Number(values.employeeId),
    });
  };

  return (
    <AppModal
      isOpen={isOpen}
      maxWidth="max-w-2xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <h2 className="text-lg font-semibold text-slate-900">Manual Entry</h2>
      <p className="mt-1 text-sm text-slate-500">
        Add or correct an attendance record from HR.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(submitForm)}>
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
            label="Date"
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
              label="Status"
              value={field.value}
              onChange={field.onChange}
              options={HR_ATTENDANCE_STATUS_OPTIONS}
              error={errors.attendanceStatus?.message}
            />
          )}
        />

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" isLoading={isSubmitting}>
            Save Entry
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

const AdjustmentModal = ({ employeeOptions, isOpen, onClose, onSubmit }) => {
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
    if (isOpen) {
      reset({ attendanceId: "", employeeId: "", reason: "" });
    }
  }, [isOpen, reset]);

  const submitForm = async (values) => {
    await onSubmit({
      attendanceId: Number(values.attendanceId),
      employeeId: Number(values.employeeId),
      reason: values.reason.trim(),
    });
  };

  return (
    <AppModal
      isOpen={isOpen}
      maxWidth="max-w-xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <h2 className="text-lg font-semibold text-slate-900">
        Adjustment Request
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Request a correction for an existing attendance record.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(submitForm)}>
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
          label="Attendance ID"
          required
          error={errors.attendanceId?.message}
          {...register("attendanceId")}
        />
        <AppInput
          id="reason"
          label="Reason"
          required
          error={errors.reason?.message}
          {...register("reason")}
        />

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" isLoading={isSubmitting}>
            Submit Request
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

const DecisionModal = ({ isOpen, mode, onClose, onSubmit }) => {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm({
    resolver: zodResolver(hrAttendanceDecisionSchema),
    defaultValues: { adjustmentId: "", remarks: "" },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ adjustmentId: "", remarks: "" });
    }
  }, [isOpen, reset]);

  const submitForm = async (values) => {
    await onSubmit({
      adjustmentId: Number(values.adjustmentId),
      remarks: values.remarks?.trim() ?? "",
    });
  };

  return (
    <AppModal
      isOpen={isOpen}
      maxWidth="max-w-lg"
      onClose={isSubmitting ? undefined : onClose}
    >
      <h2 className="text-lg font-semibold text-slate-900">
        {mode === "approve" ? "Approve Adjustment" : "Reject Adjustment"}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Enter the pending adjustment id from the approval queue.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(submitForm)}>
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

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" isLoading={isSubmitting}>
            {mode === "approve" ? "Approve" : "Reject"}
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

const AttendancePage = () => {
  const dispatch = useDispatch();
  const attendanceState = useSelector((state) => state.hrAttendance);
  const capabilities = useHrCapabilities({
    actions: ["view", "create", "approve"],
    label: "Attendance",
    resource: ["attendance", "hrAttendance"],
    route: "/hr/attendance",
  });
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [modal, setModal] = useState(null);
  const [decisionMode, setDecisionMode] = useState("approve");
  const [reportFilters, setReportFilters] = useState({
    attendanceDate: today(),
    departmentId: "",
    employeeId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const queryParams = useMemo(
    () =>
      buildHrQueryParams({
        filters: attendanceState.filters,
        pageNumber: attendanceState.pageNumber,
        pageSize: attendanceState.pageSize,
        extra: {
          DepartmentId:
            attendanceState.filters.DepartmentId === "all"
              ? undefined
              : Number(attendanceState.filters.DepartmentId),
          EmployeeId: attendanceState.filters.EmployeeId
            ? Number(attendanceState.filters.EmployeeId)
            : undefined,
          FromDate: attendanceState.filters.FromDate || undefined,
          Status:
            attendanceState.filters.Status === "all"
              ? undefined
              : Number(attendanceState.filters.Status),
          ToDate: attendanceState.filters.ToDate || undefined,
        },
      }),
    [
      attendanceState.filters,
      attendanceState.pageNumber,
      attendanceState.pageSize,
    ],
  );

  const loadAttendance = useCallback(() => {
    return dispatch(fetchHrAttendance(queryParams));
  }, [dispatch, queryParams]);

  const loadLookups = useCallback(async () => {
    try {
      const [employees, departments] = await Promise.all([
        hrEmployeeService.getEmployeeDropdown(),
        hrDepartmentService.getDepartments({
          IsActive: true,
          PageNumber: 1,
          PageSize: 200,
        }),
      ]);
      setEmployeeOptions(extractList(employees).map(toEmployeeOption).filter(Boolean));
      setDepartmentOptions(
        extractList(departments)
          .map((department) => ({
            label: department.departmentName,
            value: getHrRecordId(department, "department"),
          }))
          .filter((option) => option.label && option.value),
      );
    } catch (error) {
      toast.error(getHrActionError(error, "Unable to load attendance lookups."));
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadAttendance);
  }, [loadAttendance]);

  useEffect(() => {
    void Promise.resolve().then(loadLookups);
  }, [loadLookups]);

  const stats = useMemo(
    () => ({
      absent: attendanceState.list.filter(
        (row) => Number(row.attendanceStatus ?? row.status) === HR_ATTENDANCE_STATUS.ABSENT,
      ).length,
      late: attendanceState.list.filter(
        (row) => Number(row.attendanceStatus ?? row.status) === HR_ATTENDANCE_STATUS.LATE,
      ).length,
      leave: attendanceState.list.filter(
        (row) => Number(row.attendanceStatus ?? row.status) === HR_ATTENDANCE_STATUS.ON_LEAVE,
      ).length,
      present: attendanceState.list.filter(
        (row) => Number(row.attendanceStatus ?? row.status) === HR_ATTENDANCE_STATUS.PRESENT,
      ).length,
    }),
    [attendanceState.list],
  );

  const runAction = useCallback(
    async (action, payload) => {
      if (!capabilities.canCreate) {
        return;
      }

      try {
        const response =
          action === "checkIn"
            ? await dispatch(hrAttendanceCheckIn(payload)).unwrap()
            : await dispatch(hrAttendanceCheckOut(payload)).unwrap();
        toast.success(getHrSuccessMessage(response, "Attendance saved"));
        setModal(null);
        await loadAttendance();
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to save attendance."));
        throw error;
      }
    },
    [capabilities.canCreate, dispatch, loadAttendance],
  );

  const saveManualEntry = useCallback(
    async (payload) => {
      if (!capabilities.canCreate) {
        return;
      }

      try {
        const response = await dispatch(
          createHrAttendanceManualEntry(payload),
        ).unwrap();
        toast.success(getHrSuccessMessage(response, "Manual entry saved"));
        setModal(null);
        await loadAttendance();
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to save manual entry."));
        throw error;
      }
    },
    [capabilities.canCreate, dispatch, loadAttendance],
  );

  const saveAdjustment = useCallback(
    async (payload) => {
      if (!capabilities.canCreate) {
        return;
      }

      try {
        const response = await dispatch(
          requestHrAttendanceAdjustment(payload),
        ).unwrap();
        toast.success(getHrSuccessMessage(response, "Adjustment requested"));
        setModal(null);
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to request adjustment."));
        throw error;
      }
    },
    [capabilities.canCreate, dispatch],
  );

  const saveDecision = useCallback(
    async (payload) => {
      if (!capabilities.canApprove) {
        return;
      }

      try {
        const response =
          decisionMode === "approve"
            ? await dispatch(approveHrAttendanceAdjustment(payload)).unwrap()
            : await dispatch(rejectHrAttendanceAdjustment(payload)).unwrap();
        toast.success(getHrSuccessMessage(response, "Adjustment updated"));
        setModal(null);
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to update adjustment."));
        throw error;
      }
    },
    [capabilities.canApprove, decisionMode, dispatch],
  );

  const loadMonthlyReport = useCallback(async () => {
    try {
      const response = await dispatch(
        fetchHrAttendanceMonthlyReport({
          EmployeeId: reportFilters.employeeId
            ? Number(reportFilters.employeeId)
            : undefined,
          Month: Number(reportFilters.month),
          Year: Number(reportFilters.year),
        }),
      ).unwrap();
      toast.success(getHrSuccessMessage(response, "Monthly report loaded"));
    } catch (error) {
      toast.error(getHrActionError(error, "Unable to load monthly report."));
    }
  }, [dispatch, reportFilters.employeeId, reportFilters.month, reportFilters.year]);

  const loadDepartmentReport = useCallback(async () => {
    try {
      const response = await dispatch(
        fetchHrAttendanceDepartmentReport({
          DepartmentId: reportFilters.departmentId
            ? Number(reportFilters.departmentId)
            : undefined,
          AttendanceDate: reportFilters.attendanceDate || undefined,
        }),
      ).unwrap();
      toast.success(getHrSuccessMessage(response, "Department report loaded"));
    } catch (error) {
      toast.error(getHrActionError(error, "Unable to load department report."));
    }
  }, [dispatch, reportFilters.attendanceDate, reportFilters.departmentId]);

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <CalendarCheck className="h-3.5 w-3.5" />
            HR / Attendance
          </>
        }
        title="Attendance"
        description="Track daily attendance, manual entries, and adjustment workflows."
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={attendanceState.loading}
              onClick={loadAttendance}
            >
              <RefreshCw
                className={`h-4 w-4 ${attendanceState.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            {capabilities.canCreate && (
              <AppButton className="h-10" onClick={() => setModal("manual")}>
                <Plus className="h-4 w-4" />
                Manual Entry
              </AppButton>
            )}
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <HrStatCard icon={UserCheck} label="Present" value={stats.present} colorClass="bg-emerald-50 text-emerald-600" />
        <HrStatCard icon={UserX} label="Absent" value={stats.absent} colorClass="bg-red-50 text-red-600" />
        <HrStatCard icon={Clock} label="Late" value={stats.late} colorClass="bg-amber-50 text-amber-600" />
        <HrStatCard icon={CalendarCheck} label="On Leave" value={stats.leave} colorClass="bg-brand-light text-brand" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[180px_180px_160px_160px_160px_auto]">
          <AppSelect
            value={attendanceState.filters.EmployeeId}
            onChange={(value) => {
              dispatch(setHrAttendanceFilters({ EmployeeId: value }));
              dispatch(setHrAttendancePage(1));
            }}
            options={[{ value: "", label: "All employees" }, ...employeeOptions]}
            aria-label="Filter attendance by employee"
          />
          <AppSelect
            value={attendanceState.filters.DepartmentId}
            onChange={(value) => {
              dispatch(setHrAttendanceFilters({ DepartmentId: value }));
              dispatch(setHrAttendancePage(1));
            }}
            options={[{ value: "all", label: "All departments" }, ...departmentOptions]}
            aria-label="Filter attendance by department"
          />
          <AppInput
            id="fromDate"
            type="date"
            value={attendanceState.filters.FromDate}
            onChange={(event) => {
              dispatch(setHrAttendanceFilters({ FromDate: event.target.value }));
              dispatch(setHrAttendancePage(1));
            }}
          />
          <AppInput
            id="toDate"
            type="date"
            value={attendanceState.filters.ToDate}
            onChange={(event) => {
              dispatch(setHrAttendanceFilters({ ToDate: event.target.value }));
              dispatch(setHrAttendancePage(1));
            }}
          />
          <AppSelect
            value={attendanceState.filters.Status}
            onChange={(value) => {
              dispatch(setHrAttendanceFilters({ Status: value }));
              dispatch(setHrAttendancePage(1));
            }}
            options={[{ value: "all", label: "All status" }, ...HR_ATTENDANCE_STATUS_OPTIONS]}
            aria-label="Filter attendance by status"
          />
          <AppButton
            variant="secondary"
            className="h-10 rounded-lg px-3"
            onClick={() => {
              dispatch(
                setHrAttendanceFilters({
                  DepartmentId: "all",
                  EmployeeId: "",
                  FromDate: "",
                  Status: "all",
                  ToDate: "",
                }),
              );
              dispatch(setHrAttendancePage(1));
            }}
          >
            Clear
          </AppButton>
        </div>
      </div>

      {(capabilities.canCreate || capabilities.canApprove) && (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {capabilities.canCreate && (
            <>
              <AppButton variant="secondary" className="h-10" onClick={() => setModal("checkIn")}>
                <LogIn className="h-4 w-4" />
                Check In
              </AppButton>
              <AppButton variant="secondary" className="h-10" onClick={() => setModal("checkOut")}>
                <LogOut className="h-4 w-4" />
                Check Out
              </AppButton>
              <AppButton variant="secondary" className="h-10" onClick={() => setModal("adjustment")}>
                <FileClock className="h-4 w-4" />
                Adjustment
              </AppButton>
            </>
          )}
          {capabilities.canApprove && (
            <>
              <AppButton
                variant="secondary"
                className="h-10"
                onClick={() => {
                  setDecisionMode("approve");
                  setModal("decision");
                }}
              >
                <ShieldCheck className="h-4 w-4" />
                Approve
              </AppButton>
              <AppButton
                variant="secondary"
                className="h-10"
                onClick={() => {
                  setDecisionMode("reject");
                  setModal("decision");
                }}
              >
                <ShieldX className="h-4 w-4" />
                Reject
              </AppButton>
            </>
          )}
        </div>
      )}

      {!attendanceState.loading && (attendanceState.error || attendanceState.list.length === 0) ? (
        <HrEmptyState
          icon={CalendarCheck}
          error={attendanceState.error}
          title="No attendance records found"
          description="Attendance records will appear here once employees check in or HR adds manual entries."
          onRetry={loadAttendance}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  {["Employee", "Date", "Check In", "Check Out", "Hours", "Status"].map((heading) => (
                    <th key={heading} className="border-b border-slate-200 px-4 py-3.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attendanceState.loading
                  ? Array.from({ length: 6 }, (_, index) => (
                      <tr key={index}>
                        <td colSpan={6} className="px-4 py-3">
                          <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
                        </td>
                      </tr>
                    ))
                  : attendanceState.list.map((row) => (
                      <tr key={getHrRecordId(row, "attendance") ?? `${row.employeeId}-${row.attendanceDate}`} className="hover:bg-slate-50">
                        <td className="border-b border-slate-100 px-4 py-3.5 text-sm font-medium text-slate-900">
                          {row.employeeName ?? getLookupLabel(employeeOptions, row.employeeId)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3.5 text-sm text-slate-500">
                          {formatHrDate(row.attendanceDate ?? row.date)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3.5 text-sm text-slate-500">
                          {formatHrDateTime(row.checkInTime)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3.5 text-sm text-slate-500">
                          {formatHrDateTime(row.checkOutTime)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3.5 text-sm font-medium text-slate-900">
                          {formatHrHours(row.totalHours ?? row.hoursWorked ?? row.hours)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3.5">
                          <AttendanceStatusPill status={row.attendanceStatus ?? row.status} />
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <HrPagination
            disabled={attendanceState.loading}
            itemLabel="records"
            itemCount={attendanceState.list.length}
            onPageChange={(value) => dispatch(setHrAttendancePage(value))}
            onPageSizeChange={(value) => dispatch(setHrAttendancePageSize(value))}
            pageNumber={attendanceState.pageNumber}
            pageSize={attendanceState.pageSize}
            totalCount={attendanceState.totalCount}
            totalPages={attendanceState.totalPages}
          />
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Monthly Report</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <AppSelect
              value={reportFilters.employeeId}
              onChange={(value) => setReportFilters((current) => ({ ...current, employeeId: value }))}
              options={[{ value: "", label: "Select employee" }, ...employeeOptions]}
            />
            <AppInput
              id="reportMonth"
              type="number"
              min="1"
              max="12"
              value={reportFilters.month}
              onChange={(event) => setReportFilters((current) => ({ ...current, month: event.target.value }))}
            />
            <AppInput
              id="reportYear"
              type="number"
              min="2000"
              value={reportFilters.year}
              onChange={(event) => setReportFilters((current) => ({ ...current, year: event.target.value }))}
            />
          </div>
          <AppButton className="mt-4 h-10" onClick={loadMonthlyReport}>
            Load Monthly Report
          </AppButton>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Department Report</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <AppSelect
              value={reportFilters.departmentId}
              onChange={(value) => setReportFilters((current) => ({ ...current, departmentId: value }))}
              options={[{ value: "", label: "Select department" }, ...departmentOptions]}
            />
            <AppInput
              id="departmentAttendanceDate"
              type="date"
              value={reportFilters.attendanceDate}
              onChange={(event) => setReportFilters((current) => ({ ...current, attendanceDate: event.target.value }))}
            />
          </div>
          <AppButton className="mt-4 h-10" onClick={loadDepartmentReport}>
            Load Department Report
          </AppButton>
        </div>
      </div>

      <QuickActionModal
        action={modal === "checkOut" ? "checkOut" : "checkIn"}
        employeeOptions={employeeOptions}
        isOpen={modal === "checkIn" || modal === "checkOut"}
        onClose={() => setModal(null)}
        onSubmit={(payload) => runAction(modal, payload)}
      />
      <ManualEntryModal
        employeeOptions={employeeOptions}
        isOpen={modal === "manual"}
        onClose={() => setModal(null)}
        onSubmit={saveManualEntry}
      />
      <AdjustmentModal
        employeeOptions={employeeOptions}
        isOpen={modal === "adjustment"}
        onClose={() => setModal(null)}
        onSubmit={saveAdjustment}
      />
      <DecisionModal
        mode={decisionMode}
        isOpen={modal === "decision"}
        onClose={() => setModal(null)}
        onSubmit={saveDecision}
      />
    </section>
  );
};

export default AttendancePage;
