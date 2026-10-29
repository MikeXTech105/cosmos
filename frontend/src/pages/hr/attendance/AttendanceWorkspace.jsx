import {
  CalendarCheck,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileClock,
  Filter,
  LogIn,
  LogOut,
  List,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldX,
  UserCheck,
  UserMinus,
  UsersRound,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";

import AppInput from "../../../components/common/AppInput";
import AppSelect from "../../../components/common/AppSelect";
import SubmissionCalendar from "../../../components/common/SubmissionCalendar";
import useSubmissionMonth from "../../../hooks/useSubmissionMonth";
import useUnsavedChanges from "../../../hooks/useUnsavedChanges";
import useScopedDraft from "../../../hooks/useScopedDraft";
import { hrAttendanceService } from "../../../services/hr/attendanceService";
import { hrDepartmentService } from "../../../services/hr/departmentService";
import { hrEmployeeService } from "../../../services/hr/employeeService";
import { hrSetupService } from "../../../services/hr/setupService";
import {
  approveHrAttendanceAdjustment,
  createHrAttendanceManualEntry,
  hrAttendanceCheckIn,
  hrAttendanceCheckOut,
  rejectHrAttendanceAdjustment,
  requestHrAttendanceAdjustment,
} from "../../../store/slices/hr/attendanceSlice";
import { HR_ATTENDANCE_STATUS_OPTIONS } from "../../../utils/hrEnums";
import {
  formatHrDate,
  getEmployeeName,
  getHrActionError,
  getHrRecordId,
  getHrSuccessMessage,
} from "../hrHelpers";
import useHrCapabilities from "../useHrCapabilities";
import { getUserScope } from "../../../utils/userScope";
import { submissionToday, validSubmissionDate } from "../../../utils/submissionCalendar";
import {
  AdjustmentModal,
  DecisionModal,
  ManualEntryModal,
  QuickActionModal,
} from "./AttendanceActionModals";
import AttendanceRoster from "./AttendanceRoster";
import AttendanceBook from "./AttendanceBook";
import EmployeeAttendanceModal from "./EmployeeAttendanceModal";
import DepartmentAttendancePanel from "./DepartmentAttendancePanel";
import { useSearchParams } from "react-router-dom";
import {
  extractAttendanceItems,
  getPagedResponseMeta,
  mergeEmployeesWithAttendance,
  shiftDateKey,
  summarizeAttendance,
} from "./attendanceHelpers";

const today = () => submissionToday();

const fetchEveryPage = async (request, params = {}) => {
  const pageSize = 200;
  const firstResponse = await request({
    ...params,
    PageNumber: 1,
    PageSize: pageSize,
  });
  const firstItems = extractAttendanceItems(firstResponse);
  const { totalPages } = getPagedResponseMeta(firstResponse);
  const safeTotalPages = Math.min(Math.max(1, totalPages), 50);

  if (safeTotalPages === 1) return firstItems;

  const remainingResponses = await Promise.all(
    Array.from({ length: safeTotalPages - 1 }, (_, index) =>
      request({
        ...params,
        PageNumber: index + 2,
        PageSize: pageSize,
      }),
    ),
  );

  return [
    ...firstItems,
    ...remainingResponses.flatMap((response) =>
      extractAttendanceItems(response),
    ),
  ];
};

const getDepartmentOptions = (departments, employees) => {
  const values = new Map();

  departments.forEach((department) => {
    const id = getHrRecordId(department, "department");
    if (id && department.departmentName) {
      values.set(String(id), {
        label: department.departmentName,
        value: id,
      });
    }
  });
  employees.forEach((employee) => {
    if (employee.departmentId && employee.departmentName) {
      values.set(String(employee.departmentId), {
        label: employee.departmentName,
        value: employee.departmentId,
      });
    }
  });

  return [...values.values()].sort((left, right) =>
    left.label.localeCompare(right.label),
  );
};

const DailyStat = ({ accentClass, colorClass, icon: Icon, label, value }) => (
  <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
    <span className={`absolute inset-x-0 top-0 h-0.5 ${accentClass}`} />
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 sm:text-[11px]">
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-950">
          {value}
        </p>
      </div>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${colorClass}`}
      >
        <Icon className="h-4 w-4" />
      </span>
    </div>
  </article>
);

const ToolbarButton = ({ icon: Icon, label, onClick, tone = "default" }) => {
  const toneClass =
    tone === "success"
      ? "text-emerald-700 hover:bg-emerald-50"
      : tone === "danger"
        ? "text-red-600 hover:bg-red-50"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition-colors sm:text-sm ${toneClass}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
};

const AttendanceWorkspace = () => {
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const capabilities = useHrCapabilities({
    actions: ["view", "create", "update", "approve"],
    label: "Attendance",
    pageName: "HR.Attendance",
    resource: ["attendance", "hrAttendance"],
    route: "/hr/attendance",
  });
  const workforceRequestRef = useRef(0);
  const dailyRequestRef = useRef(0);
  const [selectedDate, setSelectedDate] = useState(() => validSubmissionDate(searchParams.get("date")) ? searchParams.get("date") : today());
  const [calendarMonth, setCalendarMonth] = useState(() => selectedDate.slice(0, 7));
  const [calendarRevision, setCalendarRevision] = useState(0);
  const [filters, setFilters] = useState({
    departmentId: searchParams.get("departmentId") || "all",
    search: "",
    status: "all",
  });
  const [workforce, setWorkforce] = useState({
    departments: [],
    employees: [],
    error: null,
    loading: true,
  });
  const [dailyAttendance, setDailyAttendance] = useState({
    error: null,
    loading: true,
    records: [],
  });
  const [modal, setModal] = useState(null);
  const [decisionMode, setDecisionMode] = useState("approve");
  const [initialEmployeeId, setInitialEmployeeId] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [viewMode, setViewMode] = useState("book");
  const [attendanceDrafts, setAttendanceDrafts] = useState({});
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  const [adjustmentInbox, setAdjustmentInbox] = useState({ open: false, loading: false, rows: [], error: "" });
  const hasDrafts = Object.keys(attendanceDrafts).length > 0;
  const { confirmLeave } = useUnsavedChanges({ when: hasDrafts || isBulkSaving, message: "Attendance has unsaved entries. Keep a draft or save before changing the date. Continue without these entries?" });
  const draft = useScopedDraft({ entity: "attendance-book", context: selectedDate, values: attendanceDrafts, enabled: hasDrafts });
  const departmentId = filters.departmentId;
  const loadCalendarPage = useCallback(async ({ fromDate, toDate, pageNumber, pageSize, signal }) => {
    const response = await hrAttendanceService.getAttendance({
      FromDate: fromDate,
      ToDate: toDate,
      DepartmentId: departmentId === "all" ? undefined : departmentId,
      PageNumber: pageNumber,
      PageSize: pageSize,
    }, { signal });
    return response.data;
  }, [departmentId]);
  const submissionMonth = useSubmissionMonth({
    month: calendarMonth,
    loadPage: loadCalendarPage,
    enabled: capabilities.canView,
    revision: calendarRevision,
    scope: `${getUserScope()}:attendance:${departmentId}`,
  });

  const changeSelectedDate = useCallback((nextDate) => {
    const date = typeof nextDate === "function" ? nextDate(selectedDate) : nextDate;
    if (isBulkSaving || !validSubmissionDate(date)) return;
    confirmLeave(() => {
      if (hasDrafts) draft.saveDraft();
      setSelectedDate(date);
      setCalendarMonth(date.slice(0, 7));
      setAttendanceDrafts({});
    });
  }, [confirmLeave, draft, hasDrafts, isBulkSaving, selectedDate]);

  const loadWorkforce = useCallback(async () => {
    const requestId = ++workforceRequestRef.current;
    setWorkforce((current) => ({ ...current, error: null, loading: true }));

    const [employeeResult, departmentResult] = await Promise.allSettled([
      fetchEveryPage((params) => hrEmployeeService.getEmployees(params), {
        IncludeResigned: true,
        SortBy: "employeeCode",
        SortDirection: "ASC",
      }),
      fetchEveryPage((params) => hrDepartmentService.getDepartments(params), {
        IsActive: true,
      }),
    ]);

    if (requestId !== workforceRequestRef.current) return;

    if (employeeResult.status === "rejected") {
      setWorkforce({
        departments: [],
        employees: [],
        error: getHrActionError(
          employeeResult.reason,
          "Unable to load the employee roster.",
        ),
        loading: false,
      });
      return;
    }

    setWorkforce({
      departments:
        departmentResult.status === "fulfilled" ? departmentResult.value : [],
      employees: employeeResult.value,
      error: null,
      loading: false,
    });
  }, []);

  const loadDailyAttendance = useCallback(async () => {
    const requestId = ++dailyRequestRef.current;
    setDailyAttendance((current) => ({
      ...current,
      error: null,
      loading: true,
    }));

    try {
      const records = await fetchEveryPage(
        (params) => hrAttendanceService.getAttendance(params),
        { FromDate: selectedDate, ToDate: selectedDate },
      );

      if (requestId === dailyRequestRef.current) {
        setDailyAttendance({ error: null, loading: false, records });
        setCalendarRevision((value) => value + 1);
      }
    } catch (error) {
      if (requestId === dailyRequestRef.current) {
        setDailyAttendance({
          error: getHrActionError(
            error,
            "Unable to load attendance for the selected day.",
          ),
          loading: false,
          records: [],
        });
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    void Promise.resolve().then(loadWorkforce);
  }, [loadWorkforce]);

  useEffect(() => {
    void Promise.resolve().then(loadDailyAttendance);
  }, [loadDailyAttendance]);

  const departmentOptions = useMemo(
    () => getDepartmentOptions(workforce.departments, workforce.employees),
    [workforce.departments, workforce.employees],
  );
  const employeeOptions = useMemo(
    () =>
      workforce.employees
        .map((employee) => ({
          label: `${getEmployeeName(employee)}${employee.employeeCode ? ` · ${employee.employeeCode}` : ""}`,
          value: getHrRecordId(employee, "employee"),
        }))
        .filter((option) => option.value && option.label),
    [workforce.employees],
  );
  const completeRoster = useMemo(
    () =>
      mergeEmployeesWithAttendance(
        workforce.employees,
        dailyAttendance.records,
        selectedDate,
      ),
    [dailyAttendance.records, selectedDate, workforce.employees],
  );
  const departmentRoster = useMemo(
    () =>
      filters.departmentId === "all"
        ? completeRoster
        : completeRoster.filter(
            ({ employee }) =>
              String(employee.departmentId) === String(filters.departmentId),
          ),
    [completeRoster, filters.departmentId],
  );
  const visibleRoster = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return departmentRoster.filter((item) => {
      const { employee, record } = item;
      const matchesSearch =
        !search ||
        [
          getEmployeeName(employee),
          employee.employeeCode,
          employee.departmentName,
          employee.designationName,
          employee.mobile,
          employee.email,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      const recordStatus = record?.attendanceStatus ?? record?.status;
      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "unmarked"
          ? !record && item.isExpected !== false
          : filters.status === "not-required"
            ? !record && item.isExpected === false
            : record && String(recordStatus) === String(filters.status));

      return matchesSearch && matchesStatus;
    });
  }, [departmentRoster, filters.search, filters.status]);
  const dailySummary = useMemo(
    () =>
      summarizeAttendance(
        departmentRoster.flatMap(({ record }) => (record ? [record] : [])),
      ),
    [departmentRoster],
  );
  const notMarked = departmentRoster.filter(
    ({ isExpected, record }) => !record && isExpected !== false,
  ).length;
  const isDailyUnavailable = Boolean(dailyAttendance.error);
  const statsValue = (value) =>
    dailyAttendance.loading || isDailyUnavailable ? "—" : value;
  const hasFilters =
    filters.departmentId !== "all" ||
    filters.search.trim() ||
    filters.status !== "all";
  const statusOptions = [
    { value: "all", label: "All day statuses" },
    ...HR_ATTENDANCE_STATUS_OPTIONS,
    { value: "unmarked", label: "Not marked" },
    { value: "not-required", label: "Not required" },
  ];

  const loadAdjustmentInbox = useCallback(async () => {
    setAdjustmentInbox((current) => ({ ...current, open: true, loading: true, error: "" }));
    try { const response = await hrSetupService.adjustments(); setAdjustmentInbox({ open: true, loading: false, rows: response.data || [], error: "" }); }
    catch (error) { setAdjustmentInbox((current) => ({ ...current, loading: false, error: getHrActionError(error, "Unable to load pending corrections.") })); }
  }, []);
  const openAction = useCallback((type, employeeId = "") => {
    if (type === "decision") { void loadAdjustmentInbox(); return; }
    if (type === "adjustment") setSelectedAttendance(null);
    setInitialEmployeeId(employeeId || "");
    setModal(type);
  }, [loadAdjustmentInbox]);

  const closeAction = useCallback(() => {
    setModal(null);
    setInitialEmployeeId("");
  }, []);

  const runAction = useCallback(
    async (action, payload) => {
      if (!capabilities.canCreate) return;

      try {
        const response =
          action === "checkIn"
            ? await dispatch(hrAttendanceCheckIn(payload)).unwrap()
            : await dispatch(hrAttendanceCheckOut(payload)).unwrap();
        toast.success(getHrSuccessMessage(response, "Attendance saved"));
        closeAction();
        await loadDailyAttendance();
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to save attendance."));
        throw error;
      }
    },
    [capabilities.canCreate, closeAction, dispatch, loadDailyAttendance],
  );

  const saveManualEntry = useCallback(
    async (payload) => {
      if (!capabilities.canCreate) return;

      try {
        const response = await dispatch(
          createHrAttendanceManualEntry(payload),
        ).unwrap();
        toast.success(getHrSuccessMessage(response, "Manual attendance saved"));
        closeAction();

        if (payload.attendanceDate === selectedDate) {
          await loadDailyAttendance();
        } else {
          changeSelectedDate(payload.attendanceDate);
        }
      } catch (error) {
        toast.error(
          getHrActionError(error, "Unable to save manual attendance."),
        );
        throw error;
      }
    },
    [
      capabilities.canCreate,
      changeSelectedDate,
      closeAction,
      dispatch,
      loadDailyAttendance,
      selectedDate,
    ],
  );

  const saveAdjustment = useCallback(
    async (payload) => {
      if (!capabilities.canUpdate) return;

      try {
        const response = await dispatch(
          requestHrAttendanceAdjustment(payload),
        ).unwrap();
        toast.success(getHrSuccessMessage(response, "Adjustment requested"));
        closeAction();
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to request adjustment."));
        throw error;
      }
    },
    [capabilities.canUpdate, closeAction, dispatch],
  );

  const saveDecision = useCallback(
    async (payload) => {
      if (!capabilities.canApprove) return;

      try {
        const response =
          decisionMode === "approve"
            ? await dispatch(approveHrAttendanceAdjustment(payload)).unwrap()
            : await dispatch(rejectHrAttendanceAdjustment(payload)).unwrap();
        toast.success(getHrSuccessMessage(response, "Adjustment updated"));
        closeAction();
        await loadAdjustmentInbox();
        await loadDailyAttendance();
      } catch (error) {
        toast.error(getHrActionError(error, "Unable to update adjustment."));
        throw error;
      }
    },
    [capabilities.canApprove, closeAction, decisionMode, dispatch, loadAdjustmentInbox, loadDailyAttendance],
  );

  const refreshEverything = useCallback(() => {
    void Promise.allSettled([loadWorkforce(), loadDailyAttendance()]);
  }, [loadDailyAttendance, loadWorkforce]);

  const setAttendanceBookStatus = useCallback(
    (employeeId, currentStatus, nextStatus) => {
      setAttendanceDrafts((current) => {
        const next = { ...current };

        if (Number(currentStatus) === Number(nextStatus)) {
          delete next[String(employeeId)];
        } else {
          next[String(employeeId)] = Number(nextStatus);
        }

        return next;
      });
    },
    [],
  );

  const bulkMarkVisible = useCallback(
    (status) => {
      setAttendanceDrafts((current) => {
        const next = { ...current };

        visibleRoster.forEach(({ employee, isExpected, record }) => {
          if (isExpected === false) return;

          const employeeId = String(getHrRecordId(employee, "employee"));
          const currentStatus = Number(
            record?.attendanceStatus ?? record?.status,
          );

          if (currentStatus === Number(status)) {
            delete next[employeeId];
          } else {
            next[employeeId] = Number(status);
          }
        });

        return next;
      });
    },
    [visibleRoster],
  );

  const saveAttendanceBook = useCallback(async () => {
    const entries = Object.entries(attendanceDrafts);
    if (!capabilities.canCreate || entries.length === 0 || isBulkSaving) return;

    setIsBulkSaving(true);
    const succeeded = [];
    const failed = [];

    try {
      for (let index = 0; index < entries.length; index += 6) {
        const batch = entries.slice(index, index + 6);
        const results = await Promise.allSettled(
          batch.map(([employeeId, attendanceStatus]) =>
            dispatch(
              createHrAttendanceManualEntry({
                attendanceDate: selectedDate,
                attendanceStatus: Number(attendanceStatus),
                employeeId: employeeId,
              }),
            ).unwrap(),
          ),
        );

        results.forEach((result, resultIndex) => {
          const employeeId = batch[resultIndex][0];
          if (result.status === "fulfilled") succeeded.push(employeeId);
          else failed.push(employeeId);
        });
      }

      setAttendanceDrafts((current) => {
        const next = { ...current };
        succeeded.forEach((employeeId) => delete next[employeeId]);
        return next;
      });

      if (succeeded.length > 0) {
        toast.success(
          `${succeeded.length} attendance ${succeeded.length === 1 ? "entry" : "entries"} saved`,
        );
        await loadDailyAttendance();
      }

      if (failed.length > 0) {
        toast.error(
          `${failed.length} ${failed.length === 1 ? "entry" : "entries"} could not be saved. Unsaved rows are still highlighted.`,
        );
      } else {
        draft.clearDraft();
      }
    } finally {
      setIsBulkSaving(false);
    }
  }, [
    attendanceDrafts,
    capabilities.canCreate,
    dispatch,
    isBulkSaving,
    loadDailyAttendance,
    selectedDate,
    draft,
  ]);

  return (
    <section className="min-w-0 space-y-6">
      {adjustmentInbox.open && <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"><div className="flex justify-between gap-3"><h2 className="font-semibold">Pending attendance corrections</h2><button type="button" className="text-sm underline" onClick={() => setAdjustmentInbox((current) => ({ ...current, open: false }))}>Close inbox</button></div>{adjustmentInbox.loading ? <p role="status">Loading corrections…</p> : adjustmentInbox.error ? <p role="alert" className="text-red-700">{adjustmentInbox.error} <button type="button" className="underline" onClick={loadAdjustmentInbox}>Retry</button></p> : !adjustmentInbox.rows.length ? <p className="text-sm text-slate-500">No pending corrections.</p> : adjustmentInbox.rows.map((row) => <div key={String(row.id)} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-semibold">{row.employeeName} · {formatHrDate(row.attendanceDate)}</p><p>Requested correction: {row.reason}</p><div className="mt-2 flex gap-3"><button type="button" className="font-semibold text-emerald-700 underline" onClick={() => { setSelectedAdjustment(row); setDecisionMode("approve"); setModal("decision"); }}>Review approval</button><button type="button" className="font-semibold text-red-700 underline" onClick={() => { setSelectedAdjustment(row); setDecisionMode("reject"); setModal("decision"); }}>Review rejection</button></div></div>)}</section>}
      {draft.recoveredDraft && !hasDrafts && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><span>A saved attendance draft is available for {selectedDate}. Review it before saving.</span><button type="button" className="font-semibold underline" disabled={draft.stale} onClick={() => { if (draft.stale) return; setAttendanceDrafts(draft.recoveredDraft.values || {}); draft.acknowledgeRecovery(); }}>{draft.stale ? "Draft version changed; review with support" : "Restore draft"}</button><button type="button" className="underline" onClick={draft.clearDraft}>Discard draft</button></div>}
      {hasDrafts && <div className="text-sm text-amber-800">{Object.keys(attendanceDrafts).length} unsaved entries. <button type="button" className="font-semibold underline" disabled={!draft.available} onClick={() => draft.saveDraft() && toast.success("Attendance draft kept for this user, company and date")}>Keep draft</button>{draft.storageError || (!draft.available ? " Draft recovery needs the current company identity; save before leaving." : "")}</div>}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/20">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">
              People operations
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Attendance Workspace
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              See every employee, review daily attendance, and open a complete
              month-by-month history.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={refreshEverything}
            disabled={workforce.loading || dailyAttendance.loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${workforce.loading || dailyAttendance.loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          {capabilities.canCreate && (
            <button
              type="button"
              onClick={() => openAction("manual")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:bg-brand-dark active:translate-y-0 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Add Attendance
            </button>
          )}
        </div>
      </div>

      <SubmissionCalendar
        month={calendarMonth}
        onMonthChange={setCalendarMonth}
        entries={submissionMonth.entries}
        getDate={(record) => record.attendanceDate}
        selectedDate={selectedDate}
        onSelectDate={changeSelectedDate}
        loading={submissionMonth.loading}
        error={submissionMonth.error}
        complete={submissionMonth.complete}
        onRetry={submissionMonth.reload}
        disabled={isBulkSaving}
        title="Attendance submission calendar"
        description="See which days have saved attendance, then open a date to review or fill the book."
        recordLabel="attendance records"
        note={`${departmentId === "all" ? "All departments" : "Selected department"} · Days with entries contain at least one saved record. Open a day to check employees still unmarked; holidays and weekly offs are not assumed.`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <DailyStat
          icon={UsersRound}
          label="Total Staff"
          value={workforce.loading ? "—" : departmentRoster.length}
          colorClass="bg-brand-light text-brand"
          accentClass="bg-brand"
        />
        <DailyStat
          icon={UserCheck}
          label="Present / WFH"
          value={statsValue(dailySummary.present + dailySummary.wfh)}
          colorClass="bg-emerald-50 text-emerald-600"
          accentClass="bg-emerald-500"
        />
        <DailyStat
          icon={UserX}
          label="Absent"
          value={statsValue(dailySummary.absent)}
          colorClass="bg-red-50 text-red-600"
          accentClass="bg-red-500"
        />
        <DailyStat
          icon={Clock3}
          label="Half Day"
          value={statsValue(dailySummary.halfDay)}
          colorClass="bg-amber-50 text-amber-600"
          accentClass="bg-amber-500"
        />
        <DailyStat
          icon={UserMinus}
          label="On Leave"
          value={statsValue(dailySummary.leave)}
          colorClass="bg-violet-50 text-violet-600"
          accentClass="bg-violet-500"
        />
        <DailyStat
          icon={CalendarCheck}
          label="Not Marked"
          value={statsValue(notMarked)}
          colorClass="bg-slate-100 text-slate-600"
          accentClass="bg-slate-400"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-950">
                Daily Workforce
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatHrDate(selectedDate)} · Click any employee to view every
                day of the month.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("book")}
                  className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition-colors ${
                    viewMode === "book"
                      ? "bg-white text-brand shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <BookOpenCheck className="h-4 w-4" /> Book
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("details")}
                  className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition-colors ${
                    viewMode === "details"
                      ? "bg-white text-brand shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <List className="h-4 w-4" /> Details
                </button>
              </div>
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() =>
                    changeSelectedDate((current) => shiftDateKey(current, -1))
                  }
                  aria-label="Previous day"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <AppInput
                  id="attendanceWorkspaceDate"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => changeSelectedDate(event.target.value)}
                  className="w-[155px] border-0 bg-transparent shadow-none focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() =>
                    changeSelectedDate((current) => shiftDateKey(current, 1))
                  }
                  aria-label="Next day"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => changeSelectedDate(today())}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Today
              </button>
            </div>
          </div>

          {(capabilities.canCreate || capabilities.canApprove) && (
            <div className="mt-4 flex flex-wrap items-center gap-1 rounded-2xl bg-slate-50 p-1.5 ring-1 ring-inset ring-slate-200/70">
              <span className="px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                Quick actions
              </span>
              {capabilities.canCreate && (
                <>
                  <ToolbarButton
                    icon={LogIn}
                    label="Check In"
                    tone="success"
                    onClick={() => openAction("checkIn")}
                  />
                  <ToolbarButton
                    icon={LogOut}
                    label="Check Out"
                    onClick={() => openAction("checkOut")}
                  />
                </>
              )}
              {capabilities.canUpdate && <ToolbarButton icon={FileClock} label="Request correction" onClick={() => openAction("adjustment")} />}
              {capabilities.canApprove && (
                <>
                  <ToolbarButton
                    icon={ShieldCheck}
                    label="Approve"
                    tone="success"
                    onClick={() => {
                      setDecisionMode("approve");
                      openAction("decision");
                    }}
                  />
                  <ToolbarButton
                    icon={ShieldX}
                    label="Reject"
                    tone="danger"
                    onClick={() => {
                      setDecisionMode("reject");
                      openAction("decision");
                    }}
                  />
                </>
              )}
            </div>
          )}
        </div>

        <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-5">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              <Filter className="h-3.5 w-3.5" />
              Find employees
            </div>
            <p className="text-xs text-slate-500">
              <span className="font-bold tabular-nums text-slate-800">
                {visibleRoster.length}
              </span>{" "}
              of {departmentRoster.length} employees
            </p>
          </div>
          <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_220px_220px_auto]">
            <label className="relative block">
              <span className="sr-only">Search employees</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Search employees"
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                placeholder="Search by name, code, department..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <AppSelect
              value={filters.departmentId}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  departmentId: value,
                }))
              }
              options={[
                { value: "all", label: "All departments" },
                ...departmentOptions,
              ]}
              aria-label="Filter employees by department"
            />
            <AppSelect
              value={filters.status}
              onChange={(value) =>
                setFilters((current) => ({ ...current, status: value }))
              }
              options={statusOptions}
              disabled={isDailyUnavailable}
              aria-label="Filter employees by attendance status"
            />
            <button
              type="button"
              disabled={!hasFilters}
              onClick={() =>
                setFilters({
                  departmentId: "all",
                  search: "",
                  status: "all",
                })
              }
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Clear
            </button>
          </div>
        </div>

        {dailyAttendance.error && (
          <div className="flex flex-col gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span>
              {dailyAttendance.error} Employee roster is still available.
            </span>
            <button
              type="button"
              onClick={loadDailyAttendance}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-bold shadow-sm ring-1 ring-inset ring-amber-200"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry attendance
            </button>
          </div>
        )}

        {viewMode === "book" ? (
          <AttendanceBook
            attendanceUnavailable={isDailyUnavailable}
            canEdit={capabilities.canCreate}
            drafts={attendanceDrafts}
            error={workforce.error}
            isLoading={
              (workforce.loading && workforce.employees.length === 0) ||
              dailyAttendance.loading
            }
            isSaving={isBulkSaving}
            items={visibleRoster}
            onBulkMark={bulkMarkVisible}
            onDiscard={() => setAttendanceDrafts({})}
            onRetry={loadWorkforce}
            onSave={saveAttendanceBook}
            onSelect={(employee) => {
              if (capabilities.canView) setSelectedEmployee(employee);
            }}
            onSetStatus={setAttendanceBookStatus}
          />
        ) : (
          <AttendanceRoster
            attendanceUnavailable={isDailyUnavailable}
            error={workforce.error}
            isLoading={
              (workforce.loading && workforce.employees.length === 0) ||
              dailyAttendance.loading
            }
            items={visibleRoster}
            onRetry={loadWorkforce}
            onSelect={(employee) => {
              if (capabilities.canView) setSelectedEmployee(employee);
            }}
          />
        )}

        {!workforce.error && !workforce.loading && visibleRoster.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span>
              Showing all{" "}
              <strong className="text-slate-800">{visibleRoster.length}</strong>{" "}
              matching employees—no attendance record is hidden.
            </span>
            <span className="font-semibold text-brand">
              {viewMode === "book"
                ? "Use P / A to mark attendance, then save changes →"
                : "Select an employee for monthly history →"}
            </span>
          </div>
        )}
      </div>

      <QuickActionModal
        action={modal === "checkOut" ? "checkOut" : "checkIn"}
        employeeOptions={employeeOptions}
        initialEmployeeId={initialEmployeeId}
        isOpen={modal === "checkIn" || modal === "checkOut"}
        onClose={closeAction}
        onSubmit={(payload) => runAction(modal, payload)}
      />
      <DepartmentAttendancePanel date={selectedDate} departmentId={filters.departmentId} onDrilldown={(departmentId) => { setFilters((current) => ({ ...current, departmentId })); return true; }} />
      <ManualEntryModal
        employeeOptions={employeeOptions}
        initialEmployeeId={initialEmployeeId}
        isOpen={modal === "manual"}
        onClose={closeAction}
        onSubmit={saveManualEntry}
      />
      <AdjustmentModal
        attendanceRecord={selectedAttendance}
        employeeOptions={employeeOptions}
        isOpen={modal === "adjustment"}
        onClose={closeAction}
        onSubmit={saveAdjustment}
      />
      <DecisionModal
        adjustment={selectedAdjustment}
        mode={decisionMode}
        isOpen={modal === "decision"}
        onClose={closeAction}
        onSubmit={saveDecision}
      />
      <EmployeeAttendanceModal
        canRequestCorrection={capabilities.canUpdate}
        onRequestCorrection={(record) => { setSelectedAttendance({ ...record, employeeId: getHrRecordId(selectedEmployee, "employee") }); setSelectedEmployee(null); setModal("adjustment"); }}
        key={getHrRecordId(selectedEmployee, "employee") || "closed"}
        canCreate={capabilities.canCreate}
        employee={selectedEmployee}
        isOpen={Boolean(selectedEmployee)}
        onClose={() => setSelectedEmployee(null)}
        onManualEntry={(employee) => {
          const employeeId = getHrRecordId(employee, "employee");
          setSelectedEmployee(null);
          openAction("manual", employeeId);
        }}
      />
    </section>
  );
};

export default AttendanceWorkspace;
