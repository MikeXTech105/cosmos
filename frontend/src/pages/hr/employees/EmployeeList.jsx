import { Plus, UserRound } from "lucide-react";

import AppButton from "../../../components/common/AppButton";
import {
  HR_EMPLOYEE_STATUS,
  HR_EMPLOYEE_STATUS_OPTIONS,
  getHrOptionLabel,
} from "../../../utils/hrEnums";
import {
  getEmployeeInitials,
  getEmployeeName,
  getHrRecordId,
  getLookupLabel,
} from "../hrHelpers";
import { HrEmptyState, HrPagination } from "../HrShared";

export const EmployeeStatusPill = ({ status }) => {
  const numericStatus = Number(status);
  const colorClass =
    numericStatus === HR_EMPLOYEE_STATUS.ACTIVE
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : numericStatus === HR_EMPLOYEE_STATUS.ON_LEAVE
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${colorClass}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {getHrOptionLabel(HR_EMPLOYEE_STATUS_OPTIONS, status, "Unknown")}
    </span>
  );
};

const EmployeeList = ({
  actions,
  departmentOptions,
  designationOptions,
  employees,
  error,
  isLoading,
  onCreate,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onSelect,
  pageNumber,
  pageSize,
  selectedId,
  totalCount,
  totalPages,
}) => {
  if (!isLoading && (error || employees.length === 0)) {
    return (
      <HrEmptyState
        icon={UserRound}
        error={error}
        title="No employees found"
        description="Create the first employee profile or adjust the current filters."
        onRetry={onRetry}
        action={
          actions.canCreate && (
            <AppButton className="mt-5 h-10" onClick={onCreate}>
              <Plus className="h-4 w-4" />
              Add Employee
            </AppButton>
          )
        }
      />
    );
  }

  return (
    <div className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Employee List</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Select a profile to view HR details.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading
          ? Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="mb-2 h-20 animate-pulse rounded-xl bg-slate-100"
              />
            ))
          : employees.map((employee) => {
              const id = getHrRecordId(employee, "employee");
              const isSelected = String(id) === String(selectedId);

              return (
                <button
                  key={id ?? employee.employeeCode}
                  type="button"
                  onClick={() => onSelect(employee)}
                  className={[
                    "mb-2 flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                    isSelected
                      ? "border-brand/30 bg-brand-light"
                      : "border-transparent hover:bg-slate-50",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                      isSelected
                        ? "bg-brand text-white"
                        : "bg-slate-100 text-slate-600",
                    ].join(" ")}
                  >
                    {getEmployeeInitials(employee)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {getEmployeeName(employee)}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-xs font-medium text-slate-400">
                          {employee.employeeCode ?? "-"}
                        </p>
                      </div>
                      <EmployeeStatusPill status={employee.status} />
                    </div>
                    <p className="mt-2 truncate text-xs text-slate-500">
                      {getLookupLabel(
                        designationOptions,
                        employee.designationId,
                        employee.designationName ?? "-",
                      )}
                      {" - "}
                      {getLookupLabel(
                        departmentOptions,
                        employee.departmentId,
                        employee.departmentName ?? "-",
                      )}
                    </p>
                  </div>
                </button>
              );
            })}
      </div>

      <HrPagination
        disabled={isLoading}
        itemLabel="employees"
        itemCount={employees.length}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
      />
    </div>
  );
};

export default EmployeeList;
