import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarOff,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCw,
  UserRound,
  XCircle,
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
import { hrEmployeeService } from "../../../services/hr/employeeService";
import {
  applyHrLeave,
  approveHrLeave,
  cancelHrLeave,
  fetchHrLeaveBalance,
  fetchHrLeaves,
  fetchHrPendingLeaveApprovals,
  rejectHrLeave,
  setHrLeaveFilters,
  setHrLeavePage,
  setHrLeavePageSize,
} from "../../../store/slices/hr/leaveSlice";
import {
  HR_LEAVE_STATUS,
  HR_LEAVE_STATUS_OPTIONS,
  HR_LEAVE_TYPE_OPTIONS,
  getHrOptionLabel,
} from "../../../utils/hrEnums";
import {
  hrLeaveActionSchema,
  hrLeaveApplySchema,
} from "../../../utils/validationSchemas";
import {
  buildHrQueryParams,
  formatHrDate,
  getEmployeeName,
  getHrActionError,
  getHrRecordId,
  getHrSuccessMessage,
  getLookupLabel,
} from "../hrHelpers";
import {
  HrEmptyState,
  HrPagination,
  HrStatCard,
} from "../HrShared";
import useHrCapabilities from "../useHrCapabilities";

const today = () => new Date().toISOString().slice(0, 10);

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

const LeaveStatusPill = ({ status }) => {
  const value = Number(status);
  const color =
    value === HR_LEAVE_STATUS.APPROVED
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : value === HR_LEAVE_STATUS.REJECTED
        ? "bg-red-50 text-red-700 ring-red-200"
        : value === HR_LEAVE_STATUS.CANCELLED
          ? "bg-slate-100 text-slate-600 ring-slate-200"
          : "bg-amber-50 text-amber-700 ring-amber-200";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${color}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {getHrOptionLabel(HR_LEAVE_STATUS_OPTIONS, status, "Unknown")}
    </span>
  );
};

const ApplyLeaveModal = ({ employeeOptions, isOpen, onClose, onSubmit }) => {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm({
    resolver: zodResolver(hrLeaveApplySchema),
    defaultValues: {
      employeeId: "",
      endDate: today(),
      leaveTypeId: HR_LEAVE_TYPE_OPTIONS[0].value,
      reason: "",
      startDate: today(),
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        employeeId: "",
        endDate: today(),
        leaveTypeId: HR_LEAVE_TYPE_OPTIONS[0].value,
        reason: "",
        startDate: today(),
      });
    }
  }, [isOpen, reset]);

  const submitForm = async (values) => {
    await onSubmit({
      employeeId: Number(values.employeeId),
      endDate: values.endDate,
      leaveTypeId: Number(values.leaveTypeId),
      reason: values.reason?.trim() ?? "",
      startDate: values.startDate,
    });
  };

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-2xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <h2 className="text-lg font-semibold text-slate-900">Apply Leave</h2>
      <p className="mt-1 text-sm text-slate-500">
        Create a leave request for an employee.
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
        <Controller
          name="leaveTypeId"
          control={control}
          render={({ field }) => (
            <AppSelect
              label="Leave Type"
              value={field.value}
              onChange={field.onChange}
              options={HR_LEAVE_TYPE_OPTIONS}
              error={errors.leaveTypeId?.message}
            />
          )}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <AppInput
            id="leaveStartDate"
            label="Start Date"
            type="date"
            required
            error={errors.startDate?.message}
            {...register("startDate")}
          />
          <AppInput
            id="leaveEndDate"
            label="End Date"
            type="date"
            required
            error={errors.endDate?.message}
            {...register("endDate")}
          />
        </div>
        <AppInput
          id="leaveReason"
          label="Reason"
          error={errors.reason?.message}
          {...register("reason")}
        />

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…">
            Submit Leave
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

const LeaveActionModal = ({ action, isOpen, onClose, onSubmit, selectedLeave }) => {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm({
    resolver: zodResolver(hrLeaveActionSchema),
    defaultValues: {
      employeeId: "",
      leaveApplicationId: "",
      remarks: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        employeeId: selectedLeave?.employeeId ?? "",
        leaveApplicationId:
          getHrRecordId(selectedLeave, "leaveApplication") ??
          selectedLeave?.leaveApplicationId ??
          "",
        remarks: "",
      });
    }
  }, [isOpen, reset, selectedLeave]);

  const submitForm = async (values) => {
    await onSubmit({
      employeeId: values.employeeId ? Number(values.employeeId) : null,
      leaveApplicationId: Number(values.leaveApplicationId),
      remarks: values.remarks?.trim() ?? "",
    });
  };

  const labels = {
    approve: "Approve Leave",
    cancel: "Cancel Leave",
    reject: "Reject Leave",
  };

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-lg"
      onClose={isSubmitting ? undefined : onClose}
    >
      <h2 className="text-lg font-semibold text-slate-900">{labels[action]}</h2>
      <p className="mt-1 text-sm text-slate-500">
        Confirm this leave workflow action.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(submitForm)}>
        <AppInput
          id="leaveApplicationId"
          label="Leave Application ID"
          required
          error={errors.leaveApplicationId?.message}
          {...register("leaveApplicationId")}
        />
        <AppInput
          id="leaveEmployeeId"
          label="Employee ID"
          error={errors.employeeId?.message}
          {...register("employeeId")}
        />
        <AppInput
          id="leaveRemarks"
          label="Remarks"
          error={errors.remarks?.message}
          {...register("remarks")}
        />

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" isLoading={isSubmitting} loadingText="Saving…">
            {labels[action]}
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

