import {
  ArrowRight,
  Building2,
  CalendarSearch,
  Clock3,
  RefreshCw,
  UsersRound,
} from "lucide-react";

import { getHrRecordId } from "../hrHelpers";
import { EmployeeAvatar, EmployeeStatusPill } from "../employees/EmployeeList";
import AttendanceStatusBadge from "./AttendanceStatusBadge";
import { formatAttendanceMinutes } from "./attendanceHelpers";

const formatAttendanceTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value).slice(0, 5) || "—";

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const EmployeeIdentity = ({ employee }) => (
  <div className="flex min-w-0 items-center gap-3">
    <EmployeeAvatar employee={employee} />
    <div className="min-w-0">
      <p className="truncate text-sm font-bold text-slate-950">
        {[employee.firstName, employee.lastName].filter(Boolean).join(" ") ||
          employee.employeeName ||
          "Unnamed employee"}
      </p>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        <span className="truncate font-mono text-[11px] font-semibold text-slate-400">
          {employee.employeeCode || "No code"}
        </span>
        <span className="text-slate-300">•</span>
        <span className="truncate text-xs text-slate-500">
          {employee.designationName || "No designation"}
        </span>
      </div>
    </div>
  </div>
);

const RosterEmptyState = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-light text-brand ring-8 ring-brand-light/50">
      {error ? (
        <CalendarSearch className="h-6 w-6" />
      ) : (
        <UsersRound className="h-6 w-6" />
      )}
    </div>
    <h3 className="mt-5 text-base font-bold text-slate-950">
      {error ? "Unable to load employees" : "No employees match these filters"}
    </h3>
    <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
      {error || "Try another search, department, or attendance status."}
    </p>
    {error && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    )}
  </div>
);

const MobileRosterCard = ({ attendanceUnavailable, item, onSelect }) => {
  const { employee, record } = item;

  return (
    <button
      type="button"
      onClick={() => onSelect(employee)}
      className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
      aria-label={`View attendance for ${employee.firstName || employee.employeeName || "employee"}`}
    >
      <span className="block p-4">
        <span className="flex items-start justify-between gap-3">
          <EmployeeIdentity employee={employee} />
          <EmployeeStatusPill
            status={employee.status}
            statusName={employee.statusName}
          />
        </span>

        <span className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Day status
            </span>
            <span className="mt-1.5 block">
              <AttendanceStatusBadge
                isUnavailable={attendanceUnavailable}
                isNotRequired={!record && item.isExpected === false}
                status={record?.attendanceStatus ?? record?.status}
              />
            </span>
          </span>
          <span className="text-right">
            <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Working time
            </span>
            <span className="mt-1 block text-sm font-bold tabular-nums text-slate-900">
              {formatAttendanceMinutes(record?.workingMinutes)}
            </span>
          </span>
        </span>

        <span className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <span className="rounded-xl border border-slate-100 px-3 py-2.5">
            <span className="flex items-center gap-1.5 font-semibold text-slate-400">
              <Clock3 className="h-3.5 w-3.5" /> Check in
            </span>
            <span className="mt-1 block font-bold text-slate-800">
              {formatAttendanceTime(record?.checkInTime)}
            </span>
          </span>
          <span className="rounded-xl border border-slate-100 px-3 py-2.5">
            <span className="flex items-center gap-1.5 font-semibold text-slate-400">
              <Clock3 className="h-3.5 w-3.5" /> Check out
            </span>
            <span className="mt-1 block font-bold text-slate-800">
              {formatAttendanceTime(record?.checkOutTime)}
            </span>
          </span>
        </span>
      </span>

      <span className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs font-bold text-brand">
        View monthly attendance
        <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
};

const AttendanceRoster = ({
  attendanceUnavailable = false,
  error,
  isLoading,
  items,
  onRetry,
  onSelect,
}) => {
  if (!isLoading && (error || items.length === 0)) {
    return <RosterEmptyState error={error} onRetry={onRetry} />;
  }

  return (
    <div>
      <div className="grid gap-3 bg-slate-50/50 p-4 lg:hidden">
        {isLoading
          ? Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-2xl bg-slate-100"
              />
            ))
          : items.map((item) => (
              <MobileRosterCard
                key={getHrRecordId(item.employee, "employee")}
                attendanceUnavailable={attendanceUnavailable}
                item={item}
                onSelect={onSelect}
              />
            ))}
      </div>

      <div className="hidden max-h-[680px] overflow-auto lg:block">
        <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
            <tr>
              {[
                "Employee",
                "Department",
                "Attendance",
                "Check In",
                "Check Out",
                "Working Time",
                "Employee Status",
                "",
              ].map((heading, index) => (
                <th
                  key={`${heading}-${index}`}
                  className="border-b border-slate-200 px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 8 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={8} className="px-5 py-3.5">
                      <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                    </td>
                  </tr>
                ))
              : items.map(({ employee, isExpected, record }) => {
                  const employeeId = getHrRecordId(employee, "employee");

                  return (
                    <tr
                      key={employeeId}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelect(employee)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelect(employee);
                        }
                      }}
                      className="group cursor-pointer outline-none transition-colors hover:bg-brand-light/25 focus-visible:bg-brand-light/40"
                    >
                      <td className="border-b border-slate-100 px-5 py-4">
                        <EmployeeIdentity employee={employee} />
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="truncate">
                            {employee.departmentName || "No department"}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4">
                        <AttendanceStatusBadge
                          isUnavailable={attendanceUnavailable}
                          isNotRequired={!record && isExpected === false}
                          status={record?.attendanceStatus ?? record?.status}
                        />
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4 text-sm font-semibold tabular-nums text-slate-700">
                        {formatAttendanceTime(record?.checkInTime)}
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4 text-sm font-semibold tabular-nums text-slate-700">
                        {formatAttendanceTime(record?.checkOutTime)}
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4 text-sm font-bold tabular-nums text-slate-900">
                        {formatAttendanceMinutes(record?.workingMinutes)}
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4">
                        <EmployeeStatusPill
                          status={employee.status}
                          statusName={employee.statusName}
                        />
                      </td>
                      <td className="border-b border-slate-100 px-5 py-4 text-right">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-all group-hover:bg-white group-hover:text-brand group-hover:shadow-sm">
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceRoster;
