import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  RefreshCw,
  TimerReset,
  UserCheck,
  UserMinus,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AppModal from "../../../components/common/AppModal";
import { hrAttendanceService } from "../../../services/hr/attendanceService";
import { EmployeeAvatar, EmployeeStatusPill } from "../employees/EmployeeList";
import {
  formatHrDate,
  getEmployeeName,
  getHrActionError,
  getHrRecordId,
} from "../hrHelpers";
import AttendanceStatusBadge from "./AttendanceStatusBadge";
import {
  buildMonthDays,
  extractAttendanceItems,
  formatAttendanceMinutes,
  getAttendanceDateKey,
  getAttendanceStatusMeta,
  getMonthBounds,
  isEmployeeExpectedOnDate,
  shiftMonth,
  summarizeAttendance,
} from "./attendanceHelpers";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value).slice(0, 5) || "—";

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const DetailStat = ({ colorClass, icon: Icon, label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="flex items-center gap-2.5">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colorClass}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
          {label}
        </span>
        <span className="mt-0.5 block text-lg font-bold tabular-nums text-slate-950">
          {value}
        </span>
      </span>
    </div>
  </div>
);

const EmployeeAttendanceModal = ({
  canCreate,
  employee,
  isOpen,
  onClose,
  onManualEntry,
}) => {
  const now = new Date();
  const employeeId = getHrRecordId(employee, "employee");
  const historyRequestRef = useRef(0);
  const [viewMonth, setViewMonth] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [state, setState] = useState({
    error: null,
    loading: false,
    records: [],
    report: null,
  });

  const loadHistory = useCallback(async () => {
    if (!isOpen || !employeeId) return;

    const requestId = ++historyRequestRef.current;
    const { fromDate, toDate } = getMonthBounds(
      viewMonth.year,
      viewMonth.month,
    );
    setState((current) => ({ ...current, error: null, loading: true }));

    const [historyResult, reportResult] = await Promise.allSettled([
      hrAttendanceService.getAttendanceByEmployee(employeeId, {
        fromDate,
        toDate,
      }),
      hrAttendanceService.getMonthlyReport({
        EmployeeId: Number(employeeId),
        Month: viewMonth.month,
        Year: viewMonth.year,
      }),
    ]);

    if (requestId !== historyRequestRef.current) return;

    if (historyResult.status === "rejected") {
      setState({
        error: getHrActionError(
          historyResult.reason,
          "Unable to load this employee's attendance history.",
        ),
        loading: false,
        records: [],
        report: null,
      });
      return;
    }

    setState({
      error: null,
      loading: false,
      records: extractAttendanceItems(historyResult.value),
      report:
        reportResult.status === "fulfilled"
          ? (extractAttendanceItems(reportResult.value)[0] ?? null)
          : null,
    });
  }, [employeeId, isOpen, viewMonth.month, viewMonth.year]);

  useEffect(() => {
    void Promise.resolve().then(loadHistory);
  }, [loadHistory]);

  const monthDays = useMemo(
    () => buildMonthDays(viewMonth.year, viewMonth.month),
    [viewMonth.month, viewMonth.year],
  );
  const recordByDate = useMemo(
    () =>
      new Map(
        state.records.map((record) => [
          getAttendanceDateKey(record.attendanceDate ?? record.date),
          record,
        ]),
      ),
    [state.records],
  );
  const summary = useMemo(
    () => summarizeAttendance(state.records),
    [state.records],
  );
  const recordedDays = state.records.length;
  const notMarkedDays = monthDays.filter(
    (day) =>
      !day.isFuture &&
      !day.isWeekend &&
      isEmployeeExpectedOnDate(employee, day.key) &&
      !recordByDate.has(day.key),
  ).length;
  const workingMinutes =
    Number(state.report?.workingMinutes) ||
    state.records.reduce(
      (total, record) => total + (Number(record.workingMinutes) || 0),
      0,
    );
  const monthLabel = new Date(
    viewMonth.year,
    viewMonth.month - 1,
    1,
  ).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const firstDayOffset = new Date(
    viewMonth.year,
    viewMonth.month - 1,
    1,
  ).getDay();
  const historyDays = [...monthDays]
    .filter(
      (day) =>
        !day.isFuture &&
        (recordByDate.has(day.key) ||
          isEmployeeExpectedOnDate(employee, day.key)),
    )
    .reverse();

  return (
    <AppModal hideHeader isOpen={isOpen} maxWidth="max-w-6xl" onClose={onClose}>
      <div className="-m-6 overflow-hidden rounded-2xl">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-brand-light/50 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <EmployeeAvatar employee={employee} size="lg" isSelected />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-bold tracking-tight text-slate-950">
                    {getEmployeeName(employee)}
                  </h2>
                  <EmployeeStatusPill
                    status={employee?.status}
                    statusName={employee?.statusName}
                  />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {employee?.employeeCode || "No employee code"} ·{" "}
                  {employee?.designationName || "No designation"} ·{" "}
                  {employee?.departmentName || "No department"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canCreate && (
                <button
                  type="button"
                  onClick={() => onManualEntry(employee)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-dark active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  Add attendance
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-[calc(100dvh-11rem)] overflow-y-auto bg-slate-50/60 p-4 sm:p-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand">
                Monthly attendance
              </p>
              <p className="mt-1 text-lg font-bold text-slate-950">
                {monthLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setViewMonth((current) => shiftMonth(current, -1))
                }
                aria-label="Previous month"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const current = new Date();
                  setViewMonth({
                    month: current.getMonth() + 1,
                    year: current.getFullYear(),
                  });
                }}
                className="inline-flex h-10 min-w-32 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Current month
              </button>
              <button
                type="button"
                onClick={() =>
                  setViewMonth((current) => shiftMonth(current, 1))
                }
                aria-label="Next month"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {state.loading ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-xl bg-slate-200/70"
                  />
                ))}
              </div>
              <div className="h-96 animate-pulse rounded-2xl bg-slate-200/70" />
            </div>
          ) : state.error ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-white px-6 py-16 text-center">
              <TimerReset className="h-8 w-8 text-red-500" />
              <h3 className="mt-4 text-base font-bold text-slate-950">
                Attendance history unavailable
              </h3>
              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                {state.error}
              </p>
              <button
                type="button"
                onClick={loadHistory}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm"
              >
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
                <DetailStat
                  icon={CalendarDays}
                  label="Recorded"
                  value={recordedDays}
                  colorClass="bg-brand-light text-brand"
                />
                <DetailStat
                  icon={UserCheck}
                  label="Present"
                  value={summary.present + summary.wfh}
                  colorClass="bg-emerald-50 text-emerald-600"
                />
                <DetailStat
                  icon={UserX}
                  label="Absent"
                  value={summary.absent}
                  colorClass="bg-red-50 text-red-600"
                />
                <DetailStat
                  icon={Clock3}
                  label="Half Day"
                  value={summary.halfDay}
                  colorClass="bg-amber-50 text-amber-600"
                />
                <DetailStat
                  icon={UserMinus}
                  label="On Leave"
                  value={summary.leave}
                  colorClass="bg-violet-50 text-violet-600"
                />
                <DetailStat
                  icon={TimerReset}
                  label="Not Marked"
                  value={notMarkedDays}
                  colorClass="bg-slate-100 text-slate-600"
                />
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.8fr)]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-950">
                        Month calendar
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Every recorded day is colour coded for quick review.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      {formatAttendanceMinutes(workingMinutes)} worked
                    </span>
                  </div>
                  <div className="p-3 sm:p-4">
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                      {WEEK_DAYS.map((day) => (
                        <div
                          key={day}
                          className="py-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs"
                        >
                          {day}
                        </div>
                      ))}
                      {Array.from({ length: firstDayOffset }, (_, index) => (
                        <div key={`blank-${index}`} />
                      ))}
                      {monthDays.map((day) => {
                        const record = recordByDate.get(day.key);
                        const isExpected = isEmployeeExpectedOnDate(
                          employee,
                          day.key,
                        );
                        const meta = record
                          ? getAttendanceStatusMeta(
                              record.attendanceStatus ?? record.status,
                            )
                          : null;

                        return (
                          <div
                            key={day.key}
                            title={
                              record
                                ? meta.label
                                : !isExpected
                                  ? "Not employed"
                                  : day.isWeekend
                                    ? "Weekend"
                                    : "Not marked"
                            }
                            className={[
                              "min-h-16 rounded-xl border p-1.5 sm:min-h-20 sm:p-2",
                              record
                                ? meta.calendarClass
                                : day.isFuture
                                  ? "border-slate-100 bg-slate-50/60 text-slate-300"
                                  : !isExpected
                                    ? "border-slate-100 bg-slate-50 text-slate-300"
                                    : day.isWeekend
                                      ? "border-slate-200 bg-slate-50 text-slate-400"
                                      : "border-dashed border-slate-200 bg-white text-slate-500",
                            ].join(" ")}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-xs font-bold tabular-nums sm:text-sm">
                                {day.dayNumber}
                              </span>
                              {record && (
                                <span className="text-[9px] font-black sm:text-[10px]">
                                  {meta.shortLabel}
                                </span>
                              )}
                            </div>
                            <p className="mt-2 hidden truncate text-[10px] font-bold sm:block">
                              {record
                                ? meta.label
                                : day.isFuture
                                  ? ""
                                  : !isExpected
                                    ? "Not employed"
                                    : day.isWeekend
                                      ? "Weekend"
                                      : "Not marked"}
                            </p>
                            {record?.checkInTime && (
                              <p className="mt-0.5 hidden truncate text-[9px] opacity-75 sm:block">
                                {formatTime(record.checkInTime)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-4 py-3.5">
                    <h3 className="text-sm font-bold text-slate-950">
                      Day-by-day history
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Present, absent, leave and unmarked days in one list.
                    </p>
                  </div>
                  <div className="max-h-[475px] divide-y divide-slate-100 overflow-y-auto">
                    {historyDays.map((day) => {
                      const record = recordByDate.get(day.key);

                      return (
                        <div
                          key={day.key}
                          className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800">
                              {formatHrDate(day.key)}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-400">
                              {record
                                ? `${formatTime(record.checkInTime)} – ${formatTime(record.checkOutTime)}`
                                : day.isWeekend
                                  ? "Scheduled weekend"
                                  : "No attendance record"}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            {record ? (
                              <AttendanceStatusBadge
                                status={
                                  record.attendanceStatus ?? record.status
                                }
                              />
                            ) : day.isWeekend ? (
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-inset ring-slate-200">
                                Weekend
                              </span>
                            ) : (
                              <AttendanceStatusBadge />
                            )}
                            {record && (
                              <p className="mt-1 text-[10px] font-semibold text-slate-400">
                                {formatAttendanceMinutes(record.workingMinutes)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppModal>
  );
};

export default EmployeeAttendanceModal;