const LeavesPage = () => {
  const dispatch = useDispatch();
  const leaveState = useSelector((state) => state.hrLeaves);
  const capabilities = useHrCapabilities({
    actions: ["view", "create", "update", "approve"],
    label: "Leaves",
    resource: ["leaves", "hrLeaves"],
    route: "/hr/leaves",
  });
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [modal, setModal] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [balanceEmployeeId, setBalanceEmployeeId] = useState("");
  const [pendingManagerId, setPendingManagerId] = useState("");

  const queryParams = useMemo(
    () =>
      buildHrQueryParams({
        filters: leaveState.filters,
        pageNumber: leaveState.pageNumber,
        pageSize: leaveState.pageSize,
        extra: {
          EmployeeId: leaveState.filters.EmployeeId
            ? Number(leaveState.filters.EmployeeId)
            : undefined,
          FromDate: leaveState.filters.FromDate || undefined,
          LeaveTypeId:
            leaveState.filters.LeaveTypeId === "all"
              ? undefined
              : Number(leaveState.filters.LeaveTypeId),
          Status:
            leaveState.filters.Status === "all"
              ? undefined
              : Number(leaveState.filters.Status),
          ToDate: leaveState.filters.ToDate || undefined,
        },
      }),
    [leaveState.filters, leaveState.pageNumber, leaveState.pageSize],
  );

  const loadLeaves = useCallback(() => {
    return dispatch(fetchHrLeaves(queryParams));
  }, [dispatch, queryParams]);

  const loadEmployees = useCallback(async () => {
    try {
      const response = await hrEmployeeService.getEmployeeDropdown();
      setEmployeeOptions(extractList(response).map(toEmployeeOption).filter(Boolean));
    } catch (error) {
      toast.error(getHrActionError(error, "Unable to load employee options."));
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadLeaves);
  }, [loadLeaves]);

  useEffect(() => {
    void Promise.resolve().then(loadEmployees);
  }, [loadEmployees]);

  const stats = useMemo(
    () => ({
      approved: leaveState.list.filter(
        (leave) => Number(leave.status) === HR_LEAVE_STATUS.APPROVED,
      ).length,
      onLeaveToday: leaveState.list.filter((leave) => {
        const start = leave.startDate?.slice(0, 10);
        const end = leave.endDate?.slice(0, 10);
        const current = today();

        return (
          Number(leave.status) === HR_LEAVE_STATUS.APPROVED &&
          start <= current &&
          end >= current
        );
      }).length,
      pending: leaveState.list.filter(
        (leave) => Number(leave.status) === HR_LEAVE_STATUS.PENDING,
      ).length,
      rejected: leaveState.list.filter(
        (leave) => Number(leave.status) === HR_LEAVE_STATUS.REJECTED,
      ).length,
    }),
    [leaveState.list],
  );

  const submitLeave = useCallback(
    async (payload) => {
      if (!capabilities.canCreate) {
        return;
      }

      try {
        const response = await dispatch(applyHrLeave(payload)).unwrap();
        toast.success(getHrSuccessMessage(response, "Leave request submitted"));
        setModal(null);
        await loadLeaves();
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to submit leave."));
        throw error;
      }
    },
    [capabilities.canCreate, dispatch, loadLeaves],
  );

  const submitAction = useCallback(
    async (payload) => {
      const isAllowed =
        modal === "cancel" ? capabilities.canUpdate : capabilities.canApprove;

      if (!isAllowed) {
        return;
      }

      try {
        const actionMap = {
          approve: approveHrLeave,
          cancel: cancelHrLeave,
          reject: rejectHrLeave,
        };
        const response = await dispatch(actionMap[modal](payload)).unwrap();
        toast.success(getHrSuccessMessage(response, "Leave updated"));
        setModal(null);
        setSelectedLeave(null);
        await loadLeaves();
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to update leave."));
        throw error;
      }
    },
    [
      capabilities.canApprove,
      capabilities.canUpdate,
      dispatch,
      loadLeaves,
      modal,
    ],
  );

  const openAction = (action, leave) => {
    const isAllowed =
      action === "cancel" ? capabilities.canUpdate : capabilities.canApprove;

    if (!isAllowed) {
      return;
    }

    setSelectedLeave(leave);
    setModal(action);
  };

  const loadBalance = useCallback(async () => {
    if (!balanceEmployeeId) {
      toast.error("Select an employee to load leave balance.");
      return;
    }

    try {
      const response = await dispatch(
        fetchHrLeaveBalance(Number(balanceEmployeeId)),
      ).unwrap();
      toast.success(getHrSuccessMessage(response, "Leave balance loaded"));
    } catch (error) {
      toast.error(getHrActionError(error, "Unable to load leave balance."));
    }
  }, [balanceEmployeeId, dispatch]);

  const loadPending = useCallback(async () => {
    try {
      const response = await dispatch(
        fetchHrPendingLeaveApprovals({
          PageNumber: 1,
          PageSize: 50,
          ReportingManagerId: pendingManagerId
            ? Number(pendingManagerId)
            : undefined,
        }),
      ).unwrap();
      toast.success(getHrSuccessMessage(response, "Pending approvals loaded"));
    } catch (error) {
      toast.error(getHrActionError(error, "Unable to load pending approvals."));
    }
  }, [dispatch, pendingManagerId]);

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <CalendarOff className="h-3.5 w-3.5" />
            HR / Leaves
          </>
        }
        title="Leaves"
        description="Apply, approve, reject, and monitor leave balances."
        actions={
          <>
            <AppButton
              variant="secondary"
              className="h-10"
              disabled={leaveState.loading}
              onClick={loadLeaves}
            >
              <RefreshCw
                className={`h-4 w-4 ${leaveState.loading ? "animate-spin" : ""}`}
              />
              Refresh
            </AppButton>
            {capabilities.canCreate && (
              <AppButton className="h-10" onClick={() => setModal("apply")}>
                <Plus className="h-4 w-4" />
                Apply Leave
              </AppButton>
            )}
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <HrStatCard icon={Clock3} label="Pending" value={stats.pending} scope="current-page" colorClass="bg-amber-50 text-amber-600" />
        <HrStatCard icon={CheckCircle2} label="Approved" value={stats.approved} scope="current-page" colorClass="bg-emerald-50 text-emerald-600" />
        <HrStatCard icon={XCircle} label="Rejected" value={stats.rejected} scope="current-page" colorClass="bg-red-50 text-red-600" />
        <HrStatCard icon={UserRound} label="On Leave Today" value={stats.onLeaveToday} scope="current-page" colorClass="bg-brand-light text-brand" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[180px_180px_160px_160px_160px_auto]">
          <AppSelect
            value={leaveState.filters.EmployeeId}
            onChange={(value) => {
              dispatch(setHrLeaveFilters({ EmployeeId: value }));
              dispatch(setHrLeavePage(1));
            }}
            options={[{ value: "", label: "All employees" }, ...employeeOptions]}
          />
          <AppSelect
            value={leaveState.filters.LeaveTypeId}
            onChange={(value) => {
              dispatch(setHrLeaveFilters({ LeaveTypeId: value }));
              dispatch(setHrLeavePage(1));
            }}
            options={[{ value: "all", label: "All leave types" }, ...HR_LEAVE_TYPE_OPTIONS]}
          />
          <AppInput
            id="leaveFromDate"
            type="date"
            value={leaveState.filters.FromDate}
            onChange={(event) => {
              dispatch(setHrLeaveFilters({ FromDate: event.target.value }));
              dispatch(setHrLeavePage(1));
            }}
          />
          <AppInput
            id="leaveToDate"
            type="date"
            value={leaveState.filters.ToDate}
            onChange={(event) => {
              dispatch(setHrLeaveFilters({ ToDate: event.target.value }));
              dispatch(setHrLeavePage(1));
            }}
          />
          <AppSelect
            value={leaveState.filters.Status}
            onChange={(value) => {
              dispatch(setHrLeaveFilters({ Status: value }));
              dispatch(setHrLeavePage(1));
            }}
            options={[{ value: "all", label: "All status" }, ...HR_LEAVE_STATUS_OPTIONS]}
          />
          <AppButton
            variant="secondary"
            className="h-10 rounded-lg px-3"
            onClick={() => {
              dispatch(
                setHrLeaveFilters({
                  EmployeeId: "",
                  FromDate: "",
                  LeaveTypeId: "all",
                  Status: "all",
                  ToDate: "",
                }),
              );
              dispatch(setHrLeavePage(1));
            }}
          >
            Clear
          </AppButton>
        </div>
      </div>

      {!leaveState.loading && (leaveState.error || leaveState.list.length === 0) ? (
        <HrEmptyState
          icon={CalendarOff}
          error={leaveState.error}
          title="No leave requests found"
          description="Leave requests will appear here once employees apply."
          onRetry={loadLeaves}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  {["#", "Employee", "Type", "Dates", "Days", "Status", "Actions"].map((heading) => (
                    <th
                      key={heading}
                      className={[
                        "border-b border-slate-200 px-4 py-3.5 text-xs font-medium uppercase tracking-wide text-slate-500",
                        heading === "Actions" ? "text-right" : "",
                      ].join(" ")}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaveState.loading
                  ? Array.from({ length: 6 }, (_, index) => (
                      <tr key={index}>
                        <td colSpan={7} className="px-4 py-3">
                          <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
                        </td>
                      </tr>
                    ))
                  : leaveState.list.map((leave, index) => (
                      <tr key={getHrRecordId(leave, "leaveApplication") ?? leave.leaveApplicationId} className="hover:bg-slate-50">
                        <td className="border-b border-slate-100 px-4 py-3.5 text-xs font-semibold tabular-nums text-slate-400">
                          {(leaveState.pageNumber - 1) * leaveState.pageSize + index + 1}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3.5 text-sm font-medium text-slate-900">
                          {leave.employeeName ?? getLookupLabel(employeeOptions, leave.employeeId)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3.5 text-sm text-slate-500">
                          {leave.leaveTypeName ?? getHrOptionLabel(HR_LEAVE_TYPE_OPTIONS, leave.leaveTypeId)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3.5 text-sm text-slate-500">
                          {formatHrDate(leave.startDate)} - {formatHrDate(leave.endDate)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3.5 text-sm font-medium text-slate-900">
                          {leave.totalDays ?? leave.days ?? "-"}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3.5">
                          <LeaveStatusPill status={leave.status} />
                        </td>
                        <td className="border-b border-slate-100 px-4 py-3.5">
                          <div className="flex items-center justify-end gap-0.5">
                            {capabilities.canApprove && (
                              <>
                                <AppButton variant="secondary" className="h-8 rounded-lg px-2 text-xs" onClick={() => openAction("approve", leave)}>
                                  Approve
                                </AppButton>
                                <AppButton variant="secondary" className="h-8 rounded-lg px-2 text-xs" onClick={() => openAction("reject", leave)}>
                                  Reject
                                </AppButton>
                              </>
                            )}
                            {capabilities.canUpdate && (
                              <AppButton variant="secondary" className="h-8 rounded-lg px-2 text-xs" onClick={() => openAction("cancel", leave)}>
                                Cancel
                              </AppButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <HrPagination
            disabled={leaveState.loading}
            itemLabel="requests"
            itemCount={leaveState.list.length}
            onPageChange={(value) => dispatch(setHrLeavePage(value))}
            onPageSizeChange={(value) => dispatch(setHrLeavePageSize(value))}
            pageNumber={leaveState.pageNumber}
            pageSize={leaveState.pageSize}
            totalCount={leaveState.totalCount}
            totalPages={leaveState.totalPages}
          />
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Leave Balance</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <AppSelect
              value={balanceEmployeeId}
              onChange={setBalanceEmployeeId}
              options={[{ value: "", label: "Select employee" }, ...employeeOptions]}
            />
            <AppButton className="h-10" onClick={loadBalance}>
              Load Balance
            </AppButton>
          </div>
          <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            {leaveState.balance ? JSON.stringify(leaveState.balance, null, 2) : "No balance loaded"}
          </pre>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Pending Approvals</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <AppSelect
              value={pendingManagerId}
              onChange={setPendingManagerId}
              options={[{ value: "", label: "All managers" }, ...employeeOptions]}
            />
            <AppButton className="h-10" onClick={loadPending}>
              Load Pending
            </AppButton>
          </div>
          <div className="mt-4 space-y-2">
            {leaveState.pendingApprovals.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                No pending approvals loaded.
              </p>
            ) : (
              leaveState.pendingApprovals.map((leave) => (
                <div
                  key={getHrRecordId(leave, "leaveApplication") ?? leave.leaveApplicationId}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {leave.employeeName ?? getLookupLabel(employeeOptions, leave.employeeId)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatHrDate(leave.startDate)} - {formatHrDate(leave.endDate)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ApplyLeaveModal
        employeeOptions={employeeOptions}
        isOpen={modal === "apply"}
        onClose={() => setModal(null)}
        onSubmit={submitLeave}
      />
      <LeaveActionModal
        action={modal}
        isOpen={["approve", "cancel", "reject"].includes(modal)}
        onClose={() => {
          setModal(null);
          setSelectedLeave(null);
        }}
        onSubmit={submitAction}
        selectedLeave={selectedLeave}
      />
    </section>
  );
};

export default LeavesPage;
