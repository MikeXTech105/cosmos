import {
  BarChart3,
  CalendarCheck,
  CalendarOff,
  RefreshCw,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import AppButton from "../../../components/common/AppButton";
import PageHeader from "../../../components/common/PageHeader";
import { hrAttendanceService } from "../../../services/hr/attendanceService";
import { hrDepartmentService } from "../../../services/hr/departmentService";
import { hrEmployeeService } from "../../../services/hr/employeeService";
import { hrLeaveService } from "../../../services/hr/leaveService";
import {
  HR_ATTENDANCE_STATUS,
  HR_LEAVE_STATUS,
} from "../../../utils/hrEnums";
import {
  formatHrDate,
  getEmployeeName,
  getHrActionError,
  getHrRecordId,
} from "../hrHelpers";
import { HrStatCard } from "../HrShared";
import useHrCapabilities from "../useHrCapabilities";

const today = () => new Date().toISOString().slice(0, 10);

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const extractItems = (response) => {
  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

const getBarHeightClass = (value, max) => {
  const ratio = max ? value / max : 0;

  if (ratio >= 0.85) {
    return "h-full";
  }

  if (ratio >= 0.65) {
    return "h-4/5";
  }

  if (ratio >= 0.45) {
    return "h-3/5";
  }

  if (ratio >= 0.25) {
    return "h-2/5";
  }

  return value > 0 ? "h-1/5" : "h-2";
};

const MiniBarChart = ({ items }) => {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="flex h-48 items-end gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="flex h-36 w-full items-end rounded-t-lg bg-slate-100">
            <div
              className={`w-full rounded-t-lg bg-brand ${getBarHeightClass(item.value, max)}`}
            />
          </div>
          <span className="truncate text-[11px] font-medium text-slate-500">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

const HrDashboardPage = () => {
  const leaveAccess = useHrCapabilities({ actions: ["view", "approve"], pageName: "HR.Leave", route: "/hr/leaves", resource: "leaves" });
  const attendanceAccess = useHrCapabilities({ actions: ["view"], pageName: "HR.Attendance", route: "/hr/attendance", resource: "attendance" });
  const departmentAccess = useHrCapabilities({ actions: ["view"], pageName: "HR.Department", route: "/hr/departments", resource: "departments" });
  const [state, setState] = useState({
    attendance: [],
    departments: [],
    employees: [],
    error: "",
    leaves: [],
    loading: false,
    pendingLeaves: [],
    available: {},
    complete: {},
    employeeTotal: null,
  });

  const loadDashboard = useCallback(async () => {
    setState((current) => ({ ...current, error: "", loading: true }));

    try {
      const current = today();
      const weekStart = addDays(new Date(), -6).toISOString().slice(0, 10);
      const sources = [
        { key: "employees", allowed: true, request: () => hrEmployeeService.getEmployees({ PageNumber: 1, PageSize: 200 }) },
        { key: "departments", allowed: departmentAccess.canView, request: () => hrDepartmentService.getDepartments({ PageNumber: 1, PageSize: 200 }) },
        { key: "attendance", allowed: attendanceAccess.canView, request: () => hrAttendanceService.getAttendance({ FromDate: weekStart, ToDate: current, PageNumber: 1, PageSize: 200 }) },
        { key: "leaves", allowed: leaveAccess.canView, request: () => hrLeaveService.getLeaves({ FromDate: current, ToDate: current, PageNumber: 1, PageSize: 200 }) },
        { key: "pendingLeaves", allowed: leaveAccess.canApprove, request: () => hrLeaveService.getPendingApprovals({ PageNumber: 1, PageSize: 10 }) },
      ];
      const results = await Promise.allSettled(sources.map((source) => source.allowed ? source.request() : Promise.resolve(null)));
      const next = { available: {}, complete: {}, employeeTotal: null, loading: false, error: "" };
      results.forEach((result, index) => {
        const source = sources[index];
        const response = result.status === "fulfilled" ? result.value : null;
        next[source.key] = response ? extractItems(response) : [];
        next.available[source.key] = Boolean(response);
        const total = Number(response?.data?.totalCount ?? response?.meta?.totalCount ?? next[source.key].length);
        next.complete[source.key] = total <= next[source.key].length;
        if (source.key === "employees" && response) next.employeeTotal = total;
        if (result.status === "rejected") next.error += `${source.key}: ${getHrActionError(result.reason, "Source unavailable")} `;
      });
      setState(next);
    } catch (error) {
      setState((current) => ({
        ...current,
        error: getHrActionError(error, "Unable to load HR dashboard."),
        loading: false,
      }));
    }
  }, [attendanceAccess.canView, departmentAccess.canView, leaveAccess.canApprove, leaveAccess.canView]);

  useEffect(() => {
    void Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  const metrics = useMemo(() => {
    const current = today();
    const presentToday = state.attendance.filter((row) => {
      const rowDate = (row.attendanceDate ?? row.date ?? "").slice(0, 10);
      return (
        rowDate === current &&
        Number(row.attendanceStatus ?? row.status) ===
          HR_ATTENDANCE_STATUS.PRESENT
      );
    }).length;
    const onLeaveToday = state.leaves.filter((leave) => {
      const start = leave.startDate?.slice(0, 10);
      const end = leave.endDate?.slice(0, 10);

      return (
        Number(leave.status) === HR_LEAVE_STATUS.APPROVED &&
        start <= current &&
        end >= current
      );
    }).length;

    return {
      onLeaveToday: state.available.leaves && state.complete.leaves ? onLeaveToday : "—",
      payrollMtd: "Unavailable",
      presentToday: state.available.attendance && state.complete.attendance ? presentToday : "—",
      totalEmployees: state.employeeTotal ?? "—",
    };
  }, [state.attendance, state.available, state.complete, state.employeeTotal, state.leaves]);

  const trend = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(new Date(), index - 6).toISOString().slice(0, 10);
      const value = state.attendance.filter((row) => {
        return (
          (row.attendanceDate ?? row.date ?? "").slice(0, 10) === date &&
          Number(row.attendanceStatus ?? row.status) ===
            HR_ATTENDANCE_STATUS.PRESENT
        );
      }).length;

      return {
        label: new Date(date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
        value,
      };
    });
  }, [state.attendance]);

  const departmentHeadcount = useMemo(() => {
    return state.departments.map((department) => {
      const departmentId = getHrRecordId(department, "department");
      const count = state.employees.filter((employee) => {
        return String(employee.departmentId) === String(departmentId);
      }).length;

      return {
        count,
        id: departmentId,
        name: department.departmentName,
      };
    });
  }, [state.departments, state.employees]);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error]);

  return (
    <section className="min-w-0 space-y-5">
      <PageHeader
        badge={
          <>
            <UsersRound className="h-3.5 w-3.5" />
            HR / Dashboard
          </>
        }
        title="HR Dashboard"
        description="A real-time overview of employees, attendance, leave approvals, and payroll readiness."
        actions={
          <AppButton
            variant="secondary"
            className="h-10"
            disabled={state.loading}
            onClick={loadDashboard}
          >
            <RefreshCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />
            Refresh
          </AppButton>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <HrStatCard
          icon={UsersRound}
          label="Total Employees"
          value={metrics.totalEmployees}
        />
        <HrStatCard
          icon={CalendarCheck}
          label="Present Today"
          value={metrics.presentToday}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <HrStatCard
          icon={CalendarOff}
          label="On Leave"
          value={metrics.onLeaveToday}
          colorClass="bg-amber-50 text-amber-600"
        />
        <HrStatCard
          icon={Wallet}
          label="Payroll MTD"
          value={metrics.payrollMtd}
          colorClass="bg-brand-light text-brand"
        />
      </div>

      {state.error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Attendance Trend
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Present count for the last seven days.
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-slate-400" />
          </div>
          <div className="mt-5">
            {state.available.attendance && state.complete.attendance ? <MiniBarChart items={trend} /> : <p className="text-sm text-slate-500">Full attendance totals are unavailable for this view. Open attendance for the selected period.</p>}
            {attendanceAccess.canView && <Link className="mt-3 inline-block text-sm font-semibold text-brand underline" to={`/hr/attendance?date=${today()}`}>Open daily attendance and department report</Link>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Pending Approvals
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Leave requests awaiting manager action.
          </p>
          <div className="mt-4 space-y-3">
            {!state.available.pendingLeaves ? <p className="text-sm text-slate-500">Pending approvals are unavailable for your current access or could not be loaded.</p> : state.pendingLeaves.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                No pending approvals loaded.
              </p>
            ) : (
              state.pendingLeaves.map((leave) => (
                <div
                  key={getHrRecordId(leave, "leaveApplication") ?? leave.leaveApplicationId}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {leave.employeeName ?? getEmployeeName(leave.employee)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatHrDate(leave.startDate)} - {formatHrDate(leave.endDate)}
                  </p>
                  {leaveAccess.canView && <Link className="mt-2 inline-block text-sm font-semibold text-brand underline" to={`/hr/leaves?employeeId=${encodeURIComponent(leave.employeeId)}&status=1`}>Review this employee's leave requests</Link>}
                </div>
              ))
            )}
          </div>
          {leaveAccess.canView && <Link className="mt-3 inline-block text-sm font-semibold text-brand underline" to="/hr/leaves?status=1">Open all pending leave requests</Link>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Department Headcount
        </h2>
        {!state.complete.employees && <p className="mt-2 text-xs text-amber-700">Department figures below cover the loaded employee preview. Use the employee list for the full matching staff.</p>}
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {departmentHeadcount.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
              No department headcount loaded.
            </p>
          ) : (
            departmentHeadcount.map((department) => (
              <div
                key={department.id ?? department.name}
                className="rounded-xl border border-slate-200 px-4 py-3"
              >
                <p className="truncate text-sm font-semibold text-slate-900">
                  {department.name}
                </p>
                <p className="mt-1 text-2xl font-bold text-brand">
                  {department.count}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default HrDashboardPage;
