import {
  Check,
  CheckCheck,
  RotateCcw,
  Save,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";

import { HR_ATTENDANCE_STATUS } from "../../../utils/hrEnums";
import { getEmployeeName, getHrRecordId } from "../hrHelpers";
import AttendanceStatusBadge from "./AttendanceStatusBadge";

const QuickStatusButton = ({ active, disabled, label, onClick, tone }) => {
  const activeClass =
    tone === "present"
      ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-200"
      : "border-red-500 bg-red-500 text-white shadow-sm shadow-red-200";
  const idleClass =
    tone === "present"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400"
      : "border-red-200 bg-red-50 text-red-700 hover:border-red-400";

  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 min-w-10 items-center justify-center rounded-lg border px-3 text-xs font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? activeClass : idleClass
      }`}
    >
      {active && <Check className="mr-1 h-3.5 w-3.5" />}
      {label}
    </button>
  );
};

const AttendanceBook = ({
  attendanceUnavailable = false,
  canEdit = false,
  drafts,
  error,
  isLoading,
  isSaving,
  items,
  onBulkMark,
  onDiscard,
  onRetry,
  onSave,
  onSelect,
  onSetStatus,
}) => {
  const changedCount = Object.keys(drafts).length;

  if (!isLoading && error) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-semibold text-slate-600">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CheckCheck className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-bold text-slate-900">Quick attendance book</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Mark everyone present, then change only the absent employees.
          </p>
        </div>

        {canEdit && !attendanceUnavailable && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isLoading || isSaving || items.length === 0}
              onClick={() => onBulkMark(HR_ATTENDANCE_STATUS.PRESENT)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-45"
            >
              <UserRoundCheck className="h-4 w-4" /> All visible P
            </button>
            <button
              type="button"
              disabled={isLoading || isSaving || items.length === 0}
              onClick={() => onBulkMark(HR_ATTENDANCE_STATUS.ABSENT)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-45"
            >
              <UserRoundX className="h-4 w-4" /> All visible A
            </button>
            <button
              type="button"
              disabled={isSaving || changedCount === 0}
              onClick={onDiscard}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-45"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            <button
              type="button"
              disabled={isSaving || changedCount === 0}
              onClick={onSave}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-xs font-bold text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving…" : `Save ${changedCount || ""} changes`}
            </button>
          </div>
        )}
      </div>

      <div className="max-h-[680px] overflow-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
            <tr>
              <th className="w-16 border-b border-slate-200 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">#</th>
              <th className="border-b border-slate-200 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Employee</th>
              <th className="border-b border-slate-200 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Department</th>
              <th className="border-b border-slate-200 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Current</th>
              <th className="w-52 border-b border-slate-200 px-5 py-3 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Mark P / A</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }, (_, index) => (
                <tr key={index}>
                  <td colSpan={5} className="px-5 py-3">
                    <div className="h-11 animate-pulse rounded-lg bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-sm text-slate-500">
                  No employees match these filters.
                </td>
              </tr>
            ) : (
              items.map(({ employee, isExpected, record }, index) => {
                const employeeId = String(getHrRecordId(employee, "employee"));
                const currentStatus = Number(record?.attendanceStatus ?? record?.status);
                const effectiveStatus = Number(drafts[employeeId] ?? currentStatus);
                const changed = Object.prototype.hasOwnProperty.call(drafts, employeeId);
                const disabled = !canEdit || attendanceUnavailable || isSaving || isExpected === false;

                return (
                  <tr key={employeeId} className={changed ? "bg-brand-light/25" : "hover:bg-slate-50/70"}>
                    <td className="border-b border-slate-100 px-5 py-3 text-xs font-semibold tabular-nums text-slate-400">{index + 1}</td>
                    <td className="border-b border-slate-100 px-5 py-3">
                      <button type="button" onClick={() => onSelect(employee)} className="text-left">
                        <span className="block text-sm font-bold text-slate-900">{getEmployeeName(employee)}</span>
                        <span className="mt-0.5 block font-mono text-[11px] font-semibold text-slate-400">{employee.employeeCode || "No code"}</span>
                      </button>
                    </td>
                    <td className="border-b border-slate-100 px-5 py-3">
                      <span className="block text-sm font-semibold text-slate-700">{employee.departmentName || "No department"}</span>
                      <span className="mt-0.5 block text-xs text-slate-400">{employee.designationName || "No designation"}</span>
                    </td>
                    <td className="border-b border-slate-100 px-5 py-3">
                      <div className="flex items-center gap-2">
                        <AttendanceStatusBadge
                          isUnavailable={attendanceUnavailable}
                          isNotRequired={!record && isExpected === false}
                          status={effectiveStatus || undefined}
                        />
                        {changed && <span className="text-[10px] font-bold uppercase tracking-wide text-brand">Unsaved</span>}
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <QuickStatusButton
                          active={effectiveStatus === HR_ATTENDANCE_STATUS.PRESENT}
                          disabled={disabled}
                          label="P"
                          tone="present"
                          onClick={() => onSetStatus(employeeId, currentStatus, HR_ATTENDANCE_STATUS.PRESENT)}
                        />
                        <QuickStatusButton
                          active={effectiveStatus === HR_ATTENDANCE_STATUS.ABSENT}
                          disabled={disabled}
                          label="A"
                          tone="absent"
                          onClick={() => onSetStatus(employeeId, currentStatus, HR_ATTENDANCE_STATUS.ABSENT)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceBook;
